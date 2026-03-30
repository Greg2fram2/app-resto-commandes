import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tables?restaurantId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId") ?? "demo-restaurant";

  const tables = await prisma.table.findMany({
    where: { restaurantId },
    orderBy: { numero: "asc" },
    include: {
      sessions: {
        where: { statut: "ouverte" },
        include: {
          commandes: {
            include: {
              lignes: {
                include: { plat: true },
              },
            },
          },
        },
        take: 1,
      },
    },
  });

  return NextResponse.json(tables);
}

// POST /api/tables — create a new table
export async function POST(request: NextRequest) {
  const body = await request.json() as { restaurantId?: string; numero: string };
  const restaurantId = body.restaurantId ?? "demo-restaurant";

  const table = await prisma.table.create({
    data: {
      restaurantId,
      numero: body.numero,
    },
  });

  return NextResponse.json(table, { status: 201 });
}
