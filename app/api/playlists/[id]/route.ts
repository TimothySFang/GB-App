import { NextRequest, NextResponse } from "next/server";
import { first, run } from "@/db";
import { requireAuthenticatedUser } from "@/lib/auth";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const playlist = await first<{ id: string }>("SELECT id FROM playlists WHERE id = ? AND user_id = ?", id, user.id);
  if (!playlist) return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
  await run("DELETE FROM playlists WHERE id = ?", id);
  return NextResponse.json({ ok: true });
}
