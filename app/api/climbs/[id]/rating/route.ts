import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, stars } = await req.json();
  if (!userId || typeof stars !== 'number') return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  await prisma.climbRating.upsert({
    where: { climbId_userId: { climbId: params.id, userId } },
    update: { stars },
    create: { climbId: params.id, userId, stars }
  });

  return NextResponse.json({ ok: true });
}
