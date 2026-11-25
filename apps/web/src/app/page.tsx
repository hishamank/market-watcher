import { connection } from "next/server";

const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:4000";

async function readFeedMode(): Promise<string> {
  try {
    const response = await fetch(`${gatewayUrl}/stocks`, { cache: "no-store" });
    const body: { feedMode?: unknown } = await response.json();
    return typeof body.feedMode === "string" ? body.feedMode : "unknown";
  } catch {
    return "unavailable";
  }
}

export default async function HomePage() {
  await connection();
  const feedMode = await readFeedMode();
  return (
    <main data-testid="app-root" data-feed-mode={feedMode} className="p-4">
      <h1 className="text-xl font-semibold">Mini Trading App</h1>
      <p className="mt-2">Feed mode: {feedMode}</p>
    </main>
  );
}
