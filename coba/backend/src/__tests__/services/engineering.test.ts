import { describe, it, expect } from 'vitest'
import { db } from '../../db'
import { engineeringRouter } from '../../router/engineering'
import type { AppContext } from '../../trpc'
import app from '../../index'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeProject(refCode = 'ENG-001') {
  return Number(
    db
      .prepare(
        `INSERT INTO projects (ref_code, name, client, macro_region, country, place, category, status, priority, currency, project_manager, description, tags)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(refCode, 'Eng Project', 'ACME', 'EMEA', 'Portugal', 'Lisbon', 'transport', 'active', 'medium', 'EUR', 'PM', '', '')
      .lastInsertRowid,
  )
}

function insertDwgFile(overrides: { projectId?: number | null; fileName?: string } = {}) {
  const buf = Buffer.from('AC1032test_data_here')
  const { projectId = null, fileName = 'test.dwg' } = overrides
  const result = db
    .prepare(
      `INSERT INTO dwg_files (project_id, file_name, display_name, notes, original_dwg, dwg_version, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(projectId, fileName, fileName, '', buf, '2018+', buf.length)
  return Number(result.lastInsertRowid)
}

function authedCtx(): AppContext {
  return { userRole: 'manager', userId: '1', userName: 'Tester' }
}

function anonCtx(): AppContext {
  return { userRole: null, userId: null, userName: null }
}

// ── engineering.list ──────────────────────────────────────────────────────────

describe('engineering.list', () => {
  it('returns empty array when no files exist', async () => {
    const caller = engineeringRouter.createCaller(anonCtx())
    const result = await caller.list()
    expect(result).toEqual([])
  })

  it('returns all files after inserting directly into DB', async () => {
    insertDwgFile({ fileName: 'drawing1.dwg' })
    insertDwgFile({ fileName: 'drawing2.dwg' })

    const caller = engineeringRouter.createCaller(anonCtx())
    const result = await caller.list()

    expect(result).toHaveLength(2)
    // Result shape
    expect(result[0]).toMatchObject({
      id: expect.any(Number),
      fileName: expect.any(String),
      displayName: expect.any(String),
      notes: '',
      dwgVersion: '2018+',
      fileSize: expect.any(Number),
      uploadedAt: expect.any(String),
    })
  })
})

// ── engineering.byProject ─────────────────────────────────────────────────────

describe('engineering.byProject', () => {
  it('returns only files belonging to the specified project', async () => {
    const pId1 = makeProject('ENG-P1')
    const pId2 = makeProject('ENG-P2')

    insertDwgFile({ projectId: pId1, fileName: 'plan-a.dwg' })
    insertDwgFile({ projectId: pId1, fileName: 'plan-b.dwg' })
    insertDwgFile({ projectId: pId2, fileName: 'other.dwg' })

    const caller = engineeringRouter.createCaller(anonCtx())
    const result = await caller.byProject({ projectId: pId1 })

    expect(result).toHaveLength(2)
    expect(result.every(f => f.projectId === pId1)).toBe(true)
  })

  it('returns empty array when project has no files', async () => {
    const pId = makeProject('ENG-EMPTY')
    const caller = engineeringRouter.createCaller(anonCtx())
    const result = await caller.byProject({ projectId: pId })
    expect(result).toEqual([])
  })
})

// ── engineering.update ────────────────────────────────────────────────────────

describe('engineering.update', () => {
  it('updates displayName and notes for authed user', async () => {
    const id = insertDwgFile({ fileName: 'update-test.dwg' })

    const caller = engineeringRouter.createCaller(authedCtx())
    const result = await caller.update({
      id,
      displayName: 'My Drawing',
      notes: 'Updated notes',
    })

    expect(result).toEqual({ success: true })

    // Verify DB was updated
    const row = db.prepare(`SELECT display_name, notes FROM dwg_files WHERE id = ?`).get(id) as
      { display_name: string; notes: string }
    expect(row.display_name).toBe('My Drawing')
    expect(row.notes).toBe('Updated notes')
  })

  it('throws UNAUTHORIZED when called with no auth context', async () => {
    const id = insertDwgFile()
    const caller = engineeringRouter.createCaller(anonCtx())
    await expect(caller.update({ id, displayName: 'Hacked' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })
})

// ── engineering.delete ────────────────────────────────────────────────────────

describe('engineering.delete', () => {
  it('removes the file when called by authed user', async () => {
    const id = insertDwgFile({ fileName: 'to-delete.dwg' })

    const caller = engineeringRouter.createCaller(authedCtx())
    const result = await caller.delete({ id })

    expect(result).toEqual({ success: true })

    const row = db.prepare(`SELECT id FROM dwg_files WHERE id = ?`).get(id)
    expect(row).toBeUndefined()
  })

  it('throws UNAUTHORIZED when called with no auth context', async () => {
    const id = insertDwgFile()
    const caller = engineeringRouter.createCaller(anonCtx())
    await expect(caller.delete({ id })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })
})

// ── DWG magic-byte validation via HTTP endpoint ────────────────────────────────

describe('POST /api/engineering/upload — DWG validation', () => {
  // The upload endpoint requires authentication (x-user-role header)
  const AUTH_HEADERS = { 'x-user-role': 'manager', 'x-user-id': '1', 'x-user-name': 'Tester' }

  async function uploadBuffer(buf: Buffer, fileName = 'test.dwg', authed = true): Promise<Response> {
    const formData = new FormData()
    formData.append('file', new File([buf], fileName))
    return app.request('/api/engineering/upload', {
      method: 'POST',
      body: formData,
      headers: authed ? AUTH_HEADERS : {},
    })
  }

  it('accepts a valid AC1032 DWG buffer and detects version "2018+"', async () => {
    const buf = Buffer.from('AC1032' + 'x'.repeat(100))
    const res = await uploadBuffer(buf, 'valid.dwg')
    expect(res.status).toBe(201)
    const body = await res.json() as { dwgVersion: string }
    expect(body.dwgVersion).toBe('2018+')
  })

  it('accepts a valid AC1015 DWG buffer and detects version "2000"', async () => {
    const buf = Buffer.from('AC1015' + 'x'.repeat(100))
    const res = await uploadBuffer(buf, 'old.dwg')
    expect(res.status).toBe(201)
    const body = await res.json() as { dwgVersion: string }
    expect(body.dwgVersion).toBe('2000')
  })

  it('rejects a buffer starting with PK (zip/docx) with 400', async () => {
    const buf = Buffer.from('PK\x03\x04' + 'x'.repeat(100))
    const res = await uploadBuffer(buf, 'fake.dwg')
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/invalid dwg/i)
  })

  it('rejects a buffer shorter than 6 bytes with 400', async () => {
    const buf = Buffer.from('AC')   // only 2 bytes
    const res = await uploadBuffer(buf, 'tiny.dwg')
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/invalid dwg/i)
  })

  it('rejects an unauthenticated upload with 401', async () => {
    const buf = Buffer.from('AC1032' + 'x'.repeat(100))
    const res = await uploadBuffer(buf, 'valid.dwg', false)
    expect(res.status).toBe(401)
  })
})
