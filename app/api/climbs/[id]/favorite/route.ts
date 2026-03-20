import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.favorite.findUnique({
    where: { climbId_userId: { climbId: id, userId: user.id } }
  });

  if (existing) {
    await prisma.favorite.delete({ where: { climbId_userId: { climbId: id, userId: user.id } } });
    return NextResponse.json({ favorited: false });
  }

  await prisma.favorite.create({ data: { climbId: id, userId: user.id } });
  return NextResponse.json({ favorited: true });
}
