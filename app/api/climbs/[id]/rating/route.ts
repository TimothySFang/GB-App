import { NextRequest, NextResponse } from "next/server";
import { run } from "@/db";
import { requireAuthenticatedUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { stars } = await req.json() as { stars?: number };
  if (typeof stars !== "number" || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "Rating must be from 1 to 5" }, { status: 400 });
  }
  await run(`INSERT INTO climb_ratings (climb_id, user_id, stars) VALUES (?, ?, ?)
    ON CONFLICT(climb_id, user_id) DO UPDATE SET stars = excluded.stars`, id, user.id, stars);
  return NextResponse.json({ ok: true });
}
