import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBus } from "@/lib/sse";

// Simple in-process idempotency cache (24h TTL)
// Works for single-process SQLite deployments; replace with Redis for multi-process
const idempotencyCache = new Map<string, { commandeId: string; at: number }>();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

function pruneIdempotencyCache() {
  const now = Date.now();
  for (const [key, val] of idempotencyCache) {
    if (now - val.at > IDEMPOTENCY_TTL_MS) idempotencyCache.delete(key);
  }
}

// POST /api/orders — place an order
export async function POST(request: NextRequest) {
  const body = await request.json() as {
    tableToken: string;
    items: { platId: string; quantite: number; notes?: string }[];
    locale?: string;
    idempotencyKey?: string;
  };

  // Dedup check
  if (body.idempotencyKey) {
    pruneIdempotencyCache();
    const cached = idempotencyCache.get(body.idempotencyKey);
    if (cached) {
      return NextResponse.json({ id: cached.commandeId, deduplicated: true }, { status: 200 });
    }
  }

  const table = await prisma.table.findUnique({
    where: { qrToken: body.tableToken },
    include: { restaurant: true },
  });

  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  if (table.statut !== "occupee") {
    return NextResponse.json(
      { error: "Table not open. Please wait for a waiter to open your table." },
      { status: 403 }
    );
  }

  // Find active session
  const session = await prisma.session.findFirst({
    where: { tableId: table.id, statut: "ouverte" },
  });

  if (!session) {
    return NextResponse.json({ error: "No active session for this table" }, { status: 403 });
  }

  // Fetch plats to determine service type ordering
  const platIds = body.items.map((i) => i.platId);
  const plats = await prisma.plat.findMany({ where: { id: { in: platIds } } });
  const platMap = new Map(plats.map((p) => [p.id, p]));

  // Determine service number for each item based on typeService
  const serviceOrder: Record<string, number> = {
    entree: 1,
    boisson: 1,
    plat: 2,
    dessert: 3,
    autre: 2,
  };

  const restaurantMode = table.restaurant.serviceMode;

  const lignes = body.items.map((item) => {
    const plat = platMap.get(item.platId);
    const numeroService = plat ? (serviceOrder[plat.typeService] ?? 2) : 2;
    // In sequential mode: only first service (1) goes directly to "a_lancer"
    // In simultaneous mode: everything goes to "a_lancer"
    const statut =
      restaurantMode === "simultaneous" || numeroService === 1
        ? "a_lancer"
        : "en_attente";

    return {
      platId: item.platId,
      quantite: item.quantite,
      notes: item.notes,
      numeroService,
      statut,
    };
  });

  const commande = await prisma.commande.create({
    data: {
      sessionId: session.id,
      lignes: {
        create: lignes,
      },
    },
    include: {
      lignes: {
        include: { plat: true },
      },
    },
  });

  // Cache idempotency key to prevent duplicate submissions
  if (body.idempotencyKey) {
    idempotencyCache.set(body.idempotencyKey, { commandeId: commande.id, at: Date.now() });
  }

  // Broadcast to SSE clients (kitchen + staff)
  sseBus.broadcast(table.restaurantId, "new-order", {
    commandeId: commande.id,
    tableNumero: table.numero,
    tableId: table.id,
    lignes: commande.lignes.map((l) => ({
      id: l.id,
      quantite: l.quantite,
      statut: l.statut,
      numeroService: l.numeroService,
      platNomJson: l.plat.nomJson,
      notes: l.notes,
    })),
  });

  return NextResponse.json(commande, { status: 201 });
}

// GET /api/orders?sessionId=xxx or ?tableId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const tableId = searchParams.get("tableId");
  const restaurantId = searchParams.get("restaurantId") ?? "demo-restaurant";
  const status = searchParams.get("status"); // "a_lancer" for kitchen view

  if (sessionId) {
    const commandes = await prisma.commande.findMany({
      where: { sessionId },
      include: {
        lignes: { include: { plat: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(commandes);
  }

  if (tableId) {
    const session = await prisma.session.findFirst({
      where: { tableId, statut: "ouverte" },
    });
    if (!session) return NextResponse.json([]);

    const commandes = await prisma.commande.findMany({
      where: { sessionId: session.id },
      include: { lignes: { include: { plat: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(commandes);
  }

  // Kitchen view: get all "a_lancer" lines grouped by table
  if (status === "a_lancer") {
    const tables = await prisma.table.findMany({
      where: { restaurantId },
      include: {
        sessions: {
          where: { statut: "ouverte" },
          include: {
            commandes: {
              include: {
                lignes: {
                  where: { statut: "a_lancer" },
                  include: { plat: true },
                  orderBy: { createdAt: "asc" },
                },
              },
            },
          },
        },
      },
    });

    const result = tables
      .map((table) => {
        const lignes = table.sessions.flatMap((s) =>
          s.commandes.flatMap((c) => c.lignes)
        );
        if (lignes.length === 0) return null;
        return {
          tableId: table.id,
          tableNumero: table.numero,
          lignes: lignes.map((l) => ({
            id: l.id,
            quantite: l.quantite,
            statut: l.statut,
            createdAt: l.createdAt,
            platNomJson: l.plat.nomJson,
            notes: l.notes,
          })),
          firstOrderAt: lignes[0]?.createdAt,
        };
      })
      .filter(Boolean);

    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Missing query param" }, { status: 400 });
}
