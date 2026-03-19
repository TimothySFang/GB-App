import { Role, ChangeType, HoldRole, HoldStatus, CompatibilityStatus } from '@prisma/client';
import { prisma } from './prisma';
import { mockData } from './mock-data';
import type { DashboardData } from './types';

export async function ensureSeedData() {
  const existing = await prisma.wall.count();
  if (existing > 0) return;

  for (const user of mockData.users) {
    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        displayName: user.name,
        role: user.role as Role
      }
    });
  }

  await prisma.wall.create({
    data: {
      id: mockData.wall.id,
      name: mockData.wall.name,
      notes: mockData.wall.notes
    }
  });

  for (const version of mockData.wall.versions) {
    await prisma.wallVersion.create({
      data: {
        id: version.id,
        wallId: version.wallId,
        parentVersionId: version.parentVersionId,
        name: version.name,
        changeType: version.changeType as ChangeType,
        imageUrl: version.imageUrl,
        notes: version.notes
      }
    });

    for (const hold of version.holds) {
      await prisma.hold.create({
        data: {
          id: hold.id,
          canonicalHoldId: hold.canonicalHoldId,
          wallVersionId: version.id,
          label: hold.label,
          color: hold.color,
          x: hold.x,
          y: hold.y,
          status: hold.status as HoldStatus
        }
      });
    }
  }

  for (const climb of mockData.climbs) {
    await prisma.climb.create({
      data: {
        id: climb.id,
        wallVersionId: climb.wallVersionId,
        createdByUserId: climb.createdByUserId,
        name: climb.name,
        setterGrade: climb.setterGrade,
        notes: climb.notes
      }
    });

    const holds = await prisma.hold.findMany({ where: { wallVersionId: climb.wallVersionId } });
    for (const ref of climb.holds) {
      const hold = holds.find((item) => item.canonicalHoldId === ref.holdId);
      if (!hold) continue;
      await prisma.climbHold.create({
        data: {
          climbId: climb.id,
          holdId: hold.id,
          role: ref.role as HoldRole,
          orderIndex: ref.order
        }
      });
    }

    for (const rating of climb.ratings ?? []) {
      await prisma.climbRating.create({
        data: {
          climbId: climb.id,
          userId: rating.userId,
          stars: rating.stars
        }
      });
    }

    for (const vote of climb.gradeVotes ?? []) {
      await prisma.climbGradeVote.create({
        data: {
          climbId: climb.id,
          userId: vote.userId,
          suggestedGrade: vote.grade
        }
      });
    }

    for (const favoriteUserId of climb.favorites ?? []) {
      await prisma.favorite.create({
        data: {
          climbId: climb.id,
          userId: favoriteUserId
        }
      });
    }

    for (const send of climb.sends ?? []) {
      await prisma.climbSend.create({
        data: {
          climbId: climb.id,
          userId: send.userId,
          grade: send.grade,
          sentAt: new Date(send.sentAt)
        }
      });
    }
  }

  for (const item of mockData.compatibility) {
    await prisma.climbCompatibility.create({
      data: {
        climbId: item.climbId,
        targetWallVersionId: item.targetWallVersionId,
        status: item.status as CompatibilityStatus,
        reason: item.reason
      }
    });
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  await ensureSeedData();

  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  const walls = await prisma.wall.findMany({
    include: {
      versions: {
        orderBy: { createdAt: 'asc' },
        include: { holds: { orderBy: { createdAt: 'asc' } } }
      }
    },
    orderBy: { createdAt: 'asc' }
  });
  const wall = walls[0];
  if (!wall) throw new Error('No wall found');

  const climbs = await prisma.climb.findMany({
    include: {
      createdBy: true,
      holds: { include: { hold: true }, orderBy: { orderIndex: 'asc' } },
      ratings: true,
      gradeVotes: true,
      favorites: true,
      sends: true
    },
    orderBy: { createdAt: 'asc' }
  });

  const compatibility = await prisma.climbCompatibility.findMany({ orderBy: { climbId: 'asc' } });

  return {
    currentUser: {
      id: users[0].id,
      name: users[0].displayName,
      email: users[0].email,
      role: users[0].role === 'admin' ? 'admin' : 'member'
    },
    users: users.map((user) => ({
      id: user.id,
      name: user.displayName,
      email: user.email,
      role: user.role === 'admin' ? 'admin' : 'member'
    })),
    wall: {
      id: wall.id,
      name: wall.name,
      notes: wall.notes ?? '',
      versions: wall.versions.map((version) => ({
        id: version.id,
        wallId: version.wallId,
        parentVersionId: version.parentVersionId ?? undefined,
        name: version.name,
        changeType: version.changeType,
        imageUrl: version.imageUrl ?? '',
        notes: version.notes ?? '',
        holds: version.holds.map((hold) => ({
          id: hold.id,
          canonicalHoldId: hold.canonicalHoldId,
          label: hold.label,
          color: hold.color ?? '#22c55e',
          x: hold.x,
          y: hold.y,
          status: hold.status
        }))
      }))
    },
    climbs: climbs.map((climb) => ({
      id: climb.id,
      wallVersionId: climb.wallVersionId,
      createdByUserId: climb.createdByUserId,
      createdByName: climb.createdBy.displayName,
      name: climb.name,
      setterGrade: climb.setterGrade ?? '',
      notes: climb.notes ?? '',
      holds: climb.holds.map((item) => ({
        holdId: item.hold.canonicalHoldId,
        role: item.role,
        order: item.orderIndex
      })),
      ratings: climb.ratings.map((rating) => ({ userId: rating.userId, stars: rating.stars })),
      gradeVotes: climb.gradeVotes.map((vote) => ({ userId: vote.userId, grade: vote.suggestedGrade })),
      favorites: climb.favorites.map((favorite) => favorite.userId),
      sends: climb.sends.map((send) => ({ userId: send.userId, grade: send.grade, sentAt: send.sentAt.toISOString().slice(0, 10) }))
    })),
    compatibility: compatibility.map((item) => ({
      climbId: item.climbId,
      targetWallVersionId: item.targetWallVersionId,
      status: item.status,
      reason: item.reason ?? ''
    }))
  };
}
