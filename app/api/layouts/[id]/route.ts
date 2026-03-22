import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ChangeType, HoldStatus } from '@prisma/client';

async function requireAdmin(userId: string | null) {
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'admin') return null;
  return user;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { userId, name, notes, changeType, imageUrl, photoScale, photoOffsetX, photoOffsetY, photoRotation, holds } = body as {
    userId?: string;
    name?: string;
    notes?: string;
    changeType?: ChangeType;
    imageUrl?: string;
    photoScale?: number;
    photoOffsetX?: number;
    photoOffsetY?: number;
    photoRotation?: number;
    holds?: Array<{
      id?: string;
      canonicalHoldId: string;
      label: string;
      color?: string;
      x: number;
      y: number;
      status: HoldStatus;
    }>;
  };

  const admin = await requireAdmin(userId ?? null);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await prisma.wallVersion.findUnique({
    where: { id },
    include: { holds: true }
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.wallVersion.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        notes: notes ?? existing.notes,
        changeType: changeType ?? existing.changeType,
        imageUrl: imageUrl ?? existing.imageUrl,
        photoScale: typeof photoScale === 'number' ? photoScale : existing.photoScale,
        photoOffsetX: typeof photoOffsetX === 'number' ? photoOffsetX : existing.photoOffsetX,
        photoOffsetY: typeof photoOffsetY === 'number' ? photoOffsetY : existing.photoOffsetY,
        photoRotation: typeof photoRotation === 'number' ? photoRotation : existing.photoRotation
      }
    });

    if (!Array.isArray(holds)) return;

    const existingIds = new Set(existing.holds.map((hold) => hold.id));
    const incomingIds = new Set(holds.map((hold) => hold.id).filter((holdId): holdId is string => typeof holdId === 'string' && existingIds.has(holdId)));

    for (const hold of holds) {
      if (hold.id && existingIds.has(hold.id)) {
        await tx.hold.update({
          where: { id: hold.id },
          data: {
            canonicalHoldId: hold.canonicalHoldId,
            label: hold.label,
            color: hold.color ?? '#22c55e',
            x: hold.x,
            y: hold.y,
            status: hold.status
          }
        });
        continue;
      }

      await tx.hold.create({
        data: {
          wallVersionId: id,
          canonicalHoldId: hold.canonicalHoldId,
          label: hold.label,
          color: hold.color ?? '#22c55e',
          x: hold.x,
          y: hold.y,
          status: hold.status
        }
      });
    }

    const toDelete = existing.holds.filter((hold) => !incomingIds.has(hold.id)).map((hold) => hold.id);
    if (toDelete.length) {
      await tx.hold.deleteMany({ where: { id: { in: toDelete } } });
    }
  });

  const updated = await prisma.wallVersion.findUnique({
    where: { id },
    include: {
      holds: { orderBy: { createdAt: 'asc' } }
    }
  });

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    version: {
      id: updated.id,
      wallId: updated.wallId,
      parentVersionId: updated.parentVersionId ?? undefined,
      name: updated.name,
      changeType: updated.changeType,
      imageUrl: updated.imageUrl ?? '',
      photoScale: updated.photoScale,
      photoOffsetX: updated.photoOffsetX,
      photoOffsetY: updated.photoOffsetY,
      photoRotation: updated.photoRotation,
      notes: updated.notes ?? '',
      holds: updated.holds.map((hold) => ({
        id: hold.id,
        canonicalHoldId: hold.canonicalHoldId,
        label: hold.label,
        color: hold.color ?? '#22c55e',
        x: hold.x,
        y: hold.y,
        status: hold.status
      }))
    }
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = req.nextUrl.searchParams.get('userId');

  const admin = await requireAdmin(userId);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const layout = await prisma.wallVersion.findUnique({ where: { id } });
  if (!layout) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.wallVersion.updateMany({
      where: { parentVersionId: id },
      data: { parentVersionId: null }
    }),
    prisma.wallVersion.delete({ where: { id } })
  ]);

  return NextResponse.json({ ok: true });
}
