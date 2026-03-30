"use client";

import { useEffect, useState } from "react";

interface PlatRaw {
  id: string;
  nomJson: string;
  descriptionJson: string;
  prix: number;
  disponible: boolean;
  typeService: string;
  allergenes: string;
  tags: string;
  photoUrl: string | null;
  ordre: number;
}

interface CategoryRaw {
  id: string;
  nomJson: string;
  ordre: number;
  plats: PlatRaw[];
}

function parseNom(json: string, locale = "fr"): string {
  try {
    const obj = JSON.parse(json) as Record<string, string>;
    return obj[locale] ?? obj["fr"] ?? Object.values(obj)[0] ?? json;
  } catch {
    return json;
  }
}

const TYPE_SERVICE_LABELS: Record<string, string> = {
  entree: "Entrée", plat: "Plat", dessert: "Dessert",
  boisson: "Boisson", autre: "Autre",
};

export default function AdminPage() {
  const [categories, setCategories] = useState<CategoryRaw[]>([]);
  const [activeSection, setActiveSection] = useState<"menu" | "tables" | "qr">("menu");
  const [editingPlat, setEditingPlat] = useState<PlatRaw | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchMenu = async () => {
    const res = await fetch("/api/admin/plats");
    const data = await res.json() as CategoryRaw[];
    setCategories(data);
  };

  useEffect(() => { fetchMenu(); }, []);

  async function toggleDisponible(plat: PlatRaw) {
    await fetch(`/api/admin/plats/${plat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disponible: !plat.disponible }),
    });
    fetchMenu();
  }

  async function savePlat(updates: Partial<PlatRaw>) {
    if (!editingPlat) return;
    setSaving(true);
    const body: Record<string, unknown> = { ...updates };
    if (updates.allergenes !== undefined) {
      try { body.allergenes = JSON.parse(updates.allergenes as string); } catch { body.allergenes = []; }
    }
    if (updates.tags !== undefined) {
      try { body.tags = JSON.parse(updates.tags as string); } catch { body.tags = []; }
    }
    await fetch(`/api/admin/plats/${editingPlat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setEditingPlat(null);
    fetchMenu();
  }

  async function deletePlat(id: string) {
    if (!confirm("Supprimer ce plat ?")) return;
    await fetch(`/api/admin/plats/${id}`, { method: "DELETE" });
    fetchMenu();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-6 py-4">
        <h1 className="text-xl font-bold">⚙️ Back-office — La Belle Époque</h1>
        <p className="text-gray-400 text-sm mt-0.5">Gestion du restaurant</p>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b flex">
        {(["menu", "tables", "qr"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
              activeSection === s
                ? "border-gray-800 text-gray-800"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {s === "menu" ? "Menu" : s === "tables" ? "Tables" : "QR Codes"}
          </button>
        ))}
      </nav>

      <div className="p-6 max-w-5xl mx-auto">
        {activeSection === "menu" && (
          <div className="space-y-8">
            {categories.map((cat) => (
              <div key={cat.id}>
                <h2 className="text-lg font-bold text-gray-800 mb-3">
                  {parseNom(cat.nomJson)} <span className="text-gray-400 font-normal text-sm">({cat.plats.length} plats)</span>
                </h2>
                <div className="bg-white rounded-2xl shadow-sm divide-y">
                  {cat.plats.map((plat) => (
                    <div key={plat.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium truncate ${!plat.disponible ? "line-through text-gray-400" : "text-gray-800"}`}>
                            {parseNom(plat.nomJson)}
                          </p>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {TYPE_SERVICE_LABELS[plat.typeService] ?? plat.typeService}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{plat.prix.toFixed(2)} €</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleDisponible(plat)}
                          className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                            plat.disponible
                              ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                              : "bg-red-100 text-red-600 hover:bg-green-100 hover:text-green-700"
                          }`}
                        >
                          {plat.disponible ? "Disponible" : "Indisponible"}
                        </button>
                        <button
                          onClick={() => setEditingPlat(plat)}
                          className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-200"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => deletePlat(plat.id)}
                          className="text-xs bg-red-50 text-red-500 px-3 py-1.5 rounded-full hover:bg-red-100"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === "tables" && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <p className="text-gray-500">Gestion des tables — à venir</p>
          </div>
        )}

        {activeSection === "qr" && (
          <QRCodeSection />
        )}
      </div>

      {/* Edit modal */}
      {editingPlat && (
        <EditPlatModal
          plat={editingPlat}
          onSave={savePlat}
          onClose={() => setEditingPlat(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

function QRCodeSection() {
  const [tables, setTables] = useState<{ id: string; numero: string; qrToken: string }[]>([]);

  useEffect(() => {
    fetch("/api/tables")
      .then((r) => r.json())
      .then((data: { id: string; numero: string; qrToken: string }[]) => setTables(data));
  }, []);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">QR Codes par table</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((table) => {
          const url = `${baseUrl}/menu/${table.qrToken}`;
          return (
            <div key={table.id} className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-bold text-gray-700 mb-2">Table {table.numero}</h3>
              <p className="text-xs text-gray-400 break-all mb-3">{url}</p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-indigo-600 hover:underline font-medium"
              >
                Ouvrir le menu →
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditPlatModal({
  plat,
  onSave,
  onClose,
  saving,
}: {
  plat: PlatRaw;
  onSave: (updates: Partial<PlatRaw>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [nomFr, setNomFr] = useState(() => {
    try { return (JSON.parse(plat.nomJson) as Record<string, string>).fr ?? ""; } catch { return plat.nomJson; }
  });
  const [nomEn, setNomEn] = useState(() => {
    try { return (JSON.parse(plat.nomJson) as Record<string, string>).en ?? ""; } catch { return ""; }
  });
  const [prix, setPrix] = useState(plat.prix);
  const [typeService, setTypeService] = useState(plat.typeService);

  function handleSave() {
    const nomJson = JSON.stringify({ fr: nomFr, en: nomEn });
    onSave({ nomJson, prix, typeService });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Modifier le plat</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom (FR)</label>
              <input
                value={nomFr}
                onChange={(e) => setNomFr(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom (EN)</label>
              <input
                value={nomEn}
                onChange={(e) => setNomEn(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix (€)</label>
              <input
                type="number"
                step="0.5"
                value={prix}
                onChange={(e) => setPrix(parseFloat(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de service</label>
              <select
                value={typeService}
                onChange={(e) => setTypeService(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {Object.entries(TYPE_SERVICE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gray-800 text-white py-2.5 rounded-xl font-medium hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
