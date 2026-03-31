import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/admin/categories/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const count = await prisma.plat.count({ where: { categorieId: id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `Cette catégorie contient ${count} plat(s). Supprimez-les d'abord.` },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
