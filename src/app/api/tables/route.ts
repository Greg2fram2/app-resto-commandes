import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tables?restaurantId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId") ?? "demo-restaurant";

  const tables = await prisma.table.findMany({
    where: { restaurantId },
    include: {
      sessions: {
        where: { statut: "ouverte" },
        orderBy: { createdAt: "desc" },
        include: {
          commandes: {
            orderBy: { createdAt: "asc" },
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

  // Sort numerically where possible, then alphabetically for named tables
  tables.sort((a, b) => {
    const na = parseInt(a.numero, 10);
    const nb = parseInt(b.numero, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    if (!isNaN(na)) return -1;
    if (!isNaN(nb)) return 1;
    return a.numero.localeCompare(b.numero);
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
