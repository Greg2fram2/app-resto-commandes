"use client";

import { useEffect, useState, useCallback } from "react";

interface LigneInfo {
  id: string;
  quantite: number;
  statut: string;
  numeroService: number;
  platNomJson: string;
  notes?: string | null;
}

interface CommandeInfo {
  id: string;
  lignes: LigneInfo[];
  createdAt: string;
}

interface SessionInfo {
  id: string;
  commandes: CommandeInfo[];
}

interface TableInfo {
  id: string;
  numero: string;
  statut: string;
  sessions: SessionInfo[];
}

function parseNom(json: string, locale = "fr"): string {
  try {
    const obj = JSON.parse(json) as Record<string, string>;
    return obj[locale] ?? obj["fr"] ?? Object.values(obj)[0] ?? json;
  } catch {
    return json;
  }
}

const STATUT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  en_attente: { label: "En attente", icon: "⏳", color: "text-gray-500" },
  a_lancer: { label: "En cuisine", icon: "🍳", color: "text-orange-500" },
  servi: { label: "Servi", icon: "✅", color: "text-green-500" },
  termine: { label: "Terminé", icon: "🏁", color: "text-gray-400" },
};

export default function StaffPage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [connected, setConnected] = useState(false);
  const [openingTable, setOpeningTable] = useState<string | null>(null);
  const restaurantId = "demo-restaurant";

  const fetchTables = useCallback(async () => {
    const res = await fetch(`/api/tables?restaurantId=${restaurantId}`);
    const data = await res.json() as TableInfo[];
    setTables(data);
  }, [restaurantId]);

  useEffect(() => {
    fetchTables();

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

      evtSource.addEventListener("new-order", () => fetchTables());
      evtSource.addEventListener("lines-updated", () => fetchTables());
      evtSource.addEventListener("line-status-changed", () => fetchTables());
      evtSource.addEventListener("table-opened", () => fetchTables());
      evtSource.addEventListener("table-closed", () => fetchTables());
    }

    connect();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      evtSource?.close();
    };
  }, [fetchTables]);

  async function openTable(tableId: string) {
    setOpeningTable(tableId);
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId, ouvertePar: "Serveur" }),
    });
    await fetchTables();
    setOpeningTable(null);
  }

  async function closeTable(sessionId: string) {
    if (!confirm("Fermer cette table ?")) return;
    await fetch(`/api/sessions?sessionId=${sessionId}`, { method: "DELETE" });
    await fetchTables();
  }

  async function envoyerSuite(sessionId: string) {
    await fetch(`/api/orders/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "envoyer-suite", sessionId }),
    });
    await fetchTables();
  }

  async function marquerServi(ligneId: string) {
    await fetch(`/api/orders/${ligneId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ligneId, statut: "servi" }),
    });
    await fetchTables();
  }

  const occupiedTables = tables.filter((t) => t.statut === "occupee");
  const freeTables = tables.filter((t) => t.statut === "libre");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-700 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">👤</span>
          <div>
            <p className="text-xs text-indigo-300 uppercase tracking-wide">Vue Salle</p>
            <h1 className="text-lg font-bold">Gestion des tables</h1>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-sm ${connected ? "text-green-300" : "text-red-300"}`}>
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-300" : "bg-red-300"}`} />
          {connected ? "Connecté" : "Déconnecté"}
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto space-y-6">
        {/* Occupied tables */}
        <section>
          <h2 className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-3">
            Tables en cours ({occupiedTables.length})
          </h2>
          <div className="space-y-4">
            {occupiedTables.map((table) => {
              const session = table.sessions[0];
              if (!session) return null;

              const allLignes = session.commandes.flatMap((c) => c.lignes);
              const enAttente = allLignes.filter((l) => l.statut === "en_attente");
              const aLancer = allLignes.filter((l) => l.statut === "a_lancer");
              const servis = allLignes.filter((l) => l.statut === "servi");
              const hasNewOrder = session.commandes.length > 0 &&
                Date.now() - new Date(session.commandes[session.commandes.length - 1].createdAt).getTime() < 60000;

              return (
                <div key={table.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden border ${hasNewOrder ? "border-yellow-400" : "border-gray-100"}`}>
                  <div className="bg-indigo-50 px-4 py-3 flex justify-between items-center">
                    <h3 className="font-bold text-indigo-800 text-lg">TABLE {table.numero}</h3>
                    {hasNewOrder && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 font-bold px-2 py-1 rounded-full">
                        ✨ Nouvelle commande
                      </span>
                    )}
                    <button
                      onClick={() => closeTable(session.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Fermer la table
                    </button>
                  </div>

                  <div className="p-4 space-y-3">
                    {aLancer.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-orange-500 uppercase mb-1.5">
                          🍳 En cuisine
                        </p>
                        <div className="space-y-1">
                          {aLancer.map((l) => (
                            <div key={l.id} className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">
                                {l.quantite}× {parseNom(l.platNomJson)}
                              </span>
                              <button
                                onClick={() => marquerServi(l.id)}
                                className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium hover:bg-green-200"
                              >
                                Marquer servi
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {servis.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-green-500 uppercase mb-1.5">
                          ✅ Servis
                        </p>
                        <div className="space-y-1">
                          {servis.map((l) => (
                            <p key={l.id} className="text-sm text-gray-400 line-through">
                              {l.quantite}× {parseNom(l.platNomJson)}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {enAttente.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">
                          ⏳ En attente
                        </p>
                        <div className="space-y-1 mb-3">
                          {enAttente.map((l) => (
                            <p key={l.id} className="text-sm text-gray-500">
                              {l.quantite}× {parseNom(l.platNomJson)}
                            </p>
                          ))}
                        </div>
                        <button
                          onClick={() => envoyerSuite(session.id)}
                          className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition"
                        >
                          Envoyer la suite en cuisine
                        </button>
                      </div>
                    )}

                    {allLignes.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-2">
                        Table ouverte — en attente de commande
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {occupiedTables.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-6">Aucune table occupée</p>
            )}
          </div>
        </section>

        {/* Free tables */}
        <section>
          <h2 className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-3">
            Tables libres ({freeTables.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {freeTables.map((table) => (
              <button
                key={table.id}
                onClick={() => openTable(table.id)}
                disabled={openingTable === table.id}
                className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-indigo-400 hover:bg-indigo-50 transition disabled:opacity-50"
              >
                <p className="text-lg font-bold text-gray-700">Table {table.numero}</p>
                <p className="text-xs text-indigo-500 mt-1 font-medium">
                  {openingTable === table.id ? "Ouverture..." : "+ Ouvrir"}
                </p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
