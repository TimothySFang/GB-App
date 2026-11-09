import { all, first, getD1 } from "@/db";
import { mockData } from "./mock-data";
import type {
  ChangeType,
  CompatibilityStatus,
  DashboardData,
  HoldRole,
  HoldStatus,
  Role,
} from "./types";

type UserRow = { id: string; email: string; displayName: string; role: Role };
type WallRow = { id: string; name: string; notes: string | null };
type VersionRow = {
  id: string;
  wallId: string;
  parentVersionId: string | null;
  name: string;
  changeType: ChangeType;
  imageUrl: string | null;
  imageKey: string | null;
  photoScale: number;
  photoOffsetX: number;
  photoOffsetY: number;
  photoRotation: number;
  notes: string | null;
};
type HoldRow = {
  id: string;
  canonicalHoldId: string;
  wallVersionId: string;
  label: string;
  color: string | null;
  x: number;
  y: number;
  status: HoldStatus;
};

const demoUserId = (id: string, currentUserId: string) =>
  id === mockData.currentUser.id ? currentUserId : `demo-${id}`;

export async function ensureSeedData(currentUserId: string) {
  const existing = await first<{ count: number }>("SELECT COUNT(*) AS count FROM walls");
  if (Number(existing?.count ?? 0) > 0) return;

  const db = getD1();
  const statements: D1PreparedStatement[] = [];

  for (const user of mockData.users) {
    if (user.id === mockData.currentUser.id) continue;
    statements.push(
      db.prepare("INSERT OR IGNORE INTO users (id, email, display_name, role) VALUES (?, ?, ?, ?)")
        .bind(demoUserId(user.id, currentUserId), user.email, user.name, user.role),
    );
  }

  statements.push(
    db.prepare("INSERT INTO walls (id, name, notes) VALUES (?, ?, ?)")
      .bind(mockData.wall.id, mockData.wall.name, mockData.wall.notes),
  );

  for (const version of mockData.wall.versions) {
    statements.push(
      db.prepare(`INSERT INTO wall_versions
        (id, wall_id, parent_version_id, name, change_type, image_url, photo_scale, photo_offset_x, photo_offset_y, photo_rotation, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          version.id,
          version.wallId,
          version.parentVersionId ?? null,
          version.name,
          version.changeType,
          version.imageUrl,
          version.photoScale ?? 1,
          version.photoOffsetX ?? 0,
          version.photoOffsetY ?? 0,
          version.photoRotation ?? 0,
          version.notes,
        ),
    );

    for (const hold of version.holds) {
      statements.push(
        db.prepare(`INSERT INTO holds
          (id, canonical_hold_id, wall_version_id, label, color, x, y, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(hold.id, hold.canonicalHoldId, version.id, hold.label, hold.color, hold.x, hold.y, hold.status),
      );
    }
  }

  for (const climb of mockData.climbs) {
    statements.push(
      db.prepare(`INSERT INTO climbs
        (id, wall_version_id, created_by_user_id, name, setter_grade, notes)
        VALUES (?, ?, ?, ?, ?, ?)`)
        .bind(
          climb.id,
          climb.wallVersionId,
          demoUserId(climb.createdByUserId, currentUserId),
          climb.name,
          climb.setterGrade,
          climb.notes,
        ),
    );

    const version = mockData.wall.versions.find((item) => item.id === climb.wallVersionId);
    for (const ref of climb.holds) {
      const hold = version?.holds.find((item) => item.canonicalHoldId === ref.holdId);
      if (!hold) continue;
      statements.push(
        db.prepare("INSERT INTO climb_holds (id, climb_id, hold_id, role, order_index) VALUES (?, ?, ?, ?, ?)")
          .bind(crypto.randomUUID(), climb.id, hold.id, ref.role, ref.order),
      );
    }

    for (const rating of climb.ratings) {
      statements.push(
        db.prepare("INSERT INTO climb_ratings (climb_id, user_id, stars) VALUES (?, ?, ?)")
          .bind(climb.id, demoUserId(rating.userId, currentUserId), rating.stars),
      );
    }
    for (const vote of climb.gradeVotes) {
      statements.push(
        db.prepare("INSERT INTO climb_grade_votes (climb_id, user_id, suggested_grade) VALUES (?, ?, ?)")
          .bind(climb.id, demoUserId(vote.userId, currentUserId), vote.grade),
      );
    }
    for (const userId of climb.favorites ?? []) {
      statements.push(
        db.prepare("INSERT INTO favorites (climb_id, user_id) VALUES (?, ?)")
          .bind(climb.id, demoUserId(userId, currentUserId)),
      );
    }
    for (const send of climb.sends ?? []) {
      statements.push(
        db.prepare("INSERT INTO climb_sends (climb_id, user_id, grade, sent_at) VALUES (?, ?, ?, ?)")
          .bind(climb.id, demoUserId(send.userId, currentUserId), send.grade, send.sentAt),
      );
    }
  }

  for (const item of mockData.compatibility) {
    statements.push(
      db.prepare(`INSERT INTO climb_compatibility
        (climb_id, target_wall_version_id, status, reason) VALUES (?, ?, ?, ?)`)
        .bind(item.climbId, item.targetWallVersionId, item.status, item.reason),
    );
  }

  await db.batch(statements);
}

export async function getDashboardData(currentUserId: string): Promise<DashboardData> {
  await ensureSeedData(currentUserId);

  const [users, wall, versions, holds, climbs, climbHolds, ratings, gradeVotes, favorites, sends, compatibility] = await Promise.all([
    all<UserRow>("SELECT id, email, display_name AS displayName, role FROM users ORDER BY created_at"),
    first<WallRow>("SELECT id, name, notes FROM walls ORDER BY created_at LIMIT 1"),
    all<VersionRow>(`SELECT id, wall_id AS wallId, parent_version_id AS parentVersionId,
      name, change_type AS changeType, image_url AS imageUrl, image_key AS imageKey,
      photo_scale AS photoScale, photo_offset_x AS photoOffsetX, photo_offset_y AS photoOffsetY,
      photo_rotation AS photoRotation, notes FROM wall_versions ORDER BY created_at`),
    all<HoldRow>(`SELECT id, canonical_hold_id AS canonicalHoldId, wall_version_id AS wallVersionId,
      label, color, x, y, status FROM holds ORDER BY created_at`),
    all<{ id: string; wallVersionId: string; createdByUserId: string; createdByName: string; name: string; setterGrade: string | null; notes: string | null }>(`SELECT c.id, c.wall_version_id AS wallVersionId,
      c.created_by_user_id AS createdByUserId, u.display_name AS createdByName,
      c.name, c.setter_grade AS setterGrade, c.notes
      FROM climbs c JOIN users u ON u.id = c.created_by_user_id ORDER BY c.created_at`),
    all<{ climbId: string; canonicalHoldId: string; role: HoldRole; orderIndex: number }>(`SELECT ch.climb_id AS climbId,
      h.canonical_hold_id AS canonicalHoldId, ch.role, ch.order_index AS orderIndex
      FROM climb_holds ch JOIN holds h ON h.id = ch.hold_id ORDER BY ch.order_index`),
    all<{ climbId: string; userId: string; stars: number }>("SELECT climb_id AS climbId, user_id AS userId, stars FROM climb_ratings"),
    all<{ climbId: string; userId: string; grade: string }>("SELECT climb_id AS climbId, user_id AS userId, suggested_grade AS grade FROM climb_grade_votes"),
    all<{ climbId: string; userId: string }>("SELECT climb_id AS climbId, user_id AS userId FROM favorites"),
    all<{ climbId: string; userId: string; grade: string; sentAt: string }>("SELECT climb_id AS climbId, user_id AS userId, grade, sent_at AS sentAt FROM climb_sends"),
    all<{ climbId: string; targetWallVersionId: string; status: CompatibilityStatus; reason: string | null }>(`SELECT climb_id AS climbId,
      target_wall_version_id AS targetWallVersionId, status, reason FROM climb_compatibility ORDER BY climb_id`),
  ]);

  if (!wall) throw new Error("No wall found");
  const currentUser = users.find((user) => user.id === currentUserId);
  if (!currentUser) throw new Error("Current user not found");

  return {
    currentUser: { id: currentUser.id, name: currentUser.displayName, email: currentUser.email, role: currentUser.role },
    users: users.map((user) => ({ id: user.id, name: user.displayName, email: user.email, role: user.role })),
    wall: {
      id: wall.id,
      name: wall.name,
      notes: wall.notes ?? "",
      versions: versions.map((version) => ({
        id: version.id,
        wallId: version.wallId,
        parentVersionId: version.parentVersionId ?? undefined,
        name: version.name,
        changeType: version.changeType,
        imageUrl: version.imageKey ? `/api/versions/${version.id}/image` : (version.imageUrl ?? ""),
        photoScale: version.photoScale,
        photoOffsetX: version.photoOffsetX,
        photoOffsetY: version.photoOffsetY,
        photoRotation: version.photoRotation,
        notes: version.notes ?? "",
        holds: holds.filter((hold) => hold.wallVersionId === version.id).map((hold) => ({
          id: hold.id,
          canonicalHoldId: hold.canonicalHoldId,
          label: hold.label,
          color: hold.color ?? "#22c55e",
          x: hold.x,
          y: hold.y,
          status: hold.status,
        })),
      })),
    },
    climbs: climbs.map((climb) => ({
      id: climb.id,
      wallVersionId: climb.wallVersionId,
      createdByUserId: climb.createdByUserId,
      createdByName: climb.createdByName,
      name: climb.name,
      setterGrade: climb.setterGrade ?? "",
      notes: climb.notes ?? "",
      holds: climbHolds.filter((item) => item.climbId === climb.id).map((item) => ({ holdId: item.canonicalHoldId, role: item.role, order: item.orderIndex })),
      ratings: ratings.filter((item) => item.climbId === climb.id).map(({ userId, stars }) => ({ userId, stars })),
      gradeVotes: gradeVotes.filter((item) => item.climbId === climb.id).map(({ userId, grade }) => ({ userId, grade })),
      favorites: favorites.filter((item) => item.climbId === climb.id).map((item) => item.userId),
      sends: sends.filter((item) => item.climbId === climb.id).map(({ userId, grade, sentAt }) => ({ userId, grade, sentAt: sentAt.slice(0, 10) })),
    })),
    compatibility: compatibility.map((item) => ({ ...item, reason: item.reason ?? "" })),
  };
}
