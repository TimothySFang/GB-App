import { NextRequest, NextResponse } from "next/server";
import { all, first, getD1 } from "@/db";
import { requireAuthenticatedUser } from "@/lib/auth";
import type { HoldRole } from "@/lib/types";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await first<{ createdByUserId: string }>("SELECT created_by_user_id AS createdByUserId FROM climbs WHERE id = ?", id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.createdByUserId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { wallVersionId, name, setterGrade, notes, holds } = await req.json() as {
    wallVersionId?: string;
    name?: string;
    setterGrade?: string;
    notes?: string;
    holds?: Array<{ holdId: string; role: HoldRole; order: number }>;
  };
  if (!wallVersionId || !name || !Array.isArray(holds) || !holds.length) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const versionHolds = await all<{ id: string; canonicalHoldId: string }>(
    "SELECT id, canonical_hold_id AS canonicalHoldId FROM holds WHERE wall_version_id = ?",
    wallVersionId,
  );
  const resolved = holds.map((ref) => ({ ref, hold: versionHolds.find((item) => item.canonicalHoldId === ref.holdId) }));
  if (resolved.some((item: { hold?: { id: string } }) => !item.hold)) {
    return NextResponse.json({ error: "One or more selected holds are no longer saved on this layout" }, { status: 400 });
  }

  const db = getD1();
  await db.batch([
    db.prepare(`UPDATE climbs SET wall_version_id = ?, name = ?, setter_grade = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(wallVersionId, name.trim(), setterGrade?.trim() || null, notes ?? "", id),
    db.prepare("DELETE FROM climb_holds WHERE climb_id = ?").bind(id),
    ...resolved.map((item) =>
      db.prepare("INSERT INTO climb_holds (id, climb_id, hold_id, role, order_index) VALUES (?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), id, item.hold!.id, item.ref.role, item.ref.order)),
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
