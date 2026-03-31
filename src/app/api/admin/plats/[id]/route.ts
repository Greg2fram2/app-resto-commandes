import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as Partial<{
    nomJson: string;
    descriptionJson: string;
    prix: number;
    photoUrl: string;
    disponible: boolean;
    typeService: string;
    allergenes: string[];
    tags: string[];
    ingredientsJson: string;
    ordre: number;
  }>;

  const data: Record<string, unknown> = {};
  if (body.nomJson !== undefined) data.nomJson = body.nomJson;
  if (body.descriptionJson !== undefined) data.descriptionJson = body.descriptionJson;
  if (body.prix !== undefined) data.prix = body.prix;
  if (body.photoUrl !== undefined) data.photoUrl = body.photoUrl;
  if (body.disponible !== undefined) data.disponible = body.disponible;
  if (body.typeService !== undefined) data.typeService = body.typeService;
  if (body.allergenes !== undefined) data.allergenes = JSON.stringify(body.allergenes);
  if (body.tags !== undefined) data.tags = JSON.stringify(body.tags);
  if (body.ingredientsJson !== undefined) data.ingredientsJson = body.ingredientsJson;
  if (body.ordre !== undefined) data.ordre = body.ordre;

  const plat = await prisma.plat.update({
    where: { id },
    data,
  });

  return NextResponse.json(plat);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const orderCount = await prisma.ligneCommande.count({ where: { platId: id } });
  if (orderCount > 0) {
    return NextResponse.json(
      { error: "Ce plat a des commandes associées. Marquez-le indisponible plutôt que de le supprimer." },
      { status: 409 }
    );
  }

  await prisma.plat.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
