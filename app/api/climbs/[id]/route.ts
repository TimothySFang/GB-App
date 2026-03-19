import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { HoldRole } from '@prisma/client';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { wallVersionId, userId, name, setterGrade, notes, holds } = body;

  const existing = await prisma.climb.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.createdByUserId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const versionHolds = await prisma.hold.findMany({ where: { wallVersionId } });

  await prisma.climb.update({
    where: { id: params.id },
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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.nextUrl.searchParams.get('userId');
  const existing = await prisma.climb.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.createdByUserId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.climb.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
