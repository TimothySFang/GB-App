import { NextRequest, NextResponse } from "next/server";
import { getD1 } from "@/db";
import { isAdmin, requireAuthenticatedUser } from "@/lib/auth";
import { getSerializedVersion, persistVersionImage, type LayoutHoldPayload } from "@/lib/site-data";
import type { ChangeType } from "@/lib/types";

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    wallId?: string;
    parentVersionId?: string;
    name?: string;
    changeType?: ChangeType;
    imageUrl?: string;
    photoScale?: number;
    photoOffsetX?: number;
    photoOffsetY?: number;
    photoRotation?: number;
    notes?: string;
    holds?: LayoutHoldPayload[];
  };
  if (!body.wallId || !body.name || !body.changeType || !Array.isArray(body.holds)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const db = getD1();
  await db.batch([
    db.prepare(`INSERT INTO wall_versions
      (id, wall_id, parent_version_id, name, change_type, image_url, photo_scale, photo_offset_x, photo_offset_y, photo_rotation, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, body.wallId, body.parentVersionId ?? null, body.name.trim(), body.changeType, "", body.photoScale ?? 1, body.photoOffsetX ?? 0, body.photoOffsetY ?? 0, body.photoRotation ?? 0, body.notes ?? ""),
    ...body.holds.map((hold) => db.prepare(`INSERT INTO holds
      (id, canonical_hold_id, wall_version_id, label, color, x, y, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), hold.canonicalHoldId, id, hold.label, hold.color ?? "#22c55e", hold.x, hold.y, hold.status)),
  ]);
  if (body.imageUrl) await persistVersionImage(id, body.imageUrl);
  const version = await getSerializedVersion(id);
  return NextResponse.json({ version });
}
