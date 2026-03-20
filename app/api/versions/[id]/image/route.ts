import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { imageUrl } = await req.json();
  if (!imageUrl || typeof imageUrl !== 'string') {
    return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });
  }

  await prisma.wallVersion.update({
    where: { id: id },
    data: { imageUrl }
  });

  return NextResponse.json({ ok: true });
}
