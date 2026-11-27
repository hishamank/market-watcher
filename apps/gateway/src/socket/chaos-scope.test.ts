import { afterEach, expect, test, vi } from "vitest";
import { createSimulatorFeed, type SimulatorFeed } from "../feeds/simulator/index.ts";
import { CHAOS_REVERT_MS } from "../hub/limits.ts";
import { ChaosScopeError, parseChaosScope } from "./chaos-scope.ts";
import { type Gateway, startGateway } from "./testing.ts";

const TIMERS = ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] as const;
const UNTOUCHED = {
  tickRateMultiplier: 1,
  historyLatencyMs: 0,
  historyFailureRate: 0,
  forceClosed: false,
};

let gateway: Gateway<SimulatorFeed> | undefined;

async function startSimulator(scope?: "global" | "connection"): Promise<Gateway<SimulatorFeed>> {
  vi.useFakeTimers({ toFake: [...TIMERS] });
  vi.setSystemTime(Date.UTC(2026, 10, 25, 14, 0, 0));
  const clock = () => Date.now();
  const feed = createSimulatorFeed({ seed: "chaos-scope-test", clock, random: () => 0.5 });
  gateway = await startGateway(feed, false, "simulated", clock, scope);
  return gateway;
}

afterEach(async () => {
  vi.useRealTimers();
  await gateway?.close();
  gateway?.feed.close();
  gateway = undefined;
});

test("connection scope refuses every shared control and no other visitor is affected", async () => {
  const sim = await startSimulator("connection");
  const attacker = await sim.connect();
  const visitor = await sim.connect();
  expect(await attacker.next("chaos_state")).toMatchObject({ scope: "connection" });
  expect(await visitor.next("chaos_state")).toMatchObject({ scope: "connection" });

  attacker.send({ type: "chaos", action: "tick_spike", enabled: true });
  attacker.send({ type: "chaos", action: "history_latency", enabled: true });
  attacker.send({ type: "chaos", action: "history_failure_rate", rate: 100 });
  attacker.send({ type: "chaos", action: "force_closed", enabled: true });
  for (let refused = 0; refused < 4; refused += 1) {
    expect(await attacker.next("error")).toMatchObject({ code: "invalid_message" });
  }
  await visitor.settle();

  expect(sim.feed.getSettings()).toEqual(UNTOUCHED);
  expect(visitor.all("market_status")).toEqual([]);
  expect(visitor.all("chaos_state")).toHaveLength(1);
  expect(attacker.all("chaos_state")).toHaveLength(1);
  const detail = await sim.app.inject({ url: "/stocks/AAPL" });
  expect(detail.json()).toMatchObject({ marketStatus: "open" });
  const history = await sim.app.inject({ url: "/stocks/MSFT/history?range=1M" });
  expect(history.statusCode).toBe(200);
});

test("connection scope keeps the controls that touch only the sender", async () => {
  const sim = await startSimulator("connection");
  const sender = await sim.connect();
  const visitor = await sim.connect();
  await sender.next("chaos_state");

  sender.send({ type: "chaos", action: "freeze", enabled: true });
  sender.send({ type: "chaos", action: "drop" });

  await expect(sender.closed).resolves.toBe(1000);
  await visitor.settle();
  expect(visitor.all("error")).toEqual([]);
  expect(sim.feed.getSettings()).toEqual(UNTOUCHED);
});

test("global scope is the default and a repeated control does not extend its revert", async () => {
  const sim = await startSimulator();
  const alice = await sim.connect();
  const bob = await sim.connect();
  expect(await alice.next("chaos_state")).toMatchObject({ scope: "global" });
  await bob.next("chaos_state");

  const startTime = Date.now();
  alice.send({ type: "chaos", action: "force_closed", enabled: true });
  alice.send({ type: "chaos", action: "history_failure_rate", rate: 50 });
  await alice.next("chaos_state");
  await alice.next("chaos_state");

  await vi.advanceTimersByTimeAsync(CHAOS_REVERT_MS - 1_000);
  alice.send({ type: "chaos", action: "force_closed", enabled: true });
  alice.send({ type: "chaos", action: "history_failure_rate", rate: 100 });
  await alice.next("chaos_state");
  expect(await alice.next("chaos_state")).toMatchObject({
    forceClosed: { enabled: true, revertsAt: startTime + CHAOS_REVERT_MS },
    historyFailureRate: { rate: 100, revertsAt: startTime + CHAOS_REVERT_MS },
  });
  expect(sim.feed.getSettings()).toMatchObject({ forceClosed: true, historyFailureRate: 1 });

  await vi.advanceTimersByTimeAsync(1_000);
  await bob.settle();
  expect(sim.feed.getSettings()).toEqual(UNTOUCHED);
  expect(bob.all("market_status").at(-1)).toEqual({ type: "market_status", marketStatus: "open" });
});

test("CHAOS_SCOPE defaults to global, accepts connection and rejects anything else", () => {
  expect(parseChaosScope(undefined)).toBe("global");
  expect(parseChaosScope(" ")).toBe("global");
  expect(parseChaosScope("connection")).toBe("connection");
  expect(() => parseChaosScope("off")).toThrow(ChaosScopeError);
});
