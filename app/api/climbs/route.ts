import { NextRequest, NextResponse } from "next/server";
import { getD1, all } from "@/db";
import { requireAuthenticatedUser } from "@/lib/auth";
import type { HoldRole } from "@/lib/types";

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { wallVersionId, name, setterGrade, notes, holds } = await req.json() as {
    wallVersionId?: string;
    name?: string;
    setterGrade?: string;
    notes?: string;
    holds?: Array<{ holdId: string; role: HoldRole; order: number }>;
  };
  if (!wallVersionId || !name || !setterGrade || !Array.isArray(holds) || !holds.length) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const versionHolds = await all<{ id: string; canonicalHoldId: string }>(
    "SELECT id, canonical_hold_id AS canonicalHoldId FROM holds WHERE wall_version_id = ?",
    wallVersionId,
  );
  const resolved = holds.map((ref) => ({
    ref,
    hold: versionHolds.find((item) => item.canonicalHoldId === ref.holdId),
  }));
  if (resolved.some((item: { hold?: { id: string } }) => !item.hold)) {
    return NextResponse.json({ error: "One or more selected holds are no longer saved on this layout" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const db = getD1();
  await db.batch([
    db.prepare(`INSERT INTO climbs (id, wall_version_id, created_by_user_id, name, setter_grade, notes)
      VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(id, wallVersionId, user.id, name.trim(), setterGrade, notes ?? ""),
    ...resolved.map((item) =>
      db.prepare("INSERT INTO climb_holds (id, climb_id, hold_id, role, order_index) VALUES (?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), id, item.hold!.id, item.ref.role, item.ref.order)),
  ]);
  return NextResponse.json({ id });
}
