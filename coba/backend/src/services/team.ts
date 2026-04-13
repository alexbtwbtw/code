import { z } from 'zod'
import { db } from '../db'
import { parseCv } from '../lib/parseCv'
import { suggestMembersAi, type MemberSnapshot, type ProjectSnapshot } from '../lib/suggestMembersAi'
import {
  type RawMember, type RawHistory, type RawHistoryGeo, type RawHistoryStructure,
  type RawHistoryFeature, type RawCv,
  mapMember, mapHistory, mapHistoryGeo, mapHistoryStructure, mapHistoryFeature,
} from '../types/team'
import { MemberInputSchema, HistoryGeoSchema, HistoryStructureSchema, HistoryFeatureSchema, HistoryInputSchema } from '../schemas/team'
import { extractVerbatimEvidence } from './matching'

// ── Prepared statements ───────────────────────────────────────────────────────

const stmtHistoryGeo = db.prepare(`
  INSERT INTO member_history_geo (history_id, point_label, type, macro_region, country, place,
    depth, soil_type, rock_type, groundwater_depth, bearing_capacity, spt_n_value,
    seismic_class, latitude, longitude, sampled_at, notes)
  VALUES (@history_id, @point_label, @type, @macro_region, @country, @place,
    @depth, @soil_type, @rock_type, @groundwater_depth, @bearing_capacity, @spt_n_value,
    @seismic_class, @latitude, @longitude, @sampled_at, @notes)
`)

const stmtHistoryStructure = db.prepare(`
  INSERT INTO member_history_structures (history_id, label, type, material, macro_region, country, place,
    length_m, height_m, span_m, foundation_type, design_load, latitude, longitude, built_at, notes)
  VALUES (@history_id, @label, @type, @material, @macro_region, @country, @place,
    @length_m, @height_m, @span_m, @foundation_type, @design_load, @latitude, @longitude, @built_at, @notes)
`)

const stmtHistoryFeature = db.prepare(`
  INSERT INTO member_history_features (history_id, label, description, macro_region, country, place, latitude, longitude, notes)
  VALUES (@history_id, @label, @description, @macro_region, @country, @place, @latitude, @longitude, @notes)
`)

// ── Sub-entry helpers ─────────────────────────────────────────────────────────

export function insertHistoryGeoEntries(historyId: number | bigint, geoEntries: z.infer<typeof HistoryGeoSchema>[]) {
  for (const g of geoEntries) {
    stmtHistoryGeo.run({
      history_id: historyId, point_label: g.pointLabel, type: g.type,
      macro_region: g.macroRegion, country: g.country, place: g.place,
      depth: g.depth ?? null, soil_type: g.soilType, rock_type: g.rockType,
      groundwater_depth: g.groundwaterDepth ?? null, bearing_capacity: g.bearingCapacity ?? null,
      spt_n_value: g.sptNValue ?? null, seismic_class: g.seismicClass,
      latitude: g.latitude ?? null, longitude: g.longitude ?? null,
      sampled_at: g.sampledAt ?? null, notes: g.notes,
    })
  }
}

export function insertHistoryStructures(historyId: number | bigint, structures: z.infer<typeof HistoryStructureSchema>[]) {
  for (const s of structures) {
    stmtHistoryStructure.run({
      history_id: historyId, label: s.label, type: s.type, material: s.material,
      macro_region: s.macroRegion, country: s.country, place: s.place,
      length_m: s.lengthM ?? null, height_m: s.heightM ?? null, span_m: s.spanM ?? null,
      foundation_type: s.foundationType, design_load: s.designLoad ?? null,
      latitude: s.latitude ?? null, longitude: s.longitude ?? null,
      built_at: s.builtAt ?? null, notes: s.notes,
    })
  }
}

export function insertHistoryFeatures(historyId: number | bigint, features: z.infer<typeof HistoryFeatureSchema>[]) {
  for (const f of features) {
    stmtHistoryFeature.run({
      history_id: historyId, label: f.label, description: f.description,
      macro_region: f.macroRegion, country: f.country, place: f.place,
      latitude: f.latitude ?? null, longitude: f.longitude ?? null, notes: f.notes,
    })
  }
}

export function getHistoryWithSubEntries(historyRows: RawHistory[]) {
  return historyRows.map(h => {
    const geo      = (db.prepare(`SELECT * FROM member_history_geo        WHERE history_id = ? ORDER BY point_label ASC`).all(h.id) as RawHistoryGeo[]).map(mapHistoryGeo)
    const structs  = (db.prepare(`SELECT * FROM member_history_structures WHERE history_id = ? ORDER BY label ASC`).all(h.id) as RawHistoryStructure[]).map(mapHistoryStructure)
    const features = (db.prepare(`SELECT * FROM member_history_features   WHERE history_id = ? ORDER BY label ASC`).all(h.id) as RawHistoryFeature[]).map(mapHistoryFeature)
    return { ...mapHistory(h), geoEntries: geo, structures: structs, features }
  })
}

// ── Service functions ─────────────────────────────────────────────────────────

export function listMembers() {
  const rows = db.prepare(`
    SELECT m.*, COUNT(pt.project_id) AS project_count
    FROM team_members m
    LEFT JOIN project_team pt ON pt.team_member_id = m.id
    GROUP BY m.id ORDER BY m.name ASC
  `).all() as (RawMember & { project_count: number })[]
  return rows.map(r => ({ ...mapMember(r), projectCount: r.project_count }))
}

export function getMemberById(id: number) {
  const member = db.prepare(`SELECT * FROM team_members WHERE id = ?`).get(id) as RawMember | undefined
  if (!member) return null

  const taggedProjects = db.prepare(`
    SELECT p.id, p.ref_code, p.name, p.country, p.status, p.category, pt.role_on_project
    FROM project_team pt JOIN projects p ON p.id = pt.project_id
    WHERE pt.team_member_id = ? ORDER BY p.start_date DESC
  `).all(id) as { id: number; ref_code: string; name: string; country: string; status: string; category: string; role_on_project: string }[]

  const historyRows = db.prepare(`SELECT * FROM member_history WHERE team_member_id = ? ORDER BY created_at DESC`).all(id) as RawHistory[]
  const cvs = db.prepare(`SELECT id, filename, file_size, uploaded_at FROM member_cvs WHERE team_member_id = ? ORDER BY uploaded_at DESC`).all(id) as RawCv[]

  return {
    ...mapMember(member),
    taggedProjects: taggedProjects.map(p => ({ id: p.id, refCode: p.ref_code, name: p.name, country: p.country, status: p.status, category: p.category, roleOnProject: p.role_on_project })),
    history: getHistoryWithSubEntries(historyRows),
    cvs: cvs.map(c => ({ id: c.id, filename: c.filename, fileSize: c.file_size, uploadedAt: c.uploaded_at })),
  }
}

export function createMember(input: z.infer<typeof MemberInputSchema> & { cv?: { filename: string; fileSize: number; fileData: string } }) {
  const { cv, ...memberData } = input
  const result = db.prepare(`INSERT INTO team_members (name, title, email, phone, bio) VALUES (@name, @title, @email, @phone, @bio)`).run(memberData)
  const memberId = result.lastInsertRowid
  if (cv) {
    db.prepare(`INSERT INTO member_cvs (team_member_id, filename, file_size, file_data) VALUES (@team_member_id, @filename, @file_size, @file_data)`)
      .run({ team_member_id: Number(memberId), filename: cv.filename, file_size: cv.fileSize, file_data: cv.fileData })
  }
  return mapMember(db.prepare(`SELECT * FROM team_members WHERE id = ?`).get(memberId) as RawMember)
}

export function updateMember(input: z.infer<typeof MemberInputSchema> & { id: number }) {
  db.prepare(`UPDATE team_members SET name=@name, title=@title, email=@email, phone=@phone, bio=@bio, updated_at=datetime('now') WHERE id=@id`).run(input)
  return mapMember(db.prepare(`SELECT * FROM team_members WHERE id = ?`).get(input.id) as RawMember)
}

export function deleteMember(id: number) {
  db.prepare(`DELETE FROM team_members WHERE id = ?`).run(id)
  return { success: true }
}

export function getMembersByProject(projectId: number) {
  const rows = db.prepare(`
    SELECT m.*, pt.role_on_project FROM project_team pt
    JOIN team_members m ON m.id = pt.team_member_id
    WHERE pt.project_id = ? ORDER BY m.name ASC
  `).all(projectId) as (RawMember & { role_on_project: string })[]
  return rows.map(r => ({ ...mapMember(r), roleOnProject: r.role_on_project }))
}

export function tagProject(projectId: number, teamMemberId: number, roleOnProject: string) {
  db.prepare(`INSERT OR REPLACE INTO project_team (project_id, team_member_id, role_on_project) VALUES (@project_id, @team_member_id, @role_on_project)`)
    .run({ project_id: projectId, team_member_id: teamMemberId, role_on_project: roleOnProject })
  return { success: true }
}

export function untagProject(projectId: number, teamMemberId: number) {
  db.prepare(`DELETE FROM project_team WHERE project_id = ? AND team_member_id = ?`).run(projectId, teamMemberId)
  return { success: true }
}

export function addHistory(input: z.infer<typeof HistoryInputSchema>) {
  const addFull = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO member_history (team_member_id, project_id, project_name, macro_region, country, place, category, start_date, end_date, notes)
      VALUES (@teamMemberId, @projectId, @projectName, @macroRegion, @country, @place, @category, @startDate, @endDate, @notes)
    `).run({ ...input, startDate: input.startDate ?? null, endDate: input.endDate ?? null })
    const hid = result.lastInsertRowid
    insertHistoryGeoEntries(hid, input.geoEntries)
    insertHistoryStructures(hid, input.structures)
    insertHistoryFeatures(hid, input.features)
    return hid
  })
  const hid = addFull()
  return getHistoryWithSubEntries([db.prepare(`SELECT * FROM member_history WHERE id = ?`).get(hid) as RawHistory])[0]
}

export function updateHistory(input: z.infer<typeof HistoryInputSchema> & { id: number }) {
  const updateFull = db.transaction(() => {
    db.prepare(`
      UPDATE member_history SET project_id=@projectId, project_name=@projectName,
        macro_region=@macroRegion, country=@country, place=@place,
        category=@category, start_date=@startDate, end_date=@endDate, notes=@notes
      WHERE id=@id
    `).run({ ...input, startDate: input.startDate ?? null, endDate: input.endDate ?? null })
    db.prepare(`DELETE FROM member_history_geo        WHERE history_id = ?`).run(input.id)
    db.prepare(`DELETE FROM member_history_structures WHERE history_id = ?`).run(input.id)
    db.prepare(`DELETE FROM member_history_features   WHERE history_id = ?`).run(input.id)
    insertHistoryGeoEntries(input.id, input.geoEntries)
    insertHistoryStructures(input.id, input.structures)
    insertHistoryFeatures(input.id, input.features)
  })
  updateFull()
  return getHistoryWithSubEntries([db.prepare(`SELECT * FROM member_history WHERE id = ?`).get(input.id) as RawHistory])[0]
}

export function deleteHistory(id: number) {
  db.prepare(`DELETE FROM member_history WHERE id = ?`).run(id)
  return { success: true }
}

export async function getCvData(cvId: number) {
  const row = db.prepare(`SELECT filename, file_data, s3_key FROM member_cvs WHERE id = ?`).get(cvId) as
    { filename: string; file_data: string | null; s3_key: string | null } | undefined
  if (!row) return null
  if (row.s3_key) {
    const { getPresignedDownloadUrl } = await import('../lib/s3')
    const presignedUrl = await getPresignedDownloadUrl(row.s3_key)
    return { filename: row.filename, presignedUrl }
  }
  return { filename: row.filename, fileData: row.file_data }
}

export async function attachCv(input: { teamMemberId: number; filename: string; fileSize: number; fileData?: string }) {
  const { s3Enabled, getPresignedUploadUrl } = await import('../lib/s3')
  if (s3Enabled()) {
    const s3Key = `cvs/${input.teamMemberId}/${input.filename}`
    const presignedUrl = await getPresignedUploadUrl(s3Key, 'application/pdf')
    const result = db.prepare(`
      INSERT INTO member_cvs (team_member_id, filename, file_size, s3_key)
      VALUES (@team_member_id, @filename, @file_size, @s3_key)
    `).run({ team_member_id: input.teamMemberId, filename: input.filename, file_size: input.fileSize, s3_key: s3Key })
    return { id: Number(result.lastInsertRowid), filename: input.filename, fileSize: input.fileSize, presignedUrl, s3Key }
  }
  const result = db.prepare(`
    INSERT INTO member_cvs (team_member_id, filename, file_size, file_data)
    VALUES (@team_member_id, @filename, @file_size, @file_data)
  `).run({ team_member_id: input.teamMemberId, filename: input.filename, file_size: input.fileSize, file_data: input.fileData ?? '' })
  return { id: Number(result.lastInsertRowid), filename: input.filename, fileSize: input.fileSize }
}

export function createWithHistory(input: {
  member: z.infer<typeof MemberInputSchema>
  history: Array<{
    projectName: string; macroRegion: string; country: string; place: string
    category: string; startDate?: string; endDate?: string; notes: string
    geoEntries: z.infer<typeof HistoryGeoSchema>[]
    structures: z.infer<typeof HistoryStructureSchema>[]
    features: z.infer<typeof HistoryFeatureSchema>[]
  }>
  cv?: { filename: string; fileSize: number; fileData: string }
}) {
  const run = db.transaction(() => {
    const memberResult = db.prepare(`
      INSERT INTO team_members (name, title, email, phone, bio)
      VALUES (@name, @title, @email, @phone, @bio)
    `).run(input.member)
    const memberId = memberResult.lastInsertRowid

    if (input.cv) {
      db.prepare(`INSERT INTO member_cvs (team_member_id, filename, file_size, file_data) VALUES (@team_member_id, @filename, @file_size, @file_data)`)
        .run({ team_member_id: memberId, filename: input.cv.filename, file_size: input.cv.fileSize, file_data: input.cv.fileData })
    }

    for (const h of input.history) {
      const histResult = db.prepare(`
        INSERT INTO member_history (team_member_id, project_id, project_name, macro_region, country, place, category, start_date, end_date, notes)
        VALUES (@teamMemberId, @projectId, @projectName, @macroRegion, @country, @place, @category, @startDate, @endDate, @notes)
      `).run({ teamMemberId: memberId, projectId: null, projectName: h.projectName, macroRegion: h.macroRegion, country: h.country, place: h.place, category: h.category, startDate: h.startDate ?? null, endDate: h.endDate ?? null, notes: h.notes })
      insertHistoryGeoEntries(histResult.lastInsertRowid, h.geoEntries)
      insertHistoryStructures(histResult.lastInsertRowid, h.structures)
      insertHistoryFeatures(histResult.lastInsertRowid, h.features)
    }
    return memberId
  })

  const memberId = run()
  return mapMember(db.prepare(`SELECT * FROM team_members WHERE id = ?`).get(memberId) as RawMember)
}

export function parseCvService(pdfBase64: string) {
  return parseCv(pdfBase64)
}

export function suggestMembers(input: { projectId: number; mode: 'ai' | 'local'; topN: number }) {
  type RawProj = { name: string; category: string; country: string; macro_region: string; description: string; tags: string }
  const project = db.prepare(`SELECT name, category, country, macro_region, description, tags FROM projects WHERE id = ?`).get(input.projectId) as RawProj | undefined
  if (!project) throw new Error(`Project ${input.projectId} not found`)

  type RawStr = { type: string; material: string }
  const projStructures = db.prepare(`SELECT type, material FROM structures WHERE project_id = ?`).all(input.projectId) as RawStr[]

  const projectSnap: ProjectSnapshot = {
    name: project.name, category: project.category,
    country: project.country, macroRegion: project.macro_region,
    description: project.description, tags: project.tags,
    structures: projStructures,
  }

  const allMembers = db.prepare(`SELECT * FROM team_members ORDER BY name ASC`).all() as RawMember[]
  const snapshots: MemberSnapshot[] = allMembers.map(m => {
    const histRows = db.prepare(`SELECT * FROM member_history WHERE team_member_id = ?`).all(m.id) as RawHistory[]
    const history = histRows.map(h => {
      const hStructs = db.prepare(`SELECT type FROM member_history_structures WHERE history_id = ?`).all(h.id) as { type: string }[]
      return { projectName: h.project_name, category: h.category, country: h.country, macroRegion: h.macro_region, notes: h.notes, structures: hStructs }
    })
    return { id: m.id, name: m.name, title: m.title, bio: m.bio, history }
  })

  function memberDetail(m: RawMember, snap: MemberSnapshot) {
    const cv = db.prepare(`SELECT id, filename FROM member_cvs WHERE team_member_id = ? ORDER BY uploaded_at DESC LIMIT 1`).get(m.id) as { id: number; filename: string } | undefined
    const projCount = (db.prepare(`SELECT COUNT(*) as n FROM project_team WHERE team_member_id = ?`).get(m.id) as { n: number }).n
    return {
      bio: m.bio, email: m.email,
      historyCount: snap.history.length,
      projectCount: projCount,
      cvId: cv?.id ?? null,
      cvFilename: cv?.filename ?? null,
      recentHistory: snap.history.slice(0, 3).map(h => ({ projectName: h.projectName, category: h.category, country: h.country })),
    }
  }

  if (input.mode === 'ai') {
    return suggestMembersAi(projectSnap, snapshots, input.topN).then(aiResults =>
      aiResults.map(r => {
        const m = allMembers.find(x => x.id === r.memberId)
        const snap = snapshots.find(x => x.id === r.memberId)
        return { memberId: r.memberId, name: m?.name ?? '', title: m?.title ?? '', rationale: r.rationale, evidence: r.evidence ?? '', ...memberDetail(m!, snap!) }
      })
    )
  }

  // Local scoring
  const projCat     = project.category.toLowerCase()
  const projCountry = project.country.toLowerCase()
  const projRegion  = project.macro_region.toLowerCase()
  const projStructTypes = new Set(projStructures.map(s => s.type))
  const projKeywords = new Set([
    ...(project.tags || '').split(',').map(t => t.trim().toLowerCase()).filter(w => w.length > 3),
    ...(project.description || '').toLowerCase().split(/\W+/).filter(w => w.length > 4),
  ])

  const scored = snapshots.map(m => {
    const member = allMembers.find(x => x.id === m.id)!
    let score = 0
    const reasons: string[] = []

    const catMatches = m.history.filter(h => h.category.toLowerCase() === projCat).length
    if (catMatches > 0) { score += catMatches * 3; reasons.push(`${catMatches} projeto(s) em ${projCat}`) }

    const countryMatches = m.history.filter(h => h.country.toLowerCase() === projCountry).length
    if (countryMatches > 0) { score += countryMatches * 3; reasons.push(`${countryMatches} projeto(s) em ${project.country}`) }

    const regionOnly = m.history.filter(h => h.macroRegion.toLowerCase() === projRegion && h.country.toLowerCase() !== projCountry).length
    if (regionOnly > 0) { score += regionOnly * 2; reasons.push(`${regionOnly} projeto(s) na região ${project.macro_region}`) }

    const matchedStructTypes = [...projStructTypes].filter(t => m.history.some(h => h.structures.some(s => s.type === t)))
    if (matchedStructTypes.length > 0) { score += matchedStructTypes.length * 2; reasons.push(`Experiência em ${matchedStructTypes.join(', ')}`) }

    const memberText = [m.bio, ...m.history.map(h => h.notes)].join(' ').toLowerCase()
    const kwMatches = [...projKeywords].filter(k => k.length > 4 && memberText.includes(k))
    if (kwMatches.length > 0) { score += Math.min(kwMatches.length, 5); reasons.push(`Palavras-chave: ${kwMatches.slice(0, 3).join(', ')}`) }

    const rationale = reasons.length > 0
      ? reasons.join('; ')
      : m.history.length > 0
        ? `${m.history.length} projeto(s) em histórico, sem correspondência direta`
        : 'Sem histórico de projetos registado'

    const evidence = extractVerbatimEvidence(m.bio, kwMatches)

    return { memberId: m.id, name: m.name, title: m.title, score, rationale, evidence, ...memberDetail(member, m) }
  })

  return scored.sort((a, b) => b.score - a.score).slice(0, input.topN)
}
