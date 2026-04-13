import { insertAuditLog } from '../db/statements/audit'

export function logAudit(
  userId: string | number | null,
  userName: string | null,
  action: 'create' | 'update' | 'delete',
  entity: string,
  entityId?: number | null,
  changes?: Record<string, [unknown, unknown]>,
): void {
  insertAuditLog.run({
    user_id:   userId !== null ? Number(userId) : null,
    user_name: userName ?? null,
    action,
    entity,
    entity_id: entityId ?? null,
    changes:   changes ? JSON.stringify(changes) : null,
  })
}
