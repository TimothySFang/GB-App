import { climbHoldStatements, validClimbHolds } from "@/lib/climb-holds";
import { NextRequest, NextResponse } from "next/server";
import { first, getD1 } from "@/db";
import { requireAuthenticatedUser } from "@/lib/auth";
import type { ClimbHold } from "@/lib/types";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await first<{ createdByUserId: string; usesFootboard: number }>("SELECT created_by_user_id AS createdByUserId, uses_footboard AS usesFootboard FROM climbs WHERE id = ?", id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.createdByUserId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { wallVersionId, name, setterGrade, usesFootboard, notes, holds } = await req.json() as {
    wallVersionId?: string;
    name?: string;
    setterGrade?: string;
    usesFootboard?: boolean;
    notes?: string;
    holds?: ClimbHold[];
  };
  if (!wallVersionId || typeof name !== 'string' || !name.trim() || !validClimbHolds(holds)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (!await first('SELECT id FROM wall_versions WHERE id = ?', wallVersionId)) {
    return NextResponse.json({ error: 'Layout not found' }, { status: 400 });
  }

  const db = getD1();
  let holdStatements: D1PreparedStatement[];
  try { holdStatements = await climbHoldStatements(db, id, wallVersionId, holds); }
  catch { return NextResponse.json({ error: 'Selected holds could not be resolved' }, { status: 400 }); }
  await db.batch([
    db.prepare(`UPDATE climbs SET wall_version_id = ?, name = ?, setter_grade = ?, uses_footboard = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(wallVersionId, name.trim(), setterGrade?.trim() || null, typeof usesFootboard === "boolean" ? (usesFootboard ? 1 : 0) : existing.usesFootboard, notes ?? "", id),
    db.prepare("DELETE FROM climb_holds WHERE climb_id = ?").bind(id),
    db.prepare("DELETE FROM climb_markers WHERE climb_id = ?").bind(id),
    ...holdStatements,
  ]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await first<{ createdByUserId: string }>("SELECT created_by_user_id AS createdByUserId FROM climbs WHERE id = ?", id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.createdByUserId !== user.id && user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await getD1().prepare("DELETE FROM climbs WHERE id = ?").bind(id).run();
  return NextResponse.json({ ok: true });
}
