import { NextRequest, NextResponse } from "next/server";
import { first, run } from "@/db";
import { requireAuthenticatedUser } from "@/lib/auth";

async function ownedPlaylist(id: string, userId: string) {
  return first<{ id: string }>("SELECT id FROM playlists WHERE id = ? AND user_id = ?", id, userId);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { climbId } = await req.json() as { climbId?: string };
  if (!climbId || !await ownedPlaylist(id, user.id)) return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
  if (!await first<{ id: string }>("SELECT id FROM climbs WHERE id = ?", climbId)) return NextResponse.json({ error: "Climb not found." }, { status: 404 });
  await run("INSERT OR IGNORE INTO playlist_climbs (playlist_id, climb_id) VALUES (?, ?)", id, climbId);
  return NextResponse.json({ saved: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { climbId } = await req.json() as { climbId?: string };
  if (!climbId || !await ownedPlaylist(id, user.id)) return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
  await run("DELETE FROM playlist_climbs WHERE playlist_id = ? AND climb_id = ?", id, climbId);
  return NextResponse.json({ saved: false });
}
