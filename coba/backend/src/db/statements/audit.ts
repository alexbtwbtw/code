import { db } from '../client'

export const insertAuditLog = db.prepare(`
  INSERT INTO audit_log (user_id, user_name, action, entity, entity_id, changes)
  VALUES (@user_id, @user_name, @action, @entity, @entity_id, @changes)
`)

export const selectRecentAuditLog = db.prepare(`
  SELECT id, user_id, user_name, action, entity, entity_id, changes, created_at
  FROM audit_log
  ORDER BY id DESC
  LIMIT 100
`)
