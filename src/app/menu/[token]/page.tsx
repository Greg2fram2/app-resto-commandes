"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";

interface Plat {
  id: string;
  nom: string;
  description: string;
  prix: number;
  photoUrl: string | null;
  disponible: boolean;
  typeService: string;
  allergenes: string[];
  tags: string[];
}

interface Category {
  id: string;
  nom: string;
  plats: Plat[];
}

interface CartItem {
  plat: Plat;
  quantite: number;
  notes?: string;
}

const ALLERGEN_LABELS: Record<string, string> = {
  gluten: "Gluten", crustaces: "Crustacés", oeufs: "Œufs", poisson: "Poisson",
  arachides: "Arachides", soja: "Soja", lait: "Lait", "fruits-a-coque": "Fruits à coque",
  celeri: "Céleri", moutarde: "Moutarde", sesame: "Sésame", sulfites: "Sulfites",
  lupin: "Lupin", mollusques: "Mollusques",
};

const TAG_LABELS: Record<string, { label: string; color: string }> = {
  vegan: { label: "Végan", color: "bg-green-100 text-green-800" },
  vegetarien: { label: "Végétarien", color: "bg-green-100 text-green-700" },
  halal: { label: "Halal", color: "bg-emerald-100 text-emerald-800" },
  casher: { label: "Casher", color: "bg-blue-100 text-blue-800" },
  "sans-gluten": { label: "Sans gluten", color: "bg-yellow-100 text-yellow-800" },
  "sans-lactose": { label: "Sans lactose", color: "bg-orange-100 text-orange-800" },
};

export default function MenuPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [showCart, setShowCart] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [locale, setLocale] = useState<string>(() => {
    if (typeof navigator !== "undefined") {
      const lang = navigator.language?.split("-")[0] ?? "fr";
      return ["fr", "en", "es", "de", "it"].includes(lang) ? lang : "fr";
    }
    return "fr";
  });
  const [tableInfo, setTableInfo] = useState<{ numero: string; restaurantId: string; restaurantNom: string } | null>(null);
  const [tableNotOpen, setTableNotOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const restaurantId = tableInfo?.restaurantId ?? "demo-restaurant";
    fetch(`/api/menu?locale=${locale}&restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((data: Category[]) => {
        setCategories(data);
        if (data.length > 0) setActiveCategory(data[0].id);
      })
      .catch(() => {});
  }, [locale, tableInfo?.restaurantId]);

  useEffect(() => {
    fetch(`/api/tables/by-token?token=${token}`)
      .then((r) => r.json())
      .then((data: { numero: string; restaurantId: string; restaurantNom: string }) => setTableInfo(data))
      .catch(() => {});
  }, [token]);

  const cartTotal = Array.from(cart.values()).reduce(
    (sum, item) => sum + item.plat.prix * item.quantite,
    0
  );
  const cartCount = Array.from(cart.values()).reduce(
    (sum, item) => sum + item.quantite,
    0
  );

  function updateQuantity(plat: Plat, delta: number) {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(plat.id);
      const newQty = (existing?.quantite ?? 0) + delta;
      if (newQty <= 0) {
        next.delete(plat.id);
      } else {
        next.set(plat.id, { plat, quantite: newQty, notes: existing?.notes });
      }
      return next;
    });
  }

  function updateNotes(platId: string, notes: string) {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(platId);
      if (existing) next.set(platId, { ...existing, notes: notes || undefined });
      return next;
    });
  }

  async function confirmOrder() {
    setSending(true);
    setError("");
    try {
      const items = Array.from(cart.values()).map((item) => ({
        platId: item.plat.id,
        quantite: item.quantite,
        notes: item.notes,
      }));

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableToken: token, items, locale }),
      });

      if (res.status === 403) {
        setTableNotOpen(true);
        setSending(false);
        return;
      }

      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error ?? "Erreur");
      }

      setCart(new Map());
      setShowCart(false);
      setOrderSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  }

  const activeItems = categories.find((c) => c.id === activeCategory)?.plats ?? [];

  if (tableNotOpen) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Table pas encore ouverte</h2>
          <p className="text-gray-500 mb-6">Votre serveur doit ouvrir la table avant que vous puissiez commander.</p>
          <button
            onClick={() => setTableNotOpen(false)}
            className="bg-amber-500 text-white px-6 py-2 rounded-full font-medium hover:bg-amber-600"
          >
            Retour au menu
          </button>
        </div>
      </div>
    );
  }

  if (showCart) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
          <button onClick={() => setShowCart(false)} className="text-gray-600 text-lg">← Modifier</button>
          <h1 className="text-lg font-semibold text-gray-800 flex-1 text-center">
            Ma commande{tableInfo ? ` — Table ${tableInfo.numero}` : ""}
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {Array.from(cart.values()).map((item) => (
            <div key={item.plat.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{item.plat.nom}</p>
                  <p className="text-gray-500 text-sm">{item.plat.prix.toFixed(2)} € × {item.quantite}</p>
                </div>
                <p className="font-semibold text-gray-800">{(item.plat.prix * item.quantite).toFixed(2)} €</p>
              </div>
              <input
                type="text"
                placeholder="Note (sans oignons, bien cuit...)"
                value={item.notes ?? ""}
                onChange={(e) => updateNotes(item.plat.id, e.target.value)}
                className="mt-2 w-full text-sm border rounded-lg px-3 py-1.5 text-gray-600 placeholder-gray-400"
              />
            </div>
          ))}
        </div>

        <div className="bg-white border-t px-4 py-4">
          <div className="flex justify-between text-lg font-semibold mb-4">
            <span>Total</span>
            <span>{cartTotal.toFixed(2)} €</span>
          </div>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          {orderSent && (
            <div className="bg-green-50 text-green-700 rounded-xl p-3 mb-3 text-center font-medium">
              ✅ Commande envoyée avec succès !
            </div>
          )}
          <button
            onClick={confirmOrder}
            disabled={sending || cartCount === 0}
            className="w-full bg-amber-500 text-white py-4 rounded-2xl font-semibold text-lg disabled:opacity-50 hover:bg-amber-600 transition"
          >
            {sending ? "Envoi en cours..." : "✅ Confirmer la commande"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-orange-500 text-white text-center text-sm py-1.5 font-medium">
          📵 Hors ligne — les commandes seront envoyées à la reconnexion
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            {tableInfo ? `Table ${tableInfo.numero}` : ""}
          </p>
          <h1 className="text-xl font-bold text-gray-800">
            {tableInfo?.restaurantNom ?? "Restaurant"}
          </h1>
        </div>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="text-sm border rounded-lg px-2 py-1 text-gray-600 bg-white"
          aria-label="Langue"
        >
          <option value="fr">🇫🇷 FR</option>
          <option value="en">🇬🇧 EN</option>
          <option value="es">🇪🇸 ES</option>
          <option value="de">🇩🇪 DE</option>
          <option value="it">🇮🇹 IT</option>
        </select>
      </header>

      {/* Category tabs */}
      <nav className="bg-white border-b overflow-x-auto">
        <div className="flex px-4 gap-0 min-w-max">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeCategory === cat.id
                  ? "border-amber-500 text-amber-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {cat.nom}
            </button>
          ))}
        </div>
      </nav>

      {/* Menu items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
        {activeItems.map((plat) => {
          const qty = cart.get(plat.id)?.quantite ?? 0;
          return (
            <div
              key={plat.id}
              className={`bg-white rounded-2xl shadow-sm overflow-hidden ${
                !plat.disponible ? "opacity-50" : ""
              }`}
            >
              {plat.photoUrl && (
                <div className="relative h-40 bg-gray-100">
                  <Image src={plat.photoUrl} alt={plat.nom} fill className="object-cover" />
                </div>
              )}
              {!plat.photoUrl && (
                <div className="h-28 bg-gradient-to-r from-amber-100 to-orange-100 flex items-center justify-center text-4xl">
                  🍽️
                </div>
              )}

              <div className="p-4">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-gray-800 text-base">{plat.nom}</h3>
                  <span className="font-bold text-amber-600 ml-3 whitespace-nowrap">
                    {plat.prix.toFixed(2)} €
                  </span>
                </div>

                {plat.description && (
                  <p className="text-gray-500 text-sm mb-2 leading-relaxed">{plat.description}</p>
                )}

                {/* Tags */}
                {plat.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {plat.tags.map((tag) => {
                      const t = TAG_LABELS[tag];
                      return t ? (
                        <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.color}`}>
                          {t.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                {/* Allergens */}
                {plat.allergenes.length > 0 && (
                  <p className="text-xs text-orange-600 mb-3">
                    ⚠️ {plat.allergenes.map((a) => ALLERGEN_LABELS[a] ?? a).join(", ")}
                  </p>
                )}

                {!plat.disponible ? (
                  <p className="text-gray-400 text-sm font-medium">Indisponible</p>
                ) : (
                  <div className="flex items-center justify-between mt-3">
                    {qty === 0 ? (
                      <button
                        onClick={() => updateQuantity(plat, 1)}
                        className="bg-amber-500 text-white px-5 py-2 rounded-full font-medium text-sm hover:bg-amber-600 transition"
                      >
                        Ajouter
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(plat, -1)}
                          className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center hover:bg-gray-200"
                        >
                          −
                        </button>
                        <span className="text-lg font-semibold text-gray-800 w-6 text-center">{qty}</span>
                        <button
                          onClick={() => updateQuantity(plat, 1)}
                          className="w-9 h-9 rounded-full bg-amber-500 text-white font-bold text-lg flex items-center justify-center hover:bg-amber-600"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart button */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4">
          <button
            onClick={() => setShowCart(true)}
            className="w-full bg-amber-500 text-white py-4 rounded-2xl shadow-lg font-semibold text-base flex items-center justify-between px-6 hover:bg-amber-600 transition"
          >
            <span className="bg-amber-600 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
              {cartCount}
            </span>
            <span>🛒 Voir ma commande</span>
            <span>{cartTotal.toFixed(2)} €</span>
          </button>
        </div>
      )}

      {orderSent && cartCount === 0 && (
        <div className="fixed bottom-4 left-4 right-4">
          <div className="bg-green-500 text-white py-4 rounded-2xl shadow-lg font-semibold text-center">
            ✅ Commande envoyée ! Vous pouvez recommander à tout moment.
          </div>
        </div>
      )}
    </div>
  );
}
