import { buildApp } from "./app.ts";

const port = Number(process.env["PORT"] ?? 4000);
const app = buildApp();

await app.listen({ port, host: "localhost" });
console.log(`gateway listening on http://localhost:${port}`);
