import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = req.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const layout = await prisma.wallVersion.findUnique({ where: { id } });
  if (!layout) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.wallVersion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
