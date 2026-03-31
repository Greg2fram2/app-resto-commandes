"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface LigneInfo {
  id: string;
  quantite: number;
  statut: string;
  createdAt: string;
  platNomJson: string;
  notes?: string | null;
}

interface TableOrder {
  tableId: string;
  tableNumero: string;
  lignes: LigneInfo[];
  firstOrderAt: string;
  isNew?: boolean;
}

function parseNom(json: string, locale = "fr"): string {
  try {
    const obj = JSON.parse(json) as Record<string, string>;
    return obj[locale] ?? obj["fr"] ?? Object.values(obj)[0] ?? json;
  } catch {
    return json;
  }
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function minutesSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<TableOrder[]>([]);
  const [connected, setConnected] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [newTableIds, setNewTableIds] = useState<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const restaurantId = "demo-restaurant";

  function playAlert() {
    if (!soundOn) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio not supported
    }
  }

  const fetchOrders = useCallback(async () => {
    const res = await fetch(`/api/orders?status=a_lancer&restaurantId=${restaurantId}`);
    const data = await res.json() as TableOrder[];
    setOrders(data);
  }, [restaurantId]);

  useEffect(() => {
    fetchOrders();

    let evtSource: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 1000;

    function connect() {
      evtSource = new EventSource(`/api/sse?restaurantId=${restaurantId}`);

      evtSource.addEventListener("open", () => {
        setConnected(true);
        retryDelay = 1000;
      });

      evtSource.addEventListener("error", () => {
        setConnected(false);
        evtSource?.close();
        retryTimeout = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30000);
          connect();
        }, retryDelay);
      });

      evtSource.addEventListener("new-order", (e: MessageEvent) => {
        const data = JSON.parse(e.data as string) as { tableId: string };
        playAlert();
        setNewTableIds((prev) => new Set([...prev, data.tableId]));
        fetchOrders();
        setTimeout(() => {
          setNewTableIds((prev) => {
            const next = new Set(prev);
            next.delete(data.tableId);
            return next;
          });
        }, 5000);
      });

      evtSource.addEventListener("lines-updated", () => fetchOrders());
      evtSource.addEventListener("line-status-changed", () => fetchOrders());
    }

    connect();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      evtSource?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOrders]);

  // Prevent screen sleep using wake lock
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Not supported
      }
    }
    requestWakeLock();
    return () => { wakeLock?.release(); };
  }, []);

  // Refresh every 30s as fallback
  useEffect(() => {
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-red-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-400 animate-pulse" />
          <span className="text-lg font-bold tracking-wide uppercase">Cuisine</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className={`flex items-center gap-1.5 ${connected ? "text-green-400" : "text-red-400"}`}>
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
            {connected ? "Connecté" : "Déconnecté"}
          </div>
          <button
            onClick={() => setSoundOn((s) => !s)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              soundOn ? "bg-green-700 text-green-100" : "bg-gray-700 text-gray-400"
            }`}
          >
            🔊 Son: {soundOn ? "ON" : "OFF"}
          </button>
        </div>
      </header>

      {/* Orders grid */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {orders.length === 0 && (
          <div className="col-span-full text-center py-20 text-gray-500 text-xl">
            Aucune commande en attente
          </div>
        )}

        {orders.map((order) => {
          const isNew = newTableIds.has(order.tableId);
          const minutes = minutesSince(order.firstOrderAt);
          const urgent = minutes >= 15;

          return (
            <div
              key={order.tableId}
              className={`rounded-2xl border-2 p-4 transition-all ${
                isNew
                  ? "border-yellow-400 bg-yellow-900/30 animate-pulse"
                  : urgent
                  ? "border-red-500 bg-gray-800"
                  : "border-gray-700 bg-gray-800"
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2 className="text-xl font-bold">TABLE {order.tableNumero}</h2>
                  <p className={`text-sm ${urgent ? "text-red-400" : "text-gray-400"}`}>
                    ⏰ {formatTime(order.firstOrderAt)}
                    {minutes > 0 && <span className="ml-1">({minutes} min)</span>}
                  </p>
                </div>
                {isNew && (
                  <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                    ✨ NOUVEAU
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {order.lignes.map((ligne) => (
                  <div key={ligne.id} className="flex items-start gap-2">
                    <span className="text-lg font-bold text-amber-400 min-w-[2rem]">
                      {ligne.quantite}×
                    </span>
                    <div>
                      <span className="text-white font-medium">
                        {parseNom(ligne.platNomJson)}
                      </span>
                      {ligne.notes && (
                        <p className="text-xs text-gray-400 italic mt-0.5">📝 {ligne.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
