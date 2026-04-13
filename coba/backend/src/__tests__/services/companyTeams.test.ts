import { describe, it, expect } from 'vitest'
import { db } from '../../db'

// The companyTeams router operates directly on the DB (no service layer),
// so we test the same SQL logic it uses.

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeMember(name = 'Alice') {
  return Number(db.prepare(`INSERT INTO team_members (name) VALUES (?)`).run(name).lastInsertRowid)
}

function createTeam(name: string, description = '') {
  const result = db.prepare(`INSERT INTO company_teams (name, description) VALUES (?, ?)`).run(name, description)
  return Number(result.lastInsertRowid)
}

function addMember(teamId: number, memberId: number) {
  db.prepare(`INSERT OR IGNORE INTO company_team_members (team_id, member_id) VALUES (?, ?)`).run(teamId, memberId)
}

interface TeamRow { id: number; name: string; description: string; createdAt: string; memberCount: number }
interface MemberRow { id: number; name: string; title: string }

function listTeams(): TeamRow[] {
  return db.prepare(`
    SELECT ct.id, ct.name, ct.description, ct.created_at AS createdAt,
           COUNT(ctm.member_id) AS memberCount
    FROM company_teams ct
    LEFT JOIN company_team_members ctm ON ctm.team_id = ct.id
    GROUP BY ct.id
    ORDER BY ct.name
  `).all() as TeamRow[]
}

function getTeamById(id: number) {
  const team = db.prepare(`
    SELECT id, name, description, created_at AS createdAt FROM company_teams WHERE id = ?
  `).get(id) as { id: number; name: string; description: string; createdAt: string } | undefined
  if (!team) throw new Error('Team not found')
  const members = db.prepare(`
    SELECT tm.id, tm.name, tm.title
    FROM team_members tm
    JOIN company_team_members ctm ON ctm.member_id = tm.id
    WHERE ctm.team_id = ?
    ORDER BY tm.name
  `).all(id) as MemberRow[]
  return { ...team, members }
}

function getTeamsByMember(memberId: number) {
  return db.prepare(`
    SELECT ct.id, ct.name, ct.description
    FROM company_teams ct
    JOIN company_team_members ctm ON ctm.team_id = ct.id
    WHERE ctm.member_id = ?
    ORDER BY ct.name
  `).all(memberId) as { id: number; name: string; description: string }[]
}

// ── list ──────────────────────────────────────────────────────────────────────

describe('companyTeams list', () => {
  it('returns empty array when no teams', () => {
    expect(listTeams()).toEqual([])
  })

  it('returns teams ordered by name ASC', () => {
    createTeam('Zeta Team')
    createTeam('Alpha Team')
    const names = listTeams().map(t => t.name)
    expect(names).toEqual(['Alpha Team', 'Zeta Team'])
  })

  it('includes memberCount', () => {
    const teamId = createTeam('Test Team')
    const mId1 = makeMember('Bob')
    const mId2 = makeMember('Carol')
    addMember(teamId, mId1)
    addMember(teamId, mId2)

    const [team] = listTeams()
    expect(team.memberCount).toBe(2)
  })

  it('memberCount is 0 for empty team', () => {
    createTeam('Empty Team')
    const [team] = listTeams()
    expect(team.memberCount).toBe(0)
  })
})

// ── byId ──────────────────────────────────────────────────────────────────────

describe('companyTeams byId', () => {
  it('returns team with members', () => {
    const teamId = createTeam('Engineering', 'Core engineers')
    const mId = makeMember('Dave')
    addMember(teamId, mId)

    const team = getTeamById(teamId)
    expect(team.name).toBe('Engineering')
    expect(team.description).toBe('Core engineers')
    expect(team.members).toHaveLength(1)
    expect(team.members[0].name).toBe('Dave')
  })

  it('returns team with empty members array when no members', () => {
    const teamId = createTeam('Solo')
    const team = getTeamById(teamId)
    expect(team.members).toEqual([])
  })

  it('throws for non-existent id', () => {
    expect(() => getTeamById(99999)).toThrow('Team not found')
  })

  it('returns members ordered by name ASC', () => {
    const teamId = createTeam('Multi')
    addMember(teamId, makeMember('Zara'))
    addMember(teamId, makeMember('Anna'))
    const team = getTeamById(teamId)
    expect(team.members.map(m => m.name)).toEqual(['Anna', 'Zara'])
  })
})

// ── create ────────────────────────────────────────────────────────────────────

describe('companyTeams create', () => {
  it('inserts and returns id, name, description', () => {
    const result = db.prepare(`INSERT INTO company_teams (name, description) VALUES (?, ?)`).run('New Team', 'New Desc')
    const id = Number(result.lastInsertRowid)
    expect(id).toBeTypeOf('number')
    const row = db.prepare(`SELECT * FROM company_teams WHERE id = ?`).get(id) as { name: string; description: string }
    expect(row.name).toBe('New Team')
    expect(row.description).toBe('New Desc')
  })
})

// ── update ────────────────────────────────────────────────────────────────────

describe('companyTeams update', () => {
  it('changes name and description', () => {
    const teamId = createTeam('Old Name', 'Old Desc')
    db.prepare(`UPDATE company_teams SET name = ?, description = ? WHERE id = ?`).run('New Name', 'New Desc', teamId)
    const row = db.prepare(`SELECT name, description FROM company_teams WHERE id = ?`).get(teamId) as { name: string; description: string }
    expect(row.name).toBe('New Name')
    expect(row.description).toBe('New Desc')
  })
})

// ── delete ────────────────────────────────────────────────────────────────────

describe('companyTeams delete', () => {
  it('removes the team', () => {
    const teamId = createTeam('To Delete')
    db.prepare(`DELETE FROM company_teams WHERE id = ?`).run(teamId)
    const row = db.prepare(`SELECT * FROM company_teams WHERE id = ?`).get(teamId)
    expect(row).toBeUndefined()
  })

  it('cascades deletion to company_team_members', () => {
    const teamId = createTeam('Cascade Team')
    const mId = makeMember('Eve')
    addMember(teamId, mId)

    // Verify member exists in junction table
    const before = db.prepare(`SELECT * FROM company_team_members WHERE team_id = ?`).all(teamId)
    expect(before).toHaveLength(1)

    // Delete team — FK ON DELETE CASCADE should remove junction rows
    db.prepare(`DELETE FROM company_teams WHERE id = ?`).run(teamId)

    const after = db.prepare(`SELECT * FROM company_team_members WHERE team_id = ?`).all(teamId)
    expect(after).toHaveLength(0)
  })
})

// ── addMember ─────────────────────────────────────────────────────────────────

describe('companyTeams addMember', () => {
  it('adds a member to the team', () => {
    const teamId = createTeam('T1')
    const mId = makeMember('Frank')
    addMember(teamId, mId)
    const rows = db.prepare(`SELECT * FROM company_team_members WHERE team_id = ? AND member_id = ?`).all(teamId, mId)
    expect(rows).toHaveLength(1)
  })

  it('is idempotent — INSERT OR IGNORE does not create duplicate', () => {
    const teamId = createTeam('T2')
    const mId = makeMember('Grace')
    addMember(teamId, mId)
    addMember(teamId, mId) // second insert — should be ignored
    const rows = db.prepare(`SELECT * FROM company_team_members WHERE team_id = ? AND member_id = ?`).all(teamId, mId)
    expect(rows).toHaveLength(1)
  })
})

// ── removeMember ──────────────────────────────────────────────────────────────

describe('companyTeams removeMember', () => {
  it('removes the member from the team', () => {
    const teamId = createTeam('T3')
    const mId = makeMember('Heidi')
    addMember(teamId, mId)
    db.prepare(`DELETE FROM company_team_members WHERE team_id = ? AND member_id = ?`).run(teamId, mId)
    const rows = db.prepare(`SELECT * FROM company_team_members WHERE team_id = ? AND member_id = ?`).all(teamId, mId)
    expect(rows).toHaveLength(0)
  })

  it('is a no-op for non-existent pair', () => {
    const teamId = createTeam('T4')
    const mId = makeMember('Ivan')
    expect(() => {
      db.prepare(`DELETE FROM company_team_members WHERE team_id = ? AND member_id = ?`).run(teamId, mId)
    }).not.toThrow()
  })
})

// ── byMember ──────────────────────────────────────────────────────────────────

describe('companyTeams byMember', () => {
  it('returns teams for a member', () => {
    const mId = makeMember('Judy')
    const teamId1 = createTeam('Alpha')
    const teamId2 = createTeam('Beta')
    addMember(teamId1, mId)
    addMember(teamId2, mId)

    const teams = getTeamsByMember(mId)
    expect(teams).toHaveLength(2)
    expect(teams.map(t => t.name)).toEqual(['Alpha', 'Beta'])
  })

  it('returns empty list if member is in no teams', () => {
    const mId = makeMember('Karl')
    expect(getTeamsByMember(mId)).toEqual([])
  })

  it('does not return teams of other members', () => {
    const mId1 = makeMember('Larry')
    const mId2 = makeMember('Mona')
    const teamId = createTeam('Team X')
    addMember(teamId, mId1)
    expect(getTeamsByMember(mId2)).toHaveLength(0)
  })
})
