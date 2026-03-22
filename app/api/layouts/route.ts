import { NextRequest, NextResponse } from 'next/server';
import { ChangeType, HoldStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, isAdmin } from '@/lib/auth';

type LayoutHoldPayload = {
  canonicalHoldId: string;
  label: string;
  color?: string;
  x: number;
  y: number;
  status: HoldStatus;
};

function serializeVersion(version: {
  id: string;
  wallId: string;
  parentVersionId: string | null;
  name: string;
  changeType: ChangeType;
  imageUrl: string | null;
  photoScale: number;
  photoOffsetX: number;
  photoOffsetY: number;
  photoRotation: number;
  notes: string | null;
  holds: Array<{
    id: string;
    canonicalHoldId: string;
    label: string;
    color: string | null;
    x: number;
    y: number;
    status: HoldStatus;
  }>;
}) {
  return {
    id: version.id,
    wallId: version.wallId,
    parentVersionId: version.parentVersionId ?? undefined,
    name: version.name,
    changeType: version.changeType,
    imageUrl: version.imageUrl ?? '',
    photoScale: version.photoScale,
    photoOffsetX: version.photoOffsetX,
    photoOffsetY: version.photoOffsetY,
    photoRotation: version.photoRotation,
    notes: version.notes ?? '',
    holds: version.holds.map((hold) => ({
      id: hold.id,
      canonicalHoldId: hold.canonicalHoldId,
      label: hold.label,
      color: hold.color ?? '#22c55e',
      x: hold.x,
      y: hold.y,
      status: hold.status
    }))
  };
}

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { wallId, parentVersionId, name, changeType, imageUrl, photoScale, photoOffsetX, photoOffsetY, photoRotation, notes, holds } = body as {
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

  if (!wallId || !name || !changeType || !Array.isArray(holds)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const created = await prisma.wallVersion.create({
    data: {
      wallId,
      parentVersionId: parentVersionId ?? null,
      name,
      changeType,
      imageUrl: imageUrl ?? '',
      photoScale: typeof photoScale === 'number' ? photoScale : 1,
      photoOffsetX: typeof photoOffsetX === 'number' ? photoOffsetX : 0,
      photoOffsetY: typeof photoOffsetY === 'number' ? photoOffsetY : 0,
      photoRotation: typeof photoRotation === 'number' ? photoRotation : 0,
      notes: notes ?? '',
      holds: {
        create: holds.map((hold) => ({
          canonicalHoldId: hold.canonicalHoldId,
          label: hold.label,
          color: hold.color ?? '#22c55e',
          x: hold.x,
          y: hold.y,
          status: hold.status
        }))
      }
    },
    include: {
      holds: { orderBy: { createdAt: 'asc' } }
    }
  });

  return NextResponse.json({ version: serializeVersion(created) });
}
