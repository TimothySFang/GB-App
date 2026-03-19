import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const existing = await prisma.favorite.findUnique({
    where: { climbId_userId: { climbId: params.id, userId } }
  });

  if (existing) {
    await prisma.favorite.delete({ where: { climbId_userId: { climbId: params.id, userId } } });
    return NextResponse.json({ favorited: false });
  }

  await prisma.favorite.create({ data: { climbId: params.id, userId } });
  return NextResponse.json({ favorited: true });
}
