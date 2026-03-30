// Simple seed using better-sqlite3 directly
import Database from "better-sqlite3";
import { randomBytes } from "crypto";

function cuid() {
  return "c" + randomBytes(8).toString("hex") + Date.now().toString(36);
}

const db = new Database("./dev.db");

// Check if already seeded
const existing = db.prepare("SELECT COUNT(*) as count FROM Restaurant").get();
if (existing.count > 0) {
  console.log("Database already seeded, skipping.");
  db.close();
  process.exit(0);
}

const now = new Date().toISOString();

// Restaurant
db.prepare(`
  INSERT OR IGNORE INTO Restaurant (id, nom, adresse, serviceMode, langues, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run("demo-restaurant", "La Belle Epoque", "12 Rue des Lilas, Paris", "sequential", "fr,en", now, now);

// Tables
const tables = [
  ["table-1-token", "1"], ["table-2-token", "2"], ["table-3-token", "3"],
  ["table-4-token", "4"], ["table-5-token", "5"], ["table-6-token", "6"],
  ["table-7-token", "7"], ["table-8-token", "8"],
  ["terrasse-1-token", "Terrasse 1"], ["terrasse-2-token", "Terrasse 2"],
];

for (const [qrToken, numero] of tables) {
  const id = cuid();
  db.prepare(`
    INSERT OR IGNORE INTO \`Table\` (id, restaurantId, numero, qrToken, statut, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, "demo-restaurant", numero, qrToken, "libre", now, now);
}
console.log("Tables seeded");

// Categories
const cats = [
  ["cat-entrees", JSON.stringify({fr:"Entrées",en:"Starters"}), 1],
  ["cat-plats", JSON.stringify({fr:"Plats principaux",en:"Main Courses"}), 2],
  ["cat-desserts", JSON.stringify({fr:"Desserts",en:"Desserts"}), 3],
  ["cat-boissons", JSON.stringify({fr:"Boissons",en:"Drinks"}), 4],
];

for (const [id, nomJson, ordre] of cats) {
  db.prepare(`
    INSERT OR IGNORE INTO Category (id, restaurantId, nomJson, ordre, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, "demo-restaurant", nomJson, ordre, now, now);
}
console.log("Categories seeded");

// Plats
const plats = [
  {
    id: "plat-salade-cesar", categorieId: "cat-entrees",
    nomJson: JSON.stringify({fr:"Salade César",en:"Caesar Salad"}),
    descriptionJson: JSON.stringify({fr:"Romaine, parmesan, croûtons, anchois",en:"Romaine, parmesan, croutons, anchovies"}),
    prix: 12.0, typeService: "entree", ordre: 1,
    allergenes: JSON.stringify(["poisson","gluten","lait","oeufs"]), tags: "[]",
  },
  {
    id: "plat-soupe-oignon", categorieId: "cat-entrees",
    nomJson: JSON.stringify({fr:"Soupe à l'oignon",en:"French Onion Soup"}),
    descriptionJson: JSON.stringify({fr:"Soupe gratinée, gruyère",en:"Gratinated onion soup, gruyère"}),
    prix: 10.0, typeService: "entree", ordre: 2,
    allergenes: JSON.stringify(["gluten","lait"]), tags: JSON.stringify(["vegetarien"]),
  },
  {
    id: "plat-risotto", categorieId: "cat-plats",
    nomJson: JSON.stringify({fr:"Risotto aux cèpes",en:"Porcini Risotto"}),
    descriptionJson: JSON.stringify({fr:"Risotto crémeux, parmesan, truffe",en:"Creamy risotto, parmesan, truffle"}),
    prix: 18.0, typeService: "plat", ordre: 1,
    allergenes: JSON.stringify(["lait"]), tags: JSON.stringify(["vegetarien"]),
  },
  {
    id: "plat-saumon", categorieId: "cat-plats",
    nomJson: JSON.stringify({fr:"Pavé de saumon",en:"Salmon Fillet"}),
    descriptionJson: JSON.stringify({fr:"Saumon grillé, purée, beurre blanc",en:"Grilled salmon, mashed potato, beurre blanc"}),
    prix: 22.0, typeService: "plat", ordre: 2,
    allergenes: JSON.stringify(["poisson","lait"]), tags: JSON.stringify(["sans-gluten"]),
  },
  {
    id: "plat-entrecote", categorieId: "cat-plats",
    nomJson: JSON.stringify({fr:"Entrecôte grillée",en:"Grilled Ribeye"}),
    descriptionJson: JSON.stringify({fr:"300g, frites maison, sauce au poivre",en:"300g, homemade fries, pepper sauce"}),
    prix: 26.0, typeService: "plat", ordre: 3,
    allergenes: JSON.stringify(["lait"]), tags: "[]",
  },
  {
    id: "plat-tiramisu", categorieId: "cat-desserts",
    nomJson: JSON.stringify({fr:"Tiramisu",en:"Tiramisu"}),
    descriptionJson: JSON.stringify({fr:"Mascarpone, café, biscuits savoiards",en:"Mascarpone, espresso, ladyfingers"}),
    prix: 9.0, typeService: "dessert", ordre: 1,
    allergenes: JSON.stringify(["gluten","lait","oeufs"]), tags: JSON.stringify(["vegetarien"]),
  },
  {
    id: "plat-moelleux", categorieId: "cat-desserts",
    nomJson: JSON.stringify({fr:"Moelleux au chocolat",en:"Chocolate Fondant"}),
    descriptionJson: JSON.stringify({fr:"Chocolat noir 70%, glace vanille",en:"70% dark chocolate, vanilla ice cream"}),
    prix: 10.0, typeService: "dessert", ordre: 2,
    allergenes: JSON.stringify(["gluten","lait","oeufs"]), tags: JSON.stringify(["vegetarien"]),
  },
  {
    id: "plat-eau", categorieId: "cat-boissons",
    nomJson: JSON.stringify({fr:"Eau minérale",en:"Mineral Water"}),
    descriptionJson: JSON.stringify({fr:"Plate ou gazeuse 50cl",en:"Still or sparkling 50cl"}),
    prix: 3.5, typeService: "boisson", ordre: 1,
    allergenes: "[]", tags: JSON.stringify(["vegan","sans-gluten"]),
  },
  {
    id: "plat-vin-rouge", categorieId: "cat-boissons",
    nomJson: JSON.stringify({fr:"Vin rouge (verre)",en:"Red Wine (glass)"}),
    descriptionJson: JSON.stringify({fr:"Sélection du sommelier, 15cl",en:"Sommelier selection, 15cl"}),
    prix: 7.0, typeService: "boisson", ordre: 2,
    allergenes: JSON.stringify(["sulfites"]), tags: JSON.stringify(["vegan"]),
  },
];

for (const p of plats) {
  db.prepare(`
    INSERT OR IGNORE INTO Plat (id, categorieId, nomJson, descriptionJson, prix, disponible, typeService, ordre, allergenes, tags, ingredientsJson, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, '{}', ?, ?)
  `).run(p.id, p.categorieId, p.nomJson, p.descriptionJson, p.prix, p.typeService, p.ordre, p.allergenes, p.tags, now, now);
}

console.log("Plats seeded");
console.log("Seed complete!");
db.close();
