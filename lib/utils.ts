import { Climb, Compatibility, DashboardData, Hold, HoldRole, WallVersion } from './types';

const GRADE_SCALE = ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10'];

export function averageRating(climb: Climb) {
  if (!climb.ratings.length) return null;
  const total = climb.ratings.reduce((sum, rating) => sum + rating.stars, 0);
  return (total / climb.ratings.length).toFixed(1);
}

export function communityGrade(climb: Climb) {
  const votes = climb.sends?.length ? climb.sends.map((send) => send.grade) : climb.gradeVotes.map((vote) => vote.grade);
  if (!votes.length) return 'No votes';
  const mapped = votes.map((grade) => GRADE_SCALE.indexOf(grade)).filter((index) => index >= 0);
  if (!mapped.length) {
    const counts = new Map<string, number>();
    for (const grade of votes) counts.set(grade, (counts.get(grade) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  const avg = mapped.reduce((sum, index) => sum + index, 0) / mapped.length;
  return GRADE_SCALE[Math.round(avg)] ?? votes[0];
}

export function isFavorited(climb: Climb, userId: string) {
  return climb.favorites?.includes(userId) ?? false;
}

export function hasSent(climb: Climb, userId: string) {
  return climb.sends?.some((send) => send.userId === userId) ?? false;
}

export function getLatestVersion(data: DashboardData) {
  return data.wall.versions[data.wall.versions.length - 1] ?? null;
}

export function getCompatibility(climbId: string, versionId: string, compatibility: Compatibility[]) {
  return compatibility.find((entry) => entry.climbId === climbId && entry.targetWallVersionId === versionId);
}

export function holdsForVersion(version: WallVersion) {
  return new Map(version.holds.map((hold) => [hold.canonicalHoldId, hold]));
}

export function groupClimbHolds(climb: Climb, version: WallVersion) {
  const byId = holdsForVersion(version);
  const groups: Record<HoldRole, Hold[]> = { start: [], middle: [], finish: [] };
  for (const ref of climb.holds.sort((a, b) => a.order - b.order)) {
    const hold = byId.get(ref.holdId);
    if (hold) groups[ref.role].push(hold);
  }
  return groups;
}
