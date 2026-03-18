import { Climb, Compatibility, DashboardData, Hold, HoldRole, WallVersion } from './types';

export function averageRating(climb: Climb) {
  if (!climb.ratings.length) return null;
  const total = climb.ratings.reduce((sum, rating) => sum + rating.stars, 0);
  return (total / climb.ratings.length).toFixed(1);
}

export function communityGrade(climb: Climb) {
  if (!climb.gradeVotes.length) return 'No votes';
  const counts = new Map<string, number>();
  for (const vote of climb.gradeVotes) counts.set(vote.grade, (counts.get(vote.grade) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function getLatestVersion(data: DashboardData) {
  return data.wall.versions[data.wall.versions.length - 1];
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
