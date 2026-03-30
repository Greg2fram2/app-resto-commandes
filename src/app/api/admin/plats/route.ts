import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId") ?? "demo-restaurant";

  const categories = await prisma.category.findMany({
    where: { restaurantId },
    orderBy: { ordre: "asc" },
    include: {
      plats: { orderBy: { ordre: "asc" } },
    },
  });

  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    categorieId: string;
    nomJson: string;
    descriptionJson?: string;
    prix: number;
    photoUrl?: string;
    typeService?: string;
    allergenes?: string[];
    tags?: string[];
    ingredientsJson?: string;
  };

  const plat = await prisma.plat.create({
    data: {
      categorieId: body.categorieId,
      nomJson: body.nomJson,
      descriptionJson: body.descriptionJson ?? "{}",
      prix: body.prix,
      photoUrl: body.photoUrl,
      typeService: body.typeService ?? "plat",
      allergenes: JSON.stringify(body.allergenes ?? []),
      tags: JSON.stringify(body.tags ?? []),
      ingredientsJson: body.ingredientsJson ?? "{}",
    },
  });

  return NextResponse.json(plat, { status: 201 });
}
