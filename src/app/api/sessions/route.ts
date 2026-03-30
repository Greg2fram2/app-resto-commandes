import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBus } from "@/lib/sse";

// POST /api/sessions — open a table session
export async function POST(request: NextRequest) {
  const body = await request.json() as { tableId: string; ouvertePar?: string };

  const table = await prisma.table.findUnique({ where: { id: body.tableId } });
  if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

  // Close any existing open session
  await prisma.session.updateMany({
    where: { tableId: body.tableId, statut: "ouverte" },
    data: { statut: "terminee", closedAt: new Date() },
  });

  // Open new session
  const session = await prisma.session.create({
    data: {
      tableId: body.tableId,
      ouvertePar: body.ouvertePar,
    },
  });

  // Mark table as occupied
  await prisma.table.update({
    where: { id: body.tableId },
    data: { statut: "occupee" },
  });

  sseBus.broadcast(table.restaurantId, "table-opened", {
    tableId: body.tableId,
    sessionId: session.id,
    tableNumero: table.numero,
  });

  return NextResponse.json(session, { status: 201 });
}

// DELETE /api/sessions?sessionId=xxx — close a session
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { table: true },
  });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  await prisma.session.update({
    where: { id: sessionId },
    data: { statut: "terminee", closedAt: new Date() },
  });

  await prisma.table.update({
    where: { id: session.tableId },
    data: { statut: "libre" },
  });

  sseBus.broadcast(session.table.restaurantId, "table-closed", {
    tableId: session.tableId,
    sessionId,
  });

  return NextResponse.json({ ok: true });
}
