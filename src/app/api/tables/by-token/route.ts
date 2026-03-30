import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const table = await prisma.table.findUnique({
    where: { qrToken: token },
    select: { id: true, numero: true, statut: true },
  });

  if (!table) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(table);
}
