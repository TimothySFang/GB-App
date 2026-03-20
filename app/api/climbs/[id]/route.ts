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

  const existing = await prisma.climb.findUnique({ where: { id: id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.createdByUserId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const versionHolds = await prisma.hold.findMany({ where: { wallVersionId } });

  await prisma.climb.update({
    where: { id: id },
    data: {
      wallVersionId,
      name,
      setterGrade,
      notes,
      holds: {
        deleteMany: {},
        create: (holds ?? [])
          .map((ref: { holdId: string; role: HoldRole; order: number }) => {
            const hold = versionHolds.find((item) => item.canonicalHoldId === ref.holdId);
            if (!hold) return null;
            return {
              holdId: hold.id,
              role: ref.role,
              orderIndex: ref.order
            };
          })
          .filter(Boolean) as { holdId: string; role: HoldRole; orderIndex: number }[]
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
  if (existing.createdByUserId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.climb.delete({ where: { id: id } });
  return NextResponse.json({ ok: true });
}
