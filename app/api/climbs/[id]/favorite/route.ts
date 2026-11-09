import { NextRequest, NextResponse } from "next/server";
import { first, run } from "@/db";
import { requireAuthenticatedUser } from "@/lib/auth";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await first<{ climbId: string }>("SELECT climb_id AS climbId FROM favorites WHERE climb_id = ? AND user_id = ?", id, user.id);
  if (existing) {
    await run("DELETE FROM favorites WHERE climb_id = ? AND user_id = ?", id, user.id);
    return NextResponse.json({ favorited: false });
  }
  await run("INSERT INTO favorites (climb_id, user_id) VALUES (?, ?)", id, user.id);
  return NextResponse.json({ favorited: true });
}
