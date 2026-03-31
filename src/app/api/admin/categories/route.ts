import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/categories
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId") ?? "demo-restaurant";

  const categories = await prisma.category.findMany({
    where: { restaurantId },
    orderBy: { ordre: "asc" },
  });

  return NextResponse.json(categories);
}

// POST /api/admin/categories
export async function POST(request: NextRequest) {
  const body = await request.json() as {
    nomJson: string;
    restaurantId?: string;
  };

  const restaurantId = body.restaurantId ?? "demo-restaurant";

  const maxOrdre = await prisma.category.aggregate({
    where: { restaurantId },
    _max: { ordre: true },
  });

  const plat = await prisma.category.create({
    data: {
      restaurantId,
      nomJson: body.nomJson,
      ordre: (maxOrdre._max.ordre ?? 0) + 1,
    },
  });

  return NextResponse.json(plat, { status: 201 });
}
