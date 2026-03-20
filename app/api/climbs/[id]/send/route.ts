import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { grade } = await req.json();
  if (!grade) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  await prisma.climbSend.upsert({
    where: { climbId_userId: { climbId: id, userId: user.id } },
    update: { grade, sentAt: new Date() },
    create: { climbId: id, userId: user.id, grade }
  });

  await prisma.climbGradeVote.upsert({
    where: { climbId_userId: { climbId: id, userId: user.id } },
    update: { suggestedGrade: grade },
    create: { climbId: id, userId: user.id, suggestedGrade: grade }
  });

  return NextResponse.json({ ok: true });
}
