import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { imageUrl } = await req.json();
  if (!imageUrl || typeof imageUrl !== 'string') {
    return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });
  }

  await prisma.wallVersion.update({
    where: { id: params.id },
    data: { imageUrl }
  });

  return NextResponse.json({ ok: true });
}
