import { NextRequest, NextResponse } from "next/server";
import { first, getD1 } from "@/db";
import { requireAuthenticatedUser } from "@/lib/auth";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: climbId } = await params;
  const climb = await first<{ id: string }>("SELECT id FROM climbs WHERE id = ?", climbId);
  if (!climb) return NextResponse.json({ error: "Climb not found" }, { status: 404 });

  const repeat = {
    id: crypto.randomUUID(),
    userId: user.id,
    repeatedAt: new Date().toISOString(),
  };
  await getD1().prepare(
    "INSERT INTO climb_repeats (id, climb_id, user_id, repeated_at) VALUES (?, ?, ?, ?)",
  ).bind(repeat.id, climbId, repeat.userId, repeat.repeatedAt).run();

  return NextResponse.json({ repeat });
}
