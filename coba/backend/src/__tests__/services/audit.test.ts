import { describe, it, expect } from 'vitest'
import { db } from '../../db'
import { logAudit } from '../../services/audit'

// ── helpers ───────────────────────────────────────────────────────────────────

function fetchAll() {
  return db.prepare(`SELECT * FROM audit_log ORDER BY id DESC`).all() as Array<{
    id: number
    user_id: number | null
    user_name: string | null
    action: string
    entity: string
    entity_id: number | null
    changes: string | null
    created_at: string
  }>
}

// ── logAudit ──────────────────────────────────────────────────────────────────

describe('logAudit', () => {
  it('inserts a row with correct fields', () => {
    logAudit(1, 'Alice', 'create', 'projects', 42)
    const rows = fetchAll()
    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.user_id).toBe(1)
    expect(row.user_name).toBe('Alice')
    expect(row.action).toBe('create')
    expect(row.entity).toBe('projects')
    expect(row.entity_id).toBe(42)
    expect(row.changes).toBeNull()
    expect(row.created_at).toBeTruthy()
  })

  it('stores null userId when null is passed', () => {
    logAudit(null, null, 'delete', 'team_members', 7)
    const rows = fetchAll()
    expect(rows[0].user_id).toBeNull()
    expect(rows[0].user_name).toBeNull()
  })

  it('stores and retrieves changes JSON correctly', () => {
    const changes = { name: ['Old Name', 'New Name'], status: ['planning', 'active'] }
    logAudit(2, 'Bob', 'update', 'projects', 10, changes as Record<string, [unknown, unknown]>)
    const rows = fetchAll()
    expect(rows[0].changes).not.toBeNull()
    const parsed = JSON.parse(rows[0].changes!)
    expect(parsed.name).toEqual(['Old Name', 'New Name'])
    expect(parsed.status).toEqual(['planning', 'active'])
  })

  it('multiple entries are ordered by created_at DESC (most recent first)', () => {
    logAudit(1, 'Alice', 'create', 'projects', 1)
    logAudit(2, 'Bob', 'update', 'projects', 1)
    logAudit(3, 'Carol', 'delete', 'projects', 1)
    const rows = fetchAll()
    expect(rows).toHaveLength(3)
    // ORDER BY id DESC means last inserted comes first
    expect(rows[0].user_name).toBe('Carol')
    expect(rows[1].user_name).toBe('Bob')
    expect(rows[2].user_name).toBe('Alice')
  })
})
