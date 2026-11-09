import { NextRequest, NextResponse } from "next/server";
import { first, getD1, run } from "@/db";
import { isAdmin, requireAuthenticatedUser } from "@/lib/auth";
import { getSerializedVersion, persistVersionImage, replaceVersionHolds, type LayoutHoldPayload } from "@/lib/site-data";
import type { ChangeType } from "@/lib/types";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const existing = await first<{ id: string }>("SELECT id FROM wall_versions WHERE id = ?", id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as {
    name?: string;
    notes?: string;
    changeType?: ChangeType;
    imageUrl?: string;
    photoScale?: number;
    photoOffsetX?: number;
    photoOffsetY?: number;
    photoRotation?: number;
    holds?: LayoutHoldPayload[];
  };
  await run(`UPDATE wall_versions SET
    name = COALESCE(?, name), notes = COALESCE(?, notes), change_type = COALESCE(?, change_type),
    photo_scale = COALESCE(?, photo_scale), photo_offset_x = COALESCE(?, photo_offset_x),
    photo_offset_y = COALESCE(?, photo_offset_y), photo_rotation = COALESCE(?, photo_rotation)
    WHERE id = ?`,
  body.name ?? null, body.notes ?? null, body.changeType ?? null, body.photoScale ?? null,
  body.photoOffsetX ?? null, body.photoOffsetY ?? null, body.photoRotation ?? null, id);

  if (Array.isArray(body.holds)) await replaceVersionHolds(id, body.holds);
  if (typeof body.imageUrl === "string") await persistVersionImage(id, body.imageUrl);
  const version = await getSerializedVersion(id);
  return NextResponse.json({ version });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const existing = await first<{ id: string }>("SELECT id FROM wall_versions WHERE id = ?", id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const db = getD1();
  await db.batch([
    db.prepare("UPDATE wall_versions SET parent_version_id = NULL WHERE parent_version_id = ?").bind(id),
    db.prepare("DELETE FROM wall_versions WHERE id = ?").bind(id),
  ]);
  return NextResponse.json({ ok: true });
}
