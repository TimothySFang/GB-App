import { versionImageUrl } from "@/lib/version-image";
import { all, first, run } from "@/db";
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

async function ensureInitialWall() {
  const existing = await first<{ count: number }>("SELECT COUNT(*) AS count FROM walls");
  if (Number(existing?.count ?? 0) > 0) return;
  await run(
    "INSERT INTO walls (id, name, notes) VALUES (?, ?, ?)",
    crypto.randomUUID(),
    "Home Wall",
    "Add your first layout to start tracking holds and climbs.",
  );
}

export async function getDashboardData(currentUserId: string): Promise<DashboardData> {
  await ensureInitialWall();

  const [users, wall, versions, holds, climbs, climbHolds, ratings, gradeVotes, favorites, sends, repeats, compatibility] = await Promise.all([
    all<UserRow>("SELECT id, email, display_name AS displayName, role FROM users ORDER BY created_at"),
    first<WallRow>("SELECT id, name, notes FROM walls ORDER BY created_at LIMIT 1"),
    all<VersionRow>(`SELECT id, wall_id AS wallId, parent_version_id AS parentVersionId,
      name, change_type AS changeType, image_url AS imageUrl, image_key AS imageKey,
      photo_scale AS photoScale, photo_offset_x AS photoOffsetX, photo_offset_y AS photoOffsetY,
      photo_rotation AS photoRotation, notes FROM wall_versions ORDER BY created_at`),
    all<HoldRow>(`SELECT id, canonical_hold_id AS canonicalHoldId, wall_version_id AS wallVersionId,
      label, color, x, y, status FROM holds ORDER BY created_at`),
    all<{ id: string; wallVersionId: string; createdByUserId: string; createdByName: string; createdAt: string; name: string; setterGrade: string | null; notes: string | null }>(`SELECT c.id, c.wall_version_id AS wallVersionId,
      c.created_by_user_id AS createdByUserId, u.display_name AS createdByName,
      c.created_at AS createdAt, c.name, c.setter_grade AS setterGrade, c.notes
      FROM climbs c JOIN users u ON u.id = c.created_by_user_id ORDER BY c.created_at`),
    all<{ climbId: string; canonicalHoldId: string; role: HoldRole; orderIndex: number; x: number | null; y: number | null }>(`SELECT ch.climb_id AS climbId,
      h.canonical_hold_id AS canonicalHoldId, ch.role, ch.order_index AS orderIndex, NULL AS x, NULL AS y
      FROM climb_holds ch JOIN holds h ON h.id = ch.hold_id
      UNION ALL SELECT climb_id AS climbId, id AS canonicalHoldId, role, order_index AS orderIndex, x, y
      FROM climb_markers ORDER BY orderIndex`),
    all<{ climbId: string; userId: string; stars: number }>("SELECT climb_id AS climbId, user_id AS userId, stars FROM climb_ratings"),
    all<{ climbId: string; userId: string; grade: string }>("SELECT climb_id AS climbId, user_id AS userId, suggested_grade AS grade FROM climb_grade_votes"),
    all<{ climbId: string; userId: string }>("SELECT climb_id AS climbId, user_id AS userId FROM favorites"),
    all<{ climbId: string; userId: string; grade: string; sentAt: string }>("SELECT climb_id AS climbId, user_id AS userId, grade, sent_at AS sentAt FROM climb_sends"),
    all<{ id: string; climbId: string; userId: string; repeatedAt: string }>("SELECT id, climb_id AS climbId, user_id AS userId, repeated_at AS repeatedAt FROM climb_repeats ORDER BY repeated_at DESC"),
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
        imageUrl: version.imageKey ? versionImageUrl(version.id, version.imageKey) : (version.imageUrl ?? ""),
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
      createdAt: climb.createdAt,
      name: climb.name,
      setterGrade: climb.setterGrade ?? "",
      notes: climb.notes ?? "",
      holds: climbHolds.filter((item) => item.climbId === climb.id).map((item) => ({ holdId: item.canonicalHoldId, role: item.role, order: item.orderIndex, ...(item.x != null && item.y != null ? { x: item.x, y: item.y } : {}) })),
      ratings: ratings.filter((item) => item.climbId === climb.id).map(({ userId, stars }) => ({ userId, stars })),
      gradeVotes: gradeVotes.filter((item) => item.climbId === climb.id).map(({ userId, grade }) => ({ userId, grade })),
      favorites: favorites.filter((item) => item.climbId === climb.id).map((item) => item.userId),
      sends: sends.filter((item) => item.climbId === climb.id).map(({ userId, grade, sentAt }) => ({ userId, grade, sentAt: sentAt.slice(0, 10) })),
      repeats: repeats.filter((item) => item.climbId === climb.id).map(({ id, userId, repeatedAt }) => ({ id, userId, repeatedAt })),
    })),
    compatibility: compatibility.map((item) => ({ ...item, reason: item.reason ?? "" })),
  };
}
