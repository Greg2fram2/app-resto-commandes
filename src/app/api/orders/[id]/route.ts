import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBus } from "@/lib/sse";

// PATCH /api/orders/[id] — update ligne statut
// body: { ligneId: string, statut: string } or { action: "envoyer-suite", sessionId: string }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as {
    ligneId?: string;
    statut?: string;
    action?: string;
    sessionId?: string;
  };

  if (body.action === "envoyer-suite" && body.sessionId) {
    // Find next service number and advance those lines
    const nextPending = await prisma.ligneCommande.findFirst({
      where: {
        commande: { sessionId: body.sessionId },
        statut: "en_attente",
      },
      orderBy: { numeroService: "asc" },
    });

    if (!nextPending) {
      return NextResponse.json({ error: "No pending items" }, { status: 400 });
    }

    const updated = await prisma.ligneCommande.updateMany({
      where: {
        commande: { sessionId: body.sessionId },
        statut: "en_attente",
        numeroService: nextPending.numeroService,
      },
      data: { statut: "a_lancer" },
    });

    // Get table info for SSE broadcast
    const session = await prisma.session.findUnique({
      where: { id: body.sessionId },
      include: {
        table: {
          include: { restaurant: true },
        },
      },
    });

    if (session) {
      const newLines = await prisma.ligneCommande.findMany({
        where: {
          commande: { sessionId: body.sessionId },
          statut: "a_lancer",
          numeroService: nextPending.numeroService,
        },
        include: { plat: true },
      });

      sseBus.broadcast(session.table.restaurantId, "lines-updated", {
        action: "envoyer-suite",
        tableId: session.tableId,
        tableNumero: session.table.numero,
        lignes: newLines.map((l) => ({
          id: l.id,
          quantite: l.quantite,
          statut: l.statut,
          platNomJson: l.plat.nomJson,
        })),
      });
    }

    return NextResponse.json({ updated: updated.count });
  }

  if (body.ligneId && body.statut) {
    const ligne = await prisma.ligneCommande.update({
      where: { id: body.ligneId },
      data: { statut: body.statut },
      include: {
        commande: {
          include: {
            session: {
              include: {
                table: { include: { restaurant: true } },
              },
            },
          },
        },
        plat: true,
      },
    });

    sseBus.broadcast(ligne.commande.session.table.restaurantId, "line-status-changed", {
      ligneId: ligne.id,
      statut: ligne.statut,
      tableId: ligne.commande.session.tableId,
      tableNumero: ligne.commande.session.table.numero,
      platNomJson: ligne.plat.nomJson,
    });

    return NextResponse.json(ligne);
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
