import { NextRequest, NextResponse } from "next/server";
import { getD1 } from "@/db";
import { requireAuthenticatedUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { grade } = await req.json() as { grade?: string };
  if (!grade || typeof grade !== "string") return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const db = getD1();
  await db.batch([
    db.prepare(`INSERT INTO climb_sends (climb_id, user_id, grade, sent_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(climb_id, user_id) DO UPDATE SET grade = excluded.grade, sent_at = CURRENT_TIMESTAMP`).bind(id, user.id, grade),
    db.prepare(`INSERT INTO climb_grade_votes (climb_id, user_id, suggested_grade) VALUES (?, ?, ?)
      ON CONFLICT(climb_id, user_id) DO UPDATE SET suggested_grade = excluded.suggested_grade`).bind(id, user.id, grade),
  ]);
  return NextResponse.json({ ok: true });
}
