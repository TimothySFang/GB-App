import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, grade } = await req.json();
  if (!userId || !grade) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  await prisma.climbSend.upsert({
    where: { climbId_userId: { climbId: id, userId } },
    update: { grade, sentAt: new Date() },
    create: { climbId: id, userId, grade }
  });

  await prisma.climbGradeVote.upsert({
    where: { climbId_userId: { climbId: id, userId } },
    update: { suggestedGrade: grade },
    create: { climbId: id, userId, suggestedGrade: grade }
  });

  return NextResponse.json({ ok: true });
}
