import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ChangeType } from '@prisma/client';

async function requireAdmin(userId: string | null) {
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'admin') return null;
  return user;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { userId, name, notes, changeType } = body as {
    userId?: string;
    name?: string;
    notes?: string;
    changeType?: ChangeType;
  };

  const admin = await requireAdmin(userId ?? null);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await prisma.wallVersion.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.wallVersion.update({
    where: { id },
    data: {
      name: name ?? existing.name,
      notes: notes ?? existing.notes,
      changeType: changeType ?? existing.changeType
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = req.nextUrl.searchParams.get('userId');

  const admin = await requireAdmin(userId);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const layout = await prisma.wallVersion.findUnique({ where: { id } });
  if (!layout) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.wallVersion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
