import { env } from "cloudflare:workers";
import { all, first, getD1, run } from "@/db";
import type { ChangeType, HoldStatus, WallVersion } from "@/lib/types";

export type LayoutHoldPayload = {
  id?: string;
  canonicalHoldId: string;
  label: string;
  color?: string;
  x: number;
  y: number;
  status: HoldStatus;
};

type VersionRow = {
  id: string;
  wallId: string;
  parentVersionId: string | null;
  name: string;
  changeType: ChangeType;
  imageUrl: string | null;
  imageKey: string | null;
  photoScale: number;
  photoOffsetX: number;
  photoOffsetY: number;
  photoRotation: number;
  notes: string | null;
};

export async function getSerializedVersion(id: string): Promise<WallVersion | null> {
  const version = await first<VersionRow>(`SELECT id, wall_id AS wallId, parent_version_id AS parentVersionId,
    name, change_type AS changeType, image_url AS imageUrl, image_key AS imageKey,
    photo_scale AS photoScale, photo_offset_x AS photoOffsetX, photo_offset_y AS photoOffsetY,
    photo_rotation AS photoRotation, notes FROM wall_versions WHERE id = ?`, id);
  if (!version) return null;

  const holds = await all<{
    id: string;
    canonicalHoldId: string;
    label: string;
    color: string | null;
    x: number;
    y: number;
    status: HoldStatus;
  }>(`SELECT id, canonical_hold_id AS canonicalHoldId, label, color, x, y, status
    FROM holds WHERE wall_version_id = ? ORDER BY created_at`, id);

  return {
    id: version.id,
    wallId: version.wallId,
    parentVersionId: version.parentVersionId ?? undefined,
    name: version.name,
    changeType: version.changeType,
    imageUrl: version.imageKey ? `/api/versions/${version.id}/image` : (version.imageUrl ?? ""),
    photoScale: version.photoScale,
    photoOffsetX: version.photoOffsetX,
    photoOffsetY: version.photoOffsetY,
    photoRotation: version.photoRotation,
    notes: version.notes ?? "",
    holds: holds.map((hold) => ({ ...hold, color: hold.color ?? "#22c55e" })),
  };
}

export async function persistVersionImage(versionId: string, imageUrl: string) {
  if (imageUrl.startsWith("data:")) {
    if (!env.BUCKET) throw new Error("Cloudflare R2 binding `BUCKET` is unavailable.");
    const match = /^data:([^;,]+);base64,(.+)$/.exec(imageUrl);
    if (!match) throw new Error("Unsupported image data");
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const key = `wall-versions/${versionId}/${crypto.randomUUID()}`;
    await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: match[1] } });
    await run(
      "UPDATE wall_versions SET image_key = ?, image_content_type = ?, image_url = NULL WHERE id = ?",
      key,
      match[1],
      versionId,
    );
    return;
  }

  const sourceMatch = /^\/api\/versions\/([^/]+)\/image$/.exec(imageUrl);
  if (sourceMatch) {
    const source = await first<{ imageKey: string | null; contentType: string | null; imageUrl: string | null }>(
      "SELECT image_key AS imageKey, image_content_type AS contentType, image_url AS imageUrl FROM wall_versions WHERE id = ?",
      sourceMatch[1],
    );
    if (source?.imageKey) {
      await run(
        "UPDATE wall_versions SET image_key = ?, image_content_type = ?, image_url = NULL WHERE id = ?",
        source.imageKey,
        source.contentType,
        versionId,
      );
      return;
    }
    if (source?.imageUrl) imageUrl = source.imageUrl;
  }

  await run(
    "UPDATE wall_versions SET image_url = ?, image_key = NULL, image_content_type = NULL WHERE id = ?",
    imageUrl || null,
    versionId,
  );
}

export async function replaceVersionHolds(versionId: string, incoming: LayoutHoldPayload[]) {
  const existing = await all<{ id: string }>("SELECT id FROM holds WHERE wall_version_id = ?", versionId);
  const existingIds = new Set(existing.map((item) => item.id));
  const incomingExistingIds = new Set(incoming.flatMap((hold) => hold.id && existingIds.has(hold.id) ? [hold.id] : []));
  const db = getD1();
  const statements: D1PreparedStatement[] = [];

  for (const hold of incoming) {
    if (hold.id && existingIds.has(hold.id)) {
      statements.push(db.prepare(`UPDATE holds SET canonical_hold_id = ?, label = ?, color = ?, x = ?, y = ?, status = ? WHERE id = ?`)
        .bind(hold.canonicalHoldId, hold.label, hold.color ?? "#22c55e", hold.x, hold.y, hold.status, hold.id));
    } else {
      statements.push(db.prepare(`INSERT INTO holds
        (id, canonical_hold_id, wall_version_id, label, color, x, y, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(crypto.randomUUID(), hold.canonicalHoldId, versionId, hold.label, hold.color ?? "#22c55e", hold.x, hold.y, hold.status));
    }
  }

  const toDelete = existing.filter((hold) => !incomingExistingIds.has(hold.id));
  for (const hold of toDelete) statements.push(db.prepare("DELETE FROM holds WHERE id = ?").bind(hold.id));
  if (statements.length) await db.batch(statements);
}
