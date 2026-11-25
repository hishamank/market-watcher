import Fastify, { type FastifyInstance } from "fastify";

export function buildApp(): FastifyInstance {
  const app = Fastify();
  app.get("/stocks", async () => ({
    feedMode: "simulated",
    marketStatus: "open",
    stocks: [],
  }));
  return app;
}
