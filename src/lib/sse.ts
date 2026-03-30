// Simple in-process SSE event bus for real-time notifications
// In production, replace with Redis pub/sub or similar

type SSEClient = {
  restaurantId: string;
  controller: ReadableStreamDefaultController;
};

class SSEBus {
  private clients: Set<SSEClient> = new Set();

  addClient(restaurantId: string, controller: ReadableStreamDefaultController) {
    const client: SSEClient = { restaurantId, controller };
    this.clients.add(client);
    return () => this.clients.delete(client);
  }

  broadcast(restaurantId: string, event: string, data: unknown) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    for (const client of this.clients) {
      if (client.restaurantId === restaurantId) {
        try {
          client.controller.enqueue(encoder.encode(message));
        } catch {
          this.clients.delete(client);
        }
      }
    }
  }
}

const globalForSSE = globalThis as unknown as { sseBus: SSEBus | undefined };
export const sseBus = globalForSSE.sseBus ?? new SSEBus();
if (process.env.NODE_ENV !== "production") globalForSSE.sseBus = sseBus;
