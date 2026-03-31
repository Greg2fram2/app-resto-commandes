import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/restaurant
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId") ?? "demo-restaurant";

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(restaurant);
}

// PATCH /api/admin/restaurant
export async function PATCH(request: NextRequest) {
  const body = await request.json() as {
    restaurantId?: string;
    nom?: string;
    serviceMode?: string;
    langues?: string;
  };

  const restaurantId = body.restaurantId ?? "demo-restaurant";
  const data: Record<string, string> = {};
  if (body.nom !== undefined) data.nom = body.nom;
  if (body.serviceMode !== undefined) data.serviceMode = body.serviceMode;
  if (body.langues !== undefined) data.langues = body.langues;

  const updated = await prisma.restaurant.update({
    where: { id: restaurantId },
    data,
  });

  return NextResponse.json(updated);
}
