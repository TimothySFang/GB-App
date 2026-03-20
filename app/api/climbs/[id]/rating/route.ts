import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { stars } = await req.json();
  if (typeof stars !== 'number') return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  await prisma.climbRating.upsert({
    where: { climbId_userId: { climbId: id, userId: user.id } },
    update: { stars },
    create: { climbId: id, userId: user.id, stars }
  });

  return NextResponse.json({ ok: true });
}
