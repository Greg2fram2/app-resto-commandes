import Database from "better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaLibSQL as PrismaBetterSQLite } from "@prisma/adapter-better-sqlite3";

const sqlite = new Database("./prisma/dev.db");
const adapter = new PrismaBetterSQLite(sqlite);
const prisma = new PrismaClient({ adapter } as Parameters<typeof PrismaClient>[0]);

async function main() {
  // Create demo restaurant
  const restaurant = await prisma.restaurant.upsert({
    where: { id: "demo-restaurant" },
    update: {},
    create: {
      id: "demo-restaurant",
      nom: "Restaurant La Belle Époque",
      adresse: "12 Rue des Lilas, Paris",
      serviceMode: "sequential",
      langues: "fr,en",
    },
  });

  // Create tables
  const tableData = [
    { numero: "1", qrToken: "table-1-token" },
    { numero: "2", qrToken: "table-2-token" },
    { numero: "3", qrToken: "table-3-token" },
    { numero: "4", qrToken: "table-4-token" },
    { numero: "5", qrToken: "table-5-token" },
    { numero: "6", qrToken: "table-6-token" },
    { numero: "7", qrToken: "table-7-token" },
    { numero: "8", qrToken: "table-8-token" },
    { numero: "Terrasse 1", qrToken: "terrasse-1-token" },
    { numero: "Terrasse 2", qrToken: "terrasse-2-token" },
  ];

  for (const t of tableData) {
    await prisma.table.upsert({
      where: { qrToken: t.qrToken },
      update: {},
      create: {
        restaurantId: restaurant.id,
        numero: t.numero,
        qrToken: t.qrToken,
      },
    });
  }

  // Create categories
  const categories = [
    { id: "cat-entrees", nomJson: JSON.stringify({ fr: "Entrées", en: "Starters" }), ordre: 1 },
    { id: "cat-plats", nomJson: JSON.stringify({ fr: "Plats principaux", en: "Main Courses" }), ordre: 2 },
    { id: "cat-desserts", nomJson: JSON.stringify({ fr: "Desserts", en: "Desserts" }), ordre: 3 },
    { id: "cat-boissons", nomJson: JSON.stringify({ fr: "Boissons", en: "Drinks" }), ordre: 4 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: {
        id: cat.id,
        restaurantId: restaurant.id,
        nomJson: cat.nomJson,
        ordre: cat.ordre,
      },
    });
  }

  // Create dishes
  const plats = [
    {
      id: "plat-salade-cesar",
      categorieId: "cat-entrees",
      nomJson: JSON.stringify({ fr: "Salade César", en: "Caesar Salad" }),
      descriptionJson: JSON.stringify({
        fr: "Romaine, parmesan, croûtons, anchois, sauce césar maison",
        en: "Romaine lettuce, parmesan, croutons, anchovies, house caesar dressing",
      }),
      prix: 12.0,
      typeService: "entree",
      allergenes: JSON.stringify(["poisson", "gluten", "lait", "oeufs"]),
      tags: JSON.stringify([]),
      ordre: 1,
    },
    {
      id: "plat-soupe-oignon",
      categorieId: "cat-entrees",
      nomJson: JSON.stringify({ fr: "Soupe à l'oignon", en: "French Onion Soup" }),
      descriptionJson: JSON.stringify({
        fr: "Soupe à l'oignon gratinée, croûtons, gruyère fondu",
        en: "Gratinated onion soup, croutons, melted gruyère",
      }),
      prix: 10.0,
      typeService: "entree",
      allergenes: JSON.stringify(["gluten", "lait"]),
      tags: JSON.stringify(["vegetarien"]),
      ordre: 2,
    },
    {
      id: "plat-risotto",
      categorieId: "cat-plats",
      nomJson: JSON.stringify({ fr: "Risotto aux cèpes", en: "Porcini Mushroom Risotto" }),
      descriptionJson: JSON.stringify({
        fr: "Risotto crémeux aux cèpes, parmesan, truffe noire",
        en: "Creamy porcini mushroom risotto, parmesan, black truffle",
      }),
      prix: 18.0,
      typeService: "plat",
      allergenes: JSON.stringify(["lait"]),
      tags: JSON.stringify(["vegetarien"]),
      ordre: 1,
    },
    {
      id: "plat-pave-saumon",
      categorieId: "cat-plats",
      nomJson: JSON.stringify({ fr: "Pavé de saumon", en: "Salmon Fillet" }),
      descriptionJson: JSON.stringify({
        fr: "Pavé de saumon grillé, purée de pommes de terre, sauce beurre blanc",
        en: "Grilled salmon fillet, mashed potatoes, beurre blanc sauce",
      }),
      prix: 22.0,
      typeService: "plat",
      allergenes: JSON.stringify(["poisson", "lait"]),
      tags: JSON.stringify(["sans-gluten"]),
      ordre: 2,
    },
    {
      id: "plat-entrecote",
      categorieId: "cat-plats",
      nomJson: JSON.stringify({ fr: "Entrecôte grillée", en: "Grilled Ribeye" }),
      descriptionJson: JSON.stringify({
        fr: "Entrecôte 300g, frites maison, sauce au poivre",
        en: "300g ribeye steak, homemade fries, pepper sauce",
      }),
      prix: 26.0,
      typeService: "plat",
      allergenes: JSON.stringify(["lait"]),
      tags: JSON.stringify([]),
      ordre: 3,
    },
    {
      id: "plat-tiramisu",
      categorieId: "cat-desserts",
      nomJson: JSON.stringify({ fr: "Tiramisu", en: "Tiramisu" }),
      descriptionJson: JSON.stringify({
        fr: "Tiramisu maison, mascarpone, café, biscuits savoiards",
        en: "Homemade tiramisu, mascarpone, espresso, ladyfingers",
      }),
      prix: 9.0,
      typeService: "dessert",
      allergenes: JSON.stringify(["gluten", "lait", "oeufs"]),
      tags: JSON.stringify(["vegetarien"]),
      ordre: 1,
    },
    {
      id: "plat-moelleux",
      categorieId: "cat-desserts",
      nomJson: JSON.stringify({ fr: "Moelleux au chocolat", en: "Chocolate Fondant" }),
      descriptionJson: JSON.stringify({
        fr: "Fondant au chocolat noir 70%, glace vanille",
        en: "Dark chocolate fondant 70%, vanilla ice cream",
      }),
      prix: 10.0,
      typeService: "dessert",
      allergenes: JSON.stringify(["gluten", "lait", "oeufs"]),
      tags: JSON.stringify(["vegetarien"]),
      ordre: 2,
    },
    {
      id: "plat-eau",
      categorieId: "cat-boissons",
      nomJson: JSON.stringify({ fr: "Eau minérale", en: "Mineral Water" }),
      descriptionJson: JSON.stringify({
        fr: "Eau plate ou gazeuse (50cl)",
        en: "Still or sparkling water (50cl)",
      }),
      prix: 3.5,
      typeService: "boisson",
      allergenes: JSON.stringify([]),
      tags: JSON.stringify(["vegan", "sans-gluten"]),
      ordre: 1,
    },
    {
      id: "plat-vin-rouge",
      categorieId: "cat-boissons",
      nomJson: JSON.stringify({ fr: "Vin rouge (verre)", en: "Red Wine (glass)" }),
      descriptionJson: JSON.stringify({
        fr: "Sélection du sommelier, verre 15cl",
        en: "Sommelier's selection, 15cl glass",
      }),
      prix: 7.0,
      typeService: "boisson",
      allergenes: JSON.stringify(["sulfites"]),
      tags: JSON.stringify(["vegan"]),
      ordre: 2,
    },
  ];

  for (const plat of plats) {
    await prisma.plat.upsert({
      where: { id: plat.id },
      update: {},
      create: plat,
    });
  }

  console.log("Seed completed successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
