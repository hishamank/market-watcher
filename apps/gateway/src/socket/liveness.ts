import type { WebSocket, WebSocketServer } from "ws";

export function startLiveness(server: WebSocketServer, intervalMs: number): () => void {
  const answered = new WeakSet<WebSocket>();

  server.on("connection", (socket: WebSocket) => {
    answered.add(socket);
    socket.on("pong", () => answered.add(socket));
  });

  const timer = setInterval(() => {
    for (const socket of server.clients) {
      if (!answered.has(socket)) {
        socket.terminate();
        continue;
      }
      answered.delete(socket);
      socket.ping();
    }
  }, intervalMs);

  return () => clearInterval(timer);
}
