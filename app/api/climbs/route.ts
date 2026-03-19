import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { HoldRole } from '@prisma/client';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { wallVersionId, createdByUserId, name, setterGrade, notes, holds } = body;

  if (!wallVersionId || !createdByUserId || !name || !setterGrade || !Array.isArray(holds)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const versionHolds = await prisma.hold.findMany({ where: { wallVersionId } });

  const climb = await prisma.climb.create({
    data: {
      wallVersionId,
      createdByUserId,
      name,
      setterGrade,
      notes,
      holds: {
        create: holds
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

  return NextResponse.json({ id: climb.id });
}
