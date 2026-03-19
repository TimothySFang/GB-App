import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, grade } = await req.json();
  if (!userId || !grade) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  await prisma.climbSend.upsert({
    where: { climbId_userId: { climbId: params.id, userId } },
    update: { grade, sentAt: new Date() },
    create: { climbId: params.id, userId, grade }
  });

  await prisma.climbGradeVote.upsert({
    where: { climbId_userId: { climbId: params.id, userId } },
    update: { suggestedGrade: grade },
    create: { climbId: params.id, userId, suggestedGrade: grade }
  });

  return NextResponse.json({ ok: true });
}
