import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../../..");
const webRequire = createRequire(join(root, "apps/web/package.json"));
const { chromium, expect } = webRequire("@playwright/test");

export { expect };

const devStrictModeSocket = /^WebSocket connection to 'ws:\/\/[^']+\/ws\?v=1' failed: WebSocket is closed before the connection is established\.$/;

function readStack() {
  const text = readFileSync(join(root, ".verify/stack.env"), "utf8");
  return Object.fromEntries(
    text
      .split("\n")
      .filter((line) => line.includes("="))
      .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
  );
}

export async function startJourney(feature, { width = 1440, height = 900 } = {}) {
  const stack = readStack();
  const dir = join(stack.RUN_DIR, feature);
  mkdirSync(dir, { recursive: true });
  const logFile = join(dir, "steps.log");
  writeFileSync(logFile, `${feature} against ${stack.WEB_URL} at ${new Date().toISOString()}\n`);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width, height } });
  const problems = [];
  const ignored = [];
  const allowed = [{ pattern: devStrictModeSocket, reason: "dev-only StrictMode double mount, one per full page load" }];
  const allowConsole = (pattern, reason) => allowed.push({ pattern, reason });
  const frames = [];
  let loads = 0;
  const watch = (page) => {
    page.on("console", (message) => {
      if (message.type() !== "error" && message.type() !== "warning") return;
      const line = `${message.type()}: ${message.text()}`;
      const allowance = allowed.find(({ pattern }) => pattern.test(message.text()));
      if (allowance) ignored.push(`${line}  [allowed: ${allowance.reason}]`);
      else problems.push(line);
    });
    page.on("load", () => (loads += 1));
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    page.on("websocket", (socket) => {
      if (!socket.url().includes(`:${stack.GATEWAY_PORT}/ws`)) return;
      socket.on("framesent", (frame) => frames.push({ dir: "sent", at: Date.now(), data: frame.payload }));
      socket.on("framereceived", (frame) => frames.push({ dir: "recv", at: Date.now(), data: frame.payload }));
    });
    return page;
  };
  const page = watch(await context.newPage());
  let failed = false;
  const log = (line) => {
    appendFileSync(logFile, `${line}\n`);
    console.log(`${feature}: ${line}`);
  };
  const step = async (id, action, run) => {
    log(`[${id}] ${action}`);
    try {
      const observed = await run();
      log(`[${id}] PASS ${observed ?? ""}`.trimEnd());
    } catch (error) {
      failed = true;
      log(`[${id}] FAIL ${String(error.message ?? error).split("\n")[0]}`);
      await page.screenshot({ path: join(dir, `${id}-failure.png`), fullPage: true }).catch(() => {});
    }
  };
  const shot = async (name, target = page) => {
    await target.screenshot({ path: join(dir, `${name}.png`), fullPage: true });
    log(`screenshot ${feature}/${name}.png`);
  };
  const save = (name, data) => {
    writeFileSync(join(dir, name), typeof data === "string" ? data : JSON.stringify(data, null, 2));
    log(`saved ${feature}/${name}`);
  };
  const openConnected = async (path, target = page) => {
    await target.goto(`${stack.WEB_URL}${path}`);
    await expect(target.getByTestId("app-root")).toHaveAttribute("data-connection", "connected", {
      timeout: 15_000,
    });
  };
  const finish = async () => {
    const strictMode = ignored.filter((line) => line.includes("StrictMode")).length;
    if (strictMode > loads) problems.push(`${strictMode} StrictMode socket warnings for ${loads} page loads: a reconnect loop?`);
    const head = problems.length ? problems : ["no unexpected console errors or warnings"];
    save("console.txt", [...head, `allowed ${ignored.length}:`, ...ignored, ""].join("\n"));
    save("frames.json", frames.slice(-400));
    await browser.close();
    if (problems.length) {
      failed = true;
      log(`FAIL console: ${problems.length} error or warning messages, see ${feature}/console.txt`);
    }
    const verdict = failed ? "FAIL" : "PASS";
    log(`${verdict} ${feature}; evidence in ${dir}`);
    process.exitCode = failed ? 1 : 0;
  };
  return { stack, dir, browser, context, page, watch, log, step, shot, save, openConnected, allowConsole, finish, problems, frames };
}
