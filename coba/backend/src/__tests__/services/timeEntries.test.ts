import { describe, it, expect } from 'vitest'
import { db } from '../../db'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeProject(refCode = 'P-001') {
  return Number(db.prepare(`
    INSERT INTO projects (ref_code, name, client, macro_region, country, place, category, status, priority, currency, project_manager, description, tags)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(refCode, 'Test Project', 'ACME', 'EMEA', 'Portugal', 'Lisbon', 'transport', 'active', 'medium', 'EUR', 'PM', 'desc', '').lastInsertRowid)
}

function makeMember(name = 'Alice') {
  return Number(db.prepare(`INSERT INTO team_members (name) VALUES (?)`).run(name).lastInsertRowid)
}

function makeEntry(projectId: number, memberId: number, overrides: Record<string, unknown> = {}) {
  const date = (overrides.date as string) ?? '2024-06-01'
  const hours = (overrides.hours as number) ?? 8
  const description = (overrides.description as string) ?? ''
  const result = db.prepare(`
    INSERT INTO time_entries (project_id, member_id, date, hours, description)
    VALUES (?, ?, ?, ?, ?)
  `).run(projectId, memberId, date, hours, description)
  return Number(result.lastInsertRowid)
}

// ── byProject ─────────────────────────────────────────────────────────────────

describe('time_entries byProject', () => {
  it('returns empty list when no entries for project', () => {
    const pId = makeProject()
    const mId = makeMember()
    makeEntry(makeProject('P-002'), mId)
    const rows = db.prepare(`
      SELECT te.*, tm.name as member_name
      FROM time_entries te
      JOIN team_members tm ON tm.id = te.member_id
      WHERE te.project_id = ?
      ORDER BY te.date DESC, te.created_at DESC
    `).all(pId)
    expect(rows).toHaveLength(0)
  })

  it('returns entries for the project with member name joined', () => {
    const pId = makeProject()
    const mId = makeMember('Bob')
    makeEntry(pId, mId, { date: '2024-06-01', hours: 4 })
    makeEntry(pId, mId, { date: '2024-06-02', hours: 6 })

    const rows = db.prepare(`
      SELECT te.*, tm.name as member_name
      FROM time_entries te
      JOIN team_members tm ON tm.id = te.member_id
      WHERE te.project_id = ?
      ORDER BY te.date DESC, te.created_at DESC
    `).all(pId) as Array<{ member_name: string; hours: number; date: string }>

    expect(rows).toHaveLength(2)
    expect(rows[0].member_name).toBe('Bob')
    // Ordered by date DESC — 2024-06-02 first
    expect(rows[0].date).toBe('2024-06-02')
    expect(rows[1].date).toBe('2024-06-01')
  })
})

// ── byMember ──────────────────────────────────────────────────────────────────

describe('time_entries byMember', () => {
  it('returns entries for member with project name joined', () => {
    const pId = makeProject('P-A')
    const mId = makeMember('Carol')
    makeEntry(pId, mId, { date: '2024-07-10', hours: 3 })

    const rows = db.prepare(`
      SELECT te.*, p.name as project_name
      FROM time_entries te
      JOIN projects p ON p.id = te.project_id
      WHERE te.member_id = ?
      ORDER BY te.date DESC, te.created_at DESC
    `).all(mId) as Array<{ project_name: string; hours: number }>

    expect(rows).toHaveLength(1)
    expect(rows[0].project_name).toBe('Test Project')
    expect(rows[0].hours).toBe(3)
  })

  it('does not return entries from other members', () => {
    const pId = makeProject()
    const mId1 = makeMember('Dave')
    const mId2 = makeMember('Eve')
    makeEntry(pId, mId1)
    makeEntry(pId, mId2)

    const rows = db.prepare(`
      SELECT te.*, p.name as project_name
      FROM time_entries te
      JOIN projects p ON p.id = te.project_id
      WHERE te.member_id = ?
    `).all(mId1)

    expect(rows).toHaveLength(1)
  })
})

// ── create ────────────────────────────────────────────────────────────────────

describe('time_entries create', () => {
  it('inserts entry and returns it with member name', () => {
    const pId = makeProject()
    const mId = makeMember('Frank')
    const result = db.prepare(`
      INSERT INTO time_entries (project_id, member_id, date, hours, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(pId, mId, '2024-08-01', 7.5, 'Site visit')

    const row = db.prepare(`
      SELECT te.*, tm.name as member_name
      FROM time_entries te
      JOIN team_members tm ON tm.id = te.member_id
      WHERE te.id = ?
    `).get(result.lastInsertRowid) as { member_name: string; hours: number; description: string } | undefined

    expect(row).not.toBeUndefined()
    expect(row!.member_name).toBe('Frank')
    expect(row!.hours).toBe(7.5)
    expect(row!.description).toBe('Site visit')
  })

  it('stores hours as a float correctly', () => {
    const pId = makeProject()
    const mId = makeMember()
    makeEntry(pId, mId, { hours: 3.25 })
    const row = db.prepare(`SELECT hours FROM time_entries WHERE project_id = ?`).get(pId) as { hours: number }
    expect(row.hours).toBe(3.25)
  })
})

// ── delete ────────────────────────────────────────────────────────────────────

describe('time_entries delete', () => {
  it('removes the entry', () => {
    const pId = makeProject()
    const mId = makeMember()
    const entryId = makeEntry(pId, mId)
    db.prepare(`DELETE FROM time_entries WHERE id = ?`).run(entryId)
    const row = db.prepare(`SELECT * FROM time_entries WHERE id = ?`).get(entryId)
    expect(row).toBeUndefined()
  })
})

// ── report aggregations ───────────────────────────────────────────────────────

describe('time_entries report aggregations', () => {
  it('byProject aggregates total_hours correctly', () => {
    const pId = makeProject('P-AGG')
    const mId1 = makeMember('Grace')
    const mId2 = makeMember('Heidi')
    makeEntry(pId, mId1, { hours: 5 })
    makeEntry(pId, mId1, { hours: 3 })
    makeEntry(pId, mId2, { hours: 2 })

    interface ByProjectRow {
      project_id: number
      project_name: string
      total_hours: number
      entry_count: number
      member_count: number
    }

    const rows = db.prepare(`
      SELECT
        p.id        AS project_id,
        p.name      AS project_name,
        COALESCE(SUM(te.hours), 0)               AS total_hours,
        COALESCE(COUNT(te.id), 0)                AS entry_count,
        COALESCE(COUNT(DISTINCT te.member_id), 0) AS member_count
      FROM projects p
      LEFT JOIN time_entries te ON te.project_id = p.id
      GROUP BY p.id, p.name
      HAVING total_hours > 0
      ORDER BY total_hours DESC
    `).all() as ByProjectRow[]

    const agg = rows.find(r => r.project_id === pId)
    expect(agg).not.toBeUndefined()
    expect(agg!.total_hours).toBe(10)
    expect(agg!.entry_count).toBe(3)
    expect(agg!.member_count).toBe(2)
  })

  it('byMember aggregates total_hours and project_count', () => {
    const pId1 = makeProject('P-M1')
    const pId2 = makeProject('P-M2')
    const mId = makeMember('Ivan')
    makeEntry(pId1, mId, { hours: 4 })
    makeEntry(pId2, mId, { hours: 6 })

    interface ByMemberRow {
      member_id: number
      member_name: string
      total_hours: number
      project_count: number
      entry_count: number
    }

    const rows = db.prepare(`
      SELECT
        tm.id       AS member_id,
        tm.name     AS member_name,
        COALESCE(SUM(te.hours), 0)               AS total_hours,
        COALESCE(COUNT(DISTINCT te.project_id), 0) AS project_count,
        COALESCE(COUNT(te.id), 0)                AS entry_count
      FROM team_members tm
      LEFT JOIN time_entries te ON te.member_id = tm.id
      GROUP BY tm.id, tm.name
      HAVING total_hours > 0
      ORDER BY total_hours DESC
    `).all() as ByMemberRow[]

    const agg = rows.find(r => r.member_id === mId)
    expect(agg).not.toBeUndefined()
    expect(agg!.total_hours).toBe(10)
    expect(agg!.project_count).toBe(2)
    expect(agg!.entry_count).toBe(2)
  })

  it('underreporting query returns members on projects but with no time entries', () => {
    const pId = makeProject('P-UNDER')
    const mId = makeMember('Judy')
    // Tag member to project but do NOT create any time entries
    db.prepare(`INSERT INTO project_team (project_id, team_member_id, role_on_project) VALUES (?, ?, ?)`).run(pId, mId, 'Engineer')

    interface UnderRow {
      member_id: number
      member_name: string
      project_count: number
    }

    const rows = db.prepare(`
      SELECT
        tm.id   AS member_id,
        tm.name AS member_name,
        COUNT(DISTINCT pt.project_id) AS project_count
      FROM team_members tm
      JOIN project_team pt ON pt.team_member_id = tm.id
      WHERE NOT EXISTS (
        SELECT 1 FROM time_entries te
        WHERE te.member_id = tm.id
      )
      GROUP BY tm.id, tm.name
      ORDER BY project_count DESC
    `).all() as UnderRow[]

    const judy = rows.find(r => r.member_id === mId)
    expect(judy).not.toBeUndefined()
    expect(judy!.project_count).toBe(1)
  })

  it('underreporting excludes members who have logged time', () => {
    const pId = makeProject('P-EXCL')
    const mId = makeMember('Karl')
    db.prepare(`INSERT INTO project_team (project_id, team_member_id, role_on_project) VALUES (?, ?, ?)`).run(pId, mId, 'Engineer')
    makeEntry(pId, mId, { hours: 1 })

    const rows = db.prepare(`
      SELECT tm.id AS member_id
      FROM team_members tm
      JOIN project_team pt ON pt.team_member_id = tm.id
      WHERE NOT EXISTS (
        SELECT 1 FROM time_entries te WHERE te.member_id = tm.id
      )
      GROUP BY tm.id
    `).all() as Array<{ member_id: number }>

    expect(rows.find(r => r.member_id === mId)).toBeUndefined()
  })
})
