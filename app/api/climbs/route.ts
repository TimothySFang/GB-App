import { climbHoldStatements, validClimbHolds } from "@/lib/climb-holds";
import { NextRequest, NextResponse } from "next/server";
import { getD1, first } from "@/db";
import { requireAuthenticatedUser } from "@/lib/auth";
import type { ClimbHold } from "@/lib/types";
import { defaultClimbName } from "@/lib/climb-name";

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { wallVersionId, name, setterGrade, notes, holds } = await req.json() as {
    wallVersionId?: string;
    name?: string;
    setterGrade?: string;
    notes?: string;
    holds?: ClimbHold[];
  };
  if (!wallVersionId || (name != null && typeof name !== 'string') || !validClimbHolds(holds)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!await first('SELECT id FROM wall_versions WHERE id = ?', wallVersionId)) {
    return NextResponse.json({ error: 'Layout not found' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const climbName = name?.trim() || defaultClimbName(user.displayName, id);
  const db = getD1();
  let holdStatements: D1PreparedStatement[];
  try { holdStatements = await climbHoldStatements(db, id, wallVersionId, holds); }
  catch { return NextResponse.json({ error: 'Selected holds could not be resolved' }, { status: 400 }); }
  await db.batch([
    db.prepare(`INSERT INTO climbs (id, wall_version_id, created_by_user_id, name, setter_grade, notes)
      VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(id, wallVersionId, user.id, climbName, setterGrade?.trim() || null, notes ?? ""),
    ...holdStatements,
  ]);
  return NextResponse.json({ id, name: climbName });
}
