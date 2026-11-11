import { NextRequest, NextResponse } from "next/server";
import { first, run } from "@/db";
import { requireAuthenticatedUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json() as { name?: string };
  const cleanName = typeof name === "string" ? name.trim() : "";
  if (!cleanName || cleanName.length > 40) {
    return NextResponse.json({ error: "Playlist name must be between 1 and 40 characters." }, { status: 400 });
  }

  const duplicate = await first<{ id: string }>("SELECT id FROM playlists WHERE user_id = ? AND lower(name) = lower(?)", user.id, cleanName);
  if (duplicate) return NextResponse.json({ error: "You already have a playlist with that name." }, { status: 409 });

  const id = crypto.randomUUID();
  await run("INSERT INTO playlists (id, user_id, name) VALUES (?, ?, ?)", id, user.id, cleanName);
  return NextResponse.json({ id, name: cleanName, createdAt: new Date().toISOString(), climbIds: [] });
}
