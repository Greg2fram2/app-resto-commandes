import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4">🍽️</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">RestaurantApp</h1>
        <p className="text-gray-500 mb-10">Application de commande digitale — MVP</p>

        <div className="space-y-4">
          <Link
            href="/menu/table-1-token"
            className="block w-full bg-amber-500 text-white py-4 rounded-2xl font-semibold text-base hover:bg-amber-600 transition shadow-md"
          >
            📱 Vue Client (Table 1)
          </Link>

          <Link
            href="/staff"
            className="block w-full bg-indigo-600 text-white py-4 rounded-2xl font-semibold text-base hover:bg-indigo-700 transition shadow-md"
          >
            👤 Vue Serveur
          </Link>

          <Link
            href="/kitchen"
            className="block w-full bg-red-700 text-white py-4 rounded-2xl font-semibold text-base hover:bg-red-800 transition shadow-md"
          >
            🍳 Vue Cuisine
          </Link>

          <Link
            href="/admin"
            className="block w-full bg-gray-700 text-white py-4 rounded-2xl font-semibold text-base hover:bg-gray-800 transition shadow-md"
          >
            ⚙️ Back-office
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-10">
          v0.1 MVP — Pré-specs validées le 31 mars 2026
        </p>
      </div>
    </div>
  );
}
