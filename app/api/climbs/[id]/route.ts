import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HoldRole } from '@prisma/client';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { wallVersionId, name, setterGrade, notes, holds } = body;

  if (!wallVersionId || !name || !setterGrade || !Array.isArray(holds)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const existing = await prisma.climb.findUnique({ where: { id: id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.createdByUserId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const versionHolds = await prisma.hold.findMany({ where: { wallVersionId } });
  if (!versionHolds.length) {
    return NextResponse.json({ error: 'Selected layout has no saved holds yet' }, { status: 400 });
  }

  const holdCreates = holds
    .map((ref: { holdId: string; role: HoldRole; order: number }) => {
      const hold = versionHolds.find((item) => item.canonicalHoldId === ref.holdId);
      if (!hold) return null;
      return {
        holdId: hold.id,
        role: ref.role,
        orderIndex: ref.order
      };
    })
    .filter(Boolean) as { holdId: string; role: HoldRole; orderIndex: number }[];

  if (!holdCreates.length || holdCreates.length !== holds.length) {
    return NextResponse.json({ error: 'One or more selected holds are no longer saved on this layout' }, { status: 400 });
  }

  await prisma.climb.update({
    where: { id: id },
    data: {
      wallVersionId,
      name,
      setterGrade,
      notes,
      holds: {
        deleteMany: {},
        create: holdCreates
      }
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.climb.findUnique({ where: { id: id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.createdByUserId !== user.id && user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.climb.delete({ where: { id: id } });
  return NextResponse.json({ ok: true });
}
