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

interface TableRaw {
  id: string;
  numero: string;
  qrToken: string;
  statut: string;
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

const ALLERGEN_LIST = [
  "gluten", "crustaces", "oeufs", "poisson", "arachides", "soja",
  "lait", "fruits-a-coque", "celeri", "moutarde", "sesame", "sulfites",
  "lupin", "mollusques",
];
const ALLERGEN_LABELS: Record<string, string> = {
  gluten: "Gluten", crustaces: "Crustacés", oeufs: "Œufs", poisson: "Poisson",
  arachides: "Arachides", soja: "Soja", lait: "Lait", "fruits-a-coque": "Fruits à coque",
  celeri: "Céleri", moutarde: "Moutarde", sesame: "Sésame", sulfites: "Sulfites",
  lupin: "Lupin", mollusques: "Mollusques",
};

const TAG_LIST = ["vegan", "vegetarien", "halal", "casher", "sans-gluten", "sans-lactose"];
const TAG_LABELS: Record<string, string> = {
  vegan: "Végan", vegetarien: "Végétarien", halal: "Halal",
  casher: "Casher", "sans-gluten": "Sans gluten", "sans-lactose": "Sans lactose",
};

interface RestaurantConfig {
  id: string;
  nom: string;
  serviceMode: string;
  langues: string;
}

export default function AdminPage() {
  const [categories, setCategories] = useState<CategoryRaw[]>([]);
  const [tables, setTables] = useState<TableRaw[]>([]);
  const [restaurantConfig, setRestaurantConfig] = useState<RestaurantConfig | null>(null);
  const [activeSection, setActiveSection] = useState<"menu" | "tables" | "qr" | "settings">("menu");
  const [editingPlat, setEditingPlat] = useState<PlatRaw | null>(null);
  const [showAddPlat, setShowAddPlat] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchMenu = async () => {
    const res = await fetch("/api/admin/plats");
    const data = await res.json() as CategoryRaw[];
    setCategories(data);
  };

  const fetchTables = async () => {
    const res = await fetch("/api/tables");
    const data = await res.json() as TableRaw[];
    setTables(data);
  };

  const fetchRestaurant = async () => {
    const res = await fetch("/api/admin/restaurant");
    if (res.ok) {
      const data = await res.json() as RestaurantConfig;
      setRestaurantConfig(data);
    }
  };

  useEffect(() => {
    fetchMenu();
    fetchTables();
    fetchRestaurant();
  }, []);

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

  async function createPlat(data: {
    categorieId: string;
    nomFr: string;
    nomEn: string;
    descriptionFr: string;
    prix: number;
    typeService: string;
    allergenes: string[];
    tags: string[];
  }) {
    setSaving(true);
    await fetch("/api/admin/plats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categorieId: data.categorieId,
        nomJson: JSON.stringify({ fr: data.nomFr, en: data.nomEn }),
        descriptionJson: JSON.stringify({ fr: data.descriptionFr }),
        prix: data.prix,
        typeService: data.typeService,
        allergenes: data.allergenes,
        tags: data.tags,
      }),
    });
    setSaving(false);
    setShowAddPlat(false);
    fetchMenu();
  }

  async function createCategory(nomFr: string, nomEn: string) {
    setSaving(true);
    await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomJson: JSON.stringify({ fr: nomFr, en: nomEn }),
      }),
    });
    setSaving(false);
    setShowAddCategory(false);
    fetchMenu();
  }

  async function deleteCategory(cat: CategoryRaw) {
    if (cat.plats.length > 0) {
      alert(`Impossible : cette catégorie contient ${cat.plats.length} plat(s). Supprimez-les d'abord.`);
      return;
    }
    if (!confirm(`Supprimer la catégorie "${parseNom(cat.nomJson)}" ?`)) return;
    const res = await fetch(`/api/admin/categories/${cat.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json() as { error: string };
      alert(err.error ?? "Erreur lors de la suppression");
      return;
    }
    fetchMenu();
  }

  async function saveRestaurant(updates: Partial<RestaurantConfig>) {
    setSaving(true);
    await fetch("/api/admin/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setSaving(false);
    fetchRestaurant();
  }

  async function deleteTable(id: string) {
    if (!confirm("Supprimer cette table ? Cette action est irréversible.")) return;
    await fetch(`/api/tables/${id}`, { method: "DELETE" });
    fetchTables();
  }

  async function createTable(numero: string) {
    await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero }),
    });
    fetchTables();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white px-6 py-4">
        <h1 className="text-xl font-bold">⚙️ Back-office — La Belle Époque</h1>
        <p className="text-gray-400 text-sm mt-0.5">Gestion du restaurant</p>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b flex">
        {(["menu", "tables", "qr", "settings"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
              activeSection === s
                ? "border-gray-800 text-gray-800"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {s === "menu" ? "Menu" : s === "tables" ? "Tables" : s === "qr" ? "QR Codes" : "Paramètres"}
          </button>
        ))}
      </nav>

      <div className="p-6 max-w-5xl mx-auto">
        {/* MENU SECTION */}
        {activeSection === "menu" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Gestion du menu</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition font-medium"
                >
                  + Catégorie
                </button>
                <button
                  onClick={() => setShowAddPlat(true)}
                  className="text-sm bg-gray-800 text-white px-4 py-2 rounded-xl hover:bg-gray-700 transition font-medium"
                >
                  + Nouveau plat
                </button>
              </div>
            </div>

            {categories.map((cat) => (
              <div key={cat.id}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-gray-700 flex items-center gap-2">
                    {parseNom(cat.nomJson)}
                    <span className="text-gray-400 font-normal text-sm">({cat.plats.length} plats)</span>
                  </h2>
                  <button
                    onClick={() => deleteCategory(cat)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Supprimer catégorie
                  </button>
                </div>
                <div className="bg-white rounded-2xl shadow-sm divide-y">
                  {cat.plats.length === 0 && (
                    <p className="p-4 text-gray-400 text-sm italic">Aucun plat dans cette catégorie</p>
                  )}
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

        {/* TABLES SECTION */}
        {activeSection === "tables" && (
          <TablesSection
            tables={tables}
            onDelete={deleteTable}
            onCreate={createTable}
            onRefresh={fetchTables}
          />
        )}

        {/* QR SECTION */}
        {activeSection === "qr" && (
          <QRCodeSection tables={tables} />
        )}

        {/* SETTINGS SECTION */}
        {activeSection === "settings" && restaurantConfig && (
          <SettingsSection
            config={restaurantConfig}
            onSave={saveRestaurant}
            saving={saving}
          />
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

      {/* Add plat modal */}
      {showAddPlat && (
        <AddPlatModal
          categories={categories}
          onSave={createPlat}
          onClose={() => setShowAddPlat(false)}
          saving={saving}
        />
      )}

      {/* Add category modal */}
      {showAddCategory && (
        <AddCategoryModal
          onSave={createCategory}
          onClose={() => setShowAddCategory(false)}
          saving={saving}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Tables Section
// ──────────────────────────────────────────────────────────────
function TablesSection({
  tables,
  onDelete,
  onCreate,
  onRefresh,
}: {
  tables: TableRaw[];
  onDelete: (id: string) => void;
  onCreate: (numero: string) => void;
  onRefresh: () => void;
}) {
  const [newNumero, setNewNumero] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!newNumero.trim()) return;
    setCreating(true);
    await onCreate(newNumero.trim());
    setNewNumero("");
    setCreating(false);
    onRefresh();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-800">Gestion des tables</h2>

      {/* Add table form */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numéro / nom de la table
          </label>
          <input
            value={newNumero}
            onChange={(e) => setNewNumero(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="ex : 11, Terrasse 3, Bar..."
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={creating || !newNumero.trim()}
          className="bg-gray-800 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition"
        >
          {creating ? "Création..." : "+ Ajouter"}
        </button>
      </div>

      {/* Tables list */}
      <div className="bg-white rounded-2xl shadow-sm divide-y">
        {tables.length === 0 && (
          <p className="p-6 text-gray-400 text-sm text-center">Aucune table configurée</p>
        )}
        {tables.map((table) => (
          <div key={table.id} className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-800">Table {table.numero}</p>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">{table.qrToken}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                table.statut === "occupee"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-green-100 text-green-700"
              }`}>
                {table.statut === "occupee" ? "Occupée" : "Libre"}
              </span>
              <button
                onClick={() => onDelete(table.id)}
                disabled={table.statut === "occupee"}
                title={table.statut === "occupee" ? "Fermer la table avant de la supprimer" : ""}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// QR Codes Section
// ──────────────────────────────────────────────────────────────
function QRCodeSection({ tables }: { tables: TableRaw[] }) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  function downloadQR(tableNumero: string, qrToken: string) {
    const url = `${baseUrl}/menu/${qrToken}`;
    const qrUrl = `/api/admin/qr?url=${encodeURIComponent(url)}`;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `qr-table-${tableNumero}.svg`;
    a.click();
  }

  function printQR(tableNumero: string, qrToken: string) {
    const url = `${baseUrl}/menu/${qrToken}`;
    const qrUrl = `/api/admin/qr?url=${encodeURIComponent(url)}`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>QR Table ${tableNumero}</title>
      <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 40px; }
        h1 { font-size: 28px; margin-bottom: 8px; }
        p { color: #666; margin-bottom: 24px; font-size: 14px; }
        img { width: 240px; height: 240px; }
      </style></head>
      <body>
        <h1>Table ${tableNumero}</h1>
        <p>Scannez pour commander</p>
        <img src="${qrUrl}" />
        <script>window.onload = () => { window.print(); }<\/script>
      </body></html>
    `);
    win.document.close();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">QR Codes par table</h2>
      <p className="text-sm text-gray-500">Imprimez ou téléchargez les QR codes à déposer sur les tables.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((table) => {
          const url = `${baseUrl}/menu/${table.qrToken}`;
          const qrImgUrl = `/api/admin/qr?url=${encodeURIComponent(url)}`;
          return (
            <div key={table.id} className="bg-white rounded-xl shadow-sm p-5 flex flex-col items-center text-center">
              <h3 className="font-bold text-gray-700 text-lg mb-3">Table {table.numero}</h3>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImgUrl}
                alt={`QR Table ${table.numero}`}
                className="w-40 h-40 mb-3 rounded-lg border border-gray-100"
              />
              <p className="text-xs text-gray-400 break-all mb-4">{url}</p>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => printQR(table.numero, table.qrToken)}
                  className="flex-1 text-xs bg-gray-800 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition"
                >
                  Imprimer
                </button>
                <button
                  onClick={() => downloadQR(table.numero, table.qrToken)}
                  className="flex-1 text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition"
                >
                  Télécharger
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-xs bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-100 transition"
                >
                  Tester
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Edit Plat Modal
// ──────────────────────────────────────────────────────────────
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
  const [descFr, setDescFr] = useState(() => {
    try { return (JSON.parse(plat.descriptionJson) as Record<string, string>).fr ?? ""; } catch { return ""; }
  });
  const [prix, setPrix] = useState(plat.prix);
  const [typeService, setTypeService] = useState(plat.typeService);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(() => {
    try { return JSON.parse(plat.allergenes) as string[]; } catch { return []; }
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    try { return JSON.parse(plat.tags) as string[]; } catch { return []; }
  });

  function toggleAllergen(a: string) {
    setSelectedAllergens((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  }
  function toggleTag(t: string) {
    setSelectedTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  function handleSave() {
    const nomJson = JSON.stringify({ fr: nomFr, en: nomEn });
    const descriptionJson = JSON.stringify({ fr: descFr });
    onSave({
      nomJson,
      descriptionJson,
      prix,
      typeService,
      allergenes: JSON.stringify(selectedAllergens),
      tags: JSON.stringify(selectedTags),
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Modifier le plat</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom (FR)</label>
                <input value={nomFr} onChange={(e) => setNomFr(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom (EN)</label>
                <input value={nomEn} onChange={(e) => setNomEn(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (FR)</label>
              <textarea value={descFr} onChange={(e) => setDescFr(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix (€)</label>
                <input type="number" step="0.5" value={prix} onChange={(e) => setPrix(parseFloat(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de service</label>
                <select value={typeService} onChange={(e) => setTypeService(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {Object.entries(TYPE_SERVICE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Allergènes</label>
              <div className="flex flex-wrap gap-2">
                {ALLERGEN_LIST.map((a) => (
                  <button key={a} type="button" onClick={() => toggleAllergen(a)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${selectedAllergens.includes(a) ? "bg-orange-100 border-orange-400 text-orange-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                    {ALLERGEN_LABELS[a]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags régime</label>
              <div className="flex flex-wrap gap-2">
                {TAG_LIST.map((t) => (
                  <button key={t} type="button" onClick={() => toggleTag(t)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${selectedTags.includes(t) ? "bg-green-100 border-green-400 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                    {TAG_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50">
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-gray-800 text-white py-2.5 rounded-xl font-medium hover:bg-gray-700 disabled:opacity-50">
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Add Plat Modal
// ──────────────────────────────────────────────────────────────
function AddPlatModal({
  categories,
  onSave,
  onClose,
  saving,
}: {
  categories: CategoryRaw[];
  onSave: (data: {
    categorieId: string;
    nomFr: string;
    nomEn: string;
    descriptionFr: string;
    prix: number;
    typeService: string;
    allergenes: string[];
    tags: string[];
  }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [categorieId, setCategorieId] = useState(categories[0]?.id ?? "");
  const [nomFr, setNomFr] = useState("");
  const [nomEn, setNomEn] = useState("");
  const [descriptionFr, setDescriptionFr] = useState("");
  const [prix, setPrix] = useState(0);
  const [typeService, setTypeService] = useState("plat");
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  function toggleAllergen(a: string) {
    setSelectedAllergens((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  }
  function toggleTag(t: string) {
    setSelectedTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  function handleSave() {
    if (!nomFr.trim() || prix <= 0 || !categorieId) return;
    onSave({ categorieId, nomFr, nomEn, descriptionFr, prix, typeService, allergenes: selectedAllergens, tags: selectedTags });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Nouveau plat</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select value={categorieId} onChange={(e) => setCategorieId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{parseNom(c.nomJson)}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom (FR) *</label>
                <input value={nomFr} onChange={(e) => setNomFr(e.target.value)} placeholder="Nom en français" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom (EN)</label>
                <input value={nomEn} onChange={(e) => setNomEn(e.target.value)} placeholder="English name" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (FR)</label>
              <textarea value={descriptionFr} onChange={(e) => setDescriptionFr(e.target.value)} rows={2} placeholder="Description courte..." className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix (€) *</label>
                <input type="number" step="0.5" min="0" value={prix || ""} onChange={(e) => setPrix(parseFloat(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de service</label>
                <select value={typeService} onChange={(e) => setTypeService(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {Object.entries(TYPE_SERVICE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Allergènes</label>
              <div className="flex flex-wrap gap-2">
                {ALLERGEN_LIST.map((a) => (
                  <button key={a} type="button" onClick={() => toggleAllergen(a)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${selectedAllergens.includes(a) ? "bg-orange-100 border-orange-400 text-orange-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                    {ALLERGEN_LABELS[a]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags régime</label>
              <div className="flex flex-wrap gap-2">
                {TAG_LIST.map((t) => (
                  <button key={t} type="button" onClick={() => toggleTag(t)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${selectedTags.includes(t) ? "bg-green-100 border-green-400 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                    {TAG_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50">
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving || !nomFr.trim() || prix <= 0} className="flex-1 bg-gray-800 text-white py-2.5 rounded-xl font-medium hover:bg-gray-700 disabled:opacity-50">
              {saving ? "Création..." : "Créer le plat"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Settings Section
// ──────────────────────────────────────────────────────────────
function SettingsSection({
  config,
  onSave,
  saving,
}: {
  config: { id: string; nom: string; serviceMode: string; langues: string };
  onSave: (updates: Partial<{ nom: string; serviceMode: string; langues: string }>) => void;
  saving: boolean;
}) {
  const [nom, setNom] = useState(config.nom);
  const [serviceMode, setServiceMode] = useState(config.serviceMode);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await onSave({ nom, serviceMode });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-lg font-bold text-gray-800">Paramètres du restaurant</h2>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom du restaurant</label>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mode de service</label>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="serviceMode"
                value="sequential"
                checked={serviceMode === "sequential"}
                onChange={() => setServiceMode("sequential")}
                className="mt-0.5"
              />
              <div>
                <p className="font-medium text-sm text-gray-800">Séquentiel (recommandé)</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Les entrées partent en cuisine immédiatement. Le serveur envoie manuellement les plats puis les desserts.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="serviceMode"
                value="simultaneous"
                checked={serviceMode === "simultaneous"}
                onChange={() => setServiceMode("simultaneous")}
                className="mt-0.5"
              />
              <div>
                <p className="font-medium text-sm text-gray-800">Simultané (bar / fast-casual)</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tous les plats partent en cuisine immédiatement à la confirmation de commande.
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gray-800 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-gray-700 disabled:opacity-50 transition"
          >
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
          {saved && <span className="text-green-600 text-sm font-medium">✅ Sauvegardé</span>}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Add Category Modal
// ──────────────────────────────────────────────────────────────
function AddCategoryModal({
  onSave,
  onClose,
  saving,
}: {
  onSave: (nomFr: string, nomEn: string) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [nomFr, setNomFr] = useState("");
  const [nomEn, setNomEn] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Nouvelle catégorie</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom (FR) *</label>
              <input value={nomFr} onChange={(e) => setNomFr(e.target.value)} placeholder="ex : Entrées, Plats..." className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom (EN)</label>
              <input value={nomEn} onChange={(e) => setNomEn(e.target.value)} placeholder="ex : Starters, Mains..." className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50">
              Annuler
            </button>
            <button onClick={() => onSave(nomFr, nomEn)} disabled={saving || !nomFr.trim()} className="flex-1 bg-gray-800 text-white py-2.5 rounded-xl font-medium hover:bg-gray-700 disabled:opacity-50">
              {saving ? "Création..." : "Créer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
