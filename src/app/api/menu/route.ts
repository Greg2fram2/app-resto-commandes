import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/menu?restaurantId=xxx&locale=fr
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId") ?? "demo-restaurant";
  const locale = searchParams.get("locale") ?? "fr";

  const categories = await prisma.category.findMany({
    where: { restaurantId },
    orderBy: { ordre: "asc" },
    include: {
      plats: {
        orderBy: { ordre: "asc" },
      },
    },
  });

  const result = categories.map((cat) => ({
    id: cat.id,
    nom: parseJson(cat.nomJson, locale),
    plats: cat.plats.map((p) => ({
      id: p.id,
      nom: parseJson(p.nomJson, locale),
      description: parseJson(p.descriptionJson, locale),
      prix: p.prix,
      photoUrl: p.photoUrl,
      disponible: p.disponible,
      typeService: p.typeService,
      allergenes: parseJsonArray(p.allergenes),
      tags: parseJsonArray(p.tags),
      ingredients: parseJson(p.ingredientsJson, locale),
    })),
  }));

  return NextResponse.json(result);
}

function parseJson(json: string, locale: string): string {
  try {
    const obj = JSON.parse(json) as Record<string, string>;
    return obj[locale] ?? obj["fr"] ?? Object.values(obj)[0] ?? "";
  } catch {
    return json;
  }
}

function parseJsonArray(json: string): string[] {
  try {
    return JSON.parse(json) as string[];
  } catch {
    return [];
  }
}
