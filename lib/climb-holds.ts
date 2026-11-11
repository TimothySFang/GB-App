import { all } from '@/db';
import type { ClimbHold } from '@/lib/types';

export function validClimbHolds(holds: unknown): holds is ClimbHold[] {
  return Array.isArray(holds) && holds.length > 0 && holds.every((hold) =>
    hold && typeof hold.holdId === 'string' && ['start', 'middle', 'foot', 'finish'].includes(hold.role)
    && Number.isInteger(hold.order) && hold.order >= 0
    && ((hold.x == null && hold.y == null) || (Number.isFinite(hold.x) && Number.isFinite(hold.y)
      && hold.x >= 0 && hold.x <= 100 && hold.y >= 0 && hold.y <= 100)))
    && holds.some((hold) => hold.role === 'start') && holds.some((hold) => hold.role === 'finish');
}

export async function climbHoldStatements(db: D1Database, climbId: string, versionId: string, holds: ClimbHold[]) {
  const existing = await all<{ id: string; canonicalHoldId: string }>(
    'SELECT id, canonical_hold_id AS canonicalHoldId FROM holds WHERE wall_version_id = ?', versionId);
  return holds.map((hold) => {
    if (hold.x != null && hold.y != null) {
      return db.prepare('INSERT INTO climb_markers (id, climb_id, x, y, role, order_index) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), climbId, hold.x, hold.y, hold.role, hold.order);
    }
    const saved = existing.find((item) => item.canonicalHoldId === hold.holdId);
    if (!saved) throw new Error('One or more selected holds are no longer saved on this layout');
    return db.prepare('INSERT INTO climb_holds (id, climb_id, hold_id, role, order_index) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), climbId, saved.id, hold.role, hold.order);
  });
}
