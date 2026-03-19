import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, stars } = await req.json();
  if (!userId || typeof stars !== 'number') return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  await prisma.climbRating.upsert({
    where: { climbId_userId: { climbId: id, userId } },
    update: { stars },
    create: { climbId: id, userId, stars }
  });

  return NextResponse.json({ ok: true });
}
