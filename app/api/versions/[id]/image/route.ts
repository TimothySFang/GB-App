import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { first } from "@/db";
import { isAdmin, requireAuthenticatedUser } from "@/lib/auth";
import { getSerializedVersion, persistVersionImage } from "@/lib/site-data";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const version = await first<{ imageKey: string | null; imageUrl: string | null; contentType: string | null }>(
    "SELECT image_key AS imageKey, image_url AS imageUrl, image_content_type AS contentType FROM wall_versions WHERE id = ?",
    id,
  );
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!version.imageKey) {
    if (version.imageUrl) return NextResponse.redirect(version.imageUrl);
    return NextResponse.json({ error: "No image" }, { status: 404 });
  }
  if (!env.BUCKET) return NextResponse.json({ error: "Image storage unavailable" }, { status: 503 });
  const object = await env.BUCKET.get(version.imageKey);
  if (!object) return NextResponse.json({ error: "No image" }, { status: 404 });
  return new NextResponse(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? version.contentType ?? "application/octet-stream",
      "Cache-Control": "private, no-cache",
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { imageUrl } = await req.json() as { imageUrl?: string };
  if (!imageUrl || typeof imageUrl !== "string") return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
  await persistVersionImage(id, imageUrl);
  const version = await getSerializedVersion(id);
  return NextResponse.json({ ok: true, imageUrl: version?.imageUrl });
}
