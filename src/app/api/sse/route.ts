import { NextRequest } from "next/server";
import { sseBus } from "@/lib/sse";

export const dynamic = "force-dynamic";

// GET /api/sse?restaurantId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId") ?? "demo-restaurant";

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      // Send initial keep-alive
      controller.enqueue(encoder.encode(": connected\n\n"));

      const cleanup = sseBus.addClient(restaurantId, controller);

      // Heartbeat every 30s to prevent proxy timeouts
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(heartbeat);
          cleanup();
        }
      }, 30000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        cleanup();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
