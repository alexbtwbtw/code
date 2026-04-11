import { db } from '../db'
import Anthropic from '@anthropic-ai/sdk'
import { TRPCError } from '@trpc/server'
import { type RawBook, type RawRequirement, type RawReqAssignment, mapBook, mapReq, mapReqAssignment } from '../types/requirements'
import { BookInputSchema, RequirementInputSchema, ReqAssignmentInputSchema } from '../schemas/requirements'
import { extractVerbatimEvidence } from './matching'
import type { z } from 'zod'

// Keywords used for local matching: discipline → keywords found in bio/title/history
export const DISCIPLINE_KEYWORDS: Record<string, string[]> = {
  geotechnical: ['geotécni', 'geotechni', 'solos', 'soil', 'fundaç', 'foundation', 'sondagem', 'boring', 'spt', 'mecânica dos solos', 'soil mechanics'],
  structural:   ['estrutur', 'structural', 'betão', 'concrete', 'aço', 'steel', 'pontes', 'bridge', 'vigas', 'beam'],
  environmental:['ambient', 'environment', 'ecolog', 'eia', 'impacte', 'impact', 'flora', 'fauna'],
  hydraulic:    ['hidrául', 'hydraulic', 'água', 'water', 'irrigaç', 'irrigat', 'saneament', 'sanitation', 'barragem', 'dam'],
  transport:    ['transport', 'estrad', 'road', 'ponte', 'bridge', 'metro', 'aeroporto', 'airport', 'ferrovi', 'railway'],
  electrical:   ['elétr', 'electr', 'energia', 'energy', 'power', 'subestação', 'substation'],
  planning:     ['planeament', 'planning', 'urban', 'ordenament', 'território', 'territory'],
}

export const LEVEL_KEYWORDS: Record<string, string[]> = {
  junior: ['júnior', 'junior', 'trainee', 'estagiário', 'graduate'],
  mid:    ['técnico', 'engenheiro', 'engineer', 'analyst', 'analista'],
  senior: ['sénior', 'senior', 'especialista', 'specialist', 'principal', 'experiente'],
  lead:   ['lead', 'chefe', 'coordenador', 'coordinator', 'diretor', 'director', 'gestor', 'manager', 'head'],
}

// Category → discipline affinity (for history matching)
export const CAT_DISCIPLINE: Record<string, string> = {
  water: 'hydraulic', transport: 'transport', energy: 'structural',
  environment: 'environmental', planning: 'planning', other: 'other',
}

// ── Local scoring ──────────────────────────────────────────────────────────────

export function scoreRequirement(
  req: ReturnType<typeof mapReq>,
  memberBio: string,
  memberTitle: string,
  historyCats: string[],
): { score: number; reasons: string[]; matchedKeywords: string[] } {
  let score = 0
  const reasons: string[] = []
  const matchedKeywords: string[] = []
  const haystack = (memberBio + ' ' + memberTitle).toLowerCase()

  // Discipline match via keywords
  const diskws = DISCIPLINE_KEYWORDS[req.discipline] ?? []
  const diskwMatches = diskws.filter(kw => haystack.includes(kw))
  if (diskwMatches.length > 0) { score += 3; reasons.push(`perfil em ${req.discipline}`); matchedKeywords.push(...diskwMatches) }

  // Discipline match via history categories
  const matchingCat = Object.entries(CAT_DISCIPLINE).find(([, d]) => d === req.discipline)?.[0]
  const histMatches = historyCats.filter(c => c === matchingCat || CAT_DISCIPLINE[c] === req.discipline).length
  if (histMatches > 0) { score += histMatches * 2; reasons.push(`${histMatches} projeto(s) em ${req.discipline}`) }

  // Level match
  if (req.level !== 'any') {
    const lvlkws = LEVEL_KEYWORDS[req.level] ?? []
    const lvlMatches = lvlkws.filter(kw => haystack.includes(kw))
    if (lvlMatches.length > 0) { score += 2; reasons.push(`nível ${req.level}`); matchedKeywords.push(...lvlMatches) }
  }

  // Years experience (crude proxy: count history entries)
  if (req.yearsExperience != null && histMatches >= Math.ceil(req.yearsExperience / 3)) {
    score += 1; reasons.push(`experiência suficiente`)
  }

  // Certifications keywords
  const certWords = req.certifications.toLowerCase().split(/[\s,;]+/).filter(w => w.length > 3)
  const certMatches = certWords.filter(w => haystack.includes(w))
  if (certMatches.length > 0) { score += certMatches.length; reasons.push(`certificações: ${certMatches.join(', ')}`); matchedKeywords.push(...certMatches) }

  return { score, reasons, matchedKeywords }
}

// ── Books ──────────────────────────────────────────────────────────────────────

export function listBooks() {
  const books = db.prepare(`SELECT * FROM requirement_books ORDER BY created_at DESC`).all() as RawBook[]
  return books.map(b => {
    const count = (db.prepare(`SELECT COUNT(*) as n FROM requirements WHERE book_id = ?`).get(b.id) as { n: number }).n
    const project = b.project_id
      ? (db.prepare(`SELECT ref_code, name FROM projects WHERE id = ?`).get(b.project_id) as { ref_code: string; name: string } | undefined)
      : undefined
    return { ...mapBook(b), requirementCount: count, projectName: project?.name, projectRefCode: project?.ref_code }
  })
}

export function getBookById(id: number) {
  const book = db.prepare(`SELECT * FROM requirement_books WHERE id = ?`).get(id) as RawBook | undefined
  if (!book) return null
  const rawReqs = db.prepare(`SELECT * FROM requirements WHERE book_id = ? ORDER BY created_at ASC`).all(id) as RawRequirement[]
  const reqs = rawReqs.map(r => {
    const mapped = mapReq(r)
    const assignments = (db.prepare(`
      SELECT ra.*, tm.name as member_name, tm.title as member_title
      FROM requirement_assignments ra
      JOIN team_members tm ON tm.id = ra.team_member_id
      WHERE ra.requirement_id = ?
      ORDER BY ra.created_at ASC
    `).all(r.id) as RawReqAssignment[]).map(mapReqAssignment)
    return { ...mapped, assignments }
  })
  type RawLinkedProject = { id: number; ref_code: string; name: string }
  const rawProj = book.project_id
    ? (db.prepare(`SELECT id, ref_code, name FROM projects WHERE id = ?`).get(book.project_id) as RawLinkedProject | undefined)
    : undefined
  const project = rawProj ? { id: rawProj.id, refCode: rawProj.ref_code, name: rawProj.name } : undefined
  return { ...mapBook(book), requirements: reqs, project }
}

export function createBook(input: z.infer<typeof BookInputSchema>) {
  const r = db.prepare(`
    INSERT INTO requirement_books (title, project_id, category, description)
    VALUES (@title, @projectId, @category, @description)
  `).run({ title: input.title, projectId: input.projectId ?? null, category: input.category, description: input.description })
  return mapBook(db.prepare(`SELECT * FROM requirement_books WHERE id = ?`).get(r.lastInsertRowid) as RawBook)
}

export function updateBook(input: z.infer<typeof BookInputSchema> & { id: number }) {
  db.prepare(`
    UPDATE requirement_books SET title=@title, project_id=@projectId, category=@category,
      description=@description, updated_at=datetime('now')
    WHERE id=@id
  `).run({ id: input.id, title: input.title, projectId: input.projectId ?? null, category: input.category, description: input.description })
  return mapBook(db.prepare(`SELECT * FROM requirement_books WHERE id = ?`).get(input.id) as RawBook)
}

export function deleteBook(id: number) {
  db.prepare(`DELETE FROM requirement_books WHERE id = ?`).run(id)
  return { success: true }
}

// ── Requirements ──────────────────────────────────────────────────────────────

export function createRequirement(input: z.infer<typeof RequirementInputSchema>) {
  const r = db.prepare(`
    INSERT INTO requirements (book_id, title, description, discipline, level, years_experience,
      certifications, notes, compliance_note, source_evidence)
    VALUES (@bookId, @title, @description, @discipline, @level, @yearsExperience,
      @certifications, @notes, @complianceNote, @sourceEvidence)
  `).run({ ...input, yearsExperience: input.yearsExperience ?? null })
  return mapReq(db.prepare(`SELECT * FROM requirements WHERE id = ?`).get(r.lastInsertRowid) as RawRequirement)
}

export function updateRequirement(input: z.infer<typeof RequirementInputSchema> & { id: number }) {
  db.prepare(`
    UPDATE requirements SET title=@title, description=@description, discipline=@discipline,
      level=@level, years_experience=@yearsExperience, certifications=@certifications,
      notes=@notes, compliance_note=@complianceNote, source_evidence=@sourceEvidence
    WHERE id=@id
  `).run({ ...input, yearsExperience: input.yearsExperience ?? null })
  return mapReq(db.prepare(`SELECT * FROM requirements WHERE id = ?`).get(input.id) as RawRequirement)
}

export function deleteRequirement(id: number) {
  db.prepare(`DELETE FROM requirements WHERE id = ?`).run(id)
  return { success: true }
}

// ── Requirement assignments ────────────────────────────────────────────────────

export function addReqAssignment(input: z.infer<typeof ReqAssignmentInputSchema>) {
  const existing = db.prepare(`SELECT id FROM requirement_assignments WHERE requirement_id=? AND team_member_id=?`).get(input.requirementId, input.teamMemberId)
  if (existing) {
    db.prepare(`UPDATE requirement_assignments SET rationale=@rationale WHERE requirement_id=@requirementId AND team_member_id=@teamMemberId`).run(input)
  } else {
    db.prepare(`INSERT INTO requirement_assignments (requirement_id, team_member_id, rationale) VALUES (@requirementId, @teamMemberId, @rationale)`).run(input)
  }
  const row = db.prepare(`
    SELECT ra.*, tm.name as member_name, tm.title as member_title
    FROM requirement_assignments ra JOIN team_members tm ON tm.id = ra.team_member_id
    WHERE ra.requirement_id=? AND ra.team_member_id=?
  `).get(input.requirementId, input.teamMemberId) as RawReqAssignment
  return mapReqAssignment(row)
}

export function removeReqAssignment(requirementId: number, teamMemberId: number) {
  db.prepare(`DELETE FROM requirement_assignments WHERE requirement_id=? AND team_member_id=?`).run(requirementId, teamMemberId)
  return { success: true }
}

// ── Match members (local + AI) ────────────────────────────────────────────────

type RawMemberForMatch = { id: number; name: string; title: string; bio: string; email: string }

function buildMemberData() {
  const members = db.prepare(`SELECT id, name, title, bio, email FROM team_members ORDER BY name ASC`).all() as RawMemberForMatch[]
  return members.map(m => {
    const cats = (db.prepare(`SELECT category FROM member_history WHERE team_member_id = ?`).all(m.id) as { category: string }[]).map(r => r.category)
    const recentHistory = (db.prepare(`SELECT project_name, category, country FROM member_history WHERE team_member_id = ? ORDER BY created_at DESC LIMIT 3`).all(m.id) as { project_name: string; category: string; country: string }[])
    const cv = db.prepare(`SELECT id, filename FROM member_cvs WHERE team_member_id = ? ORDER BY uploaded_at DESC LIMIT 1`).get(m.id) as { id: number; filename: string } | undefined
    const projCount = (db.prepare(`SELECT COUNT(*) as n FROM project_team WHERE team_member_id = ?`).get(m.id) as { n: number }).n
    return { ...m, historyCats: cats, recentHistory, cvId: cv?.id ?? null, cvFilename: cv?.filename ?? null, projectCount: projCount }
  })
}

export function matchMembersLocal(requirementId: number, topN: number) {
  const rawReq = db.prepare(`SELECT * FROM requirements WHERE id = ?`).get(requirementId) as RawRequirement | undefined
  if (!rawReq) throw new TRPCError({ code: 'NOT_FOUND', message: 'Requisito não encontrado' })
  const req = mapReq(rawReq)

  const memberData = buildMemberData()

  const scored = memberData.map(m => {
    const { score, reasons, matchedKeywords } = scoreRequirement(req, m.bio, m.title, m.historyCats)

    const rationale = reasons.length > 0
      ? reasons.slice(0, 4).join('; ')
      : m.historyCats.length > 0
        ? `${m.historyCats.length} projeto(s) em histórico, sem correspondência direta`
        : 'Sem histórico de projetos registado'

    const evidence = extractVerbatimEvidence(m.bio, matchedKeywords)

    return {
      memberId: m.id, name: m.name, title: m.title, email: m.email,
      bio: m.bio, historyCount: m.historyCats.length, projectCount: m.projectCount,
      cvId: m.cvId, cvFilename: m.cvFilename,
      recentHistory: m.recentHistory.map(h => ({ projectName: h.project_name, category: h.category, country: h.country })),
      score, rationale, evidence,
    }
  })

  return scored.sort((a, b) => b.score - a.score).slice(0, topN)
}

export async function matchMembersAi(requirementId: number, topN: number) {
  const rawReq = db.prepare(`SELECT * FROM requirements WHERE id = ?`).get(requirementId) as RawRequirement | undefined
  if (!rawReq) throw new TRPCError({ code: 'NOT_FOUND', message: 'Requisito não encontrado' })
  const req = mapReq(rawReq)

  const memberData = buildMemberData()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'ANTHROPIC_API_KEY não configurada.' })
  }
  const client = new Anthropic({ apiKey })

  const reqPayload = {
    title: req.title, discipline: req.discipline, level: req.level,
    yearsExperience: req.yearsExperience, certifications: req.certifications,
    description: req.description, notes: req.notes,
  }
  const membersPayload = memberData.map(m => ({
    id: m.id, name: m.name, title: m.title, bio: m.bio,
    history: m.historyCats.map((c, i) => ({ category: c, project: m.recentHistory[i]?.project_name ?? '' })),
  }))

  const prompt = `You are helping find the best team members for a single engineering requirement ("Requisito de Engenharia").

REQUIREMENT:
${JSON.stringify(reqPayload, null, 2)}

CANDIDATES (${memberData.length} total):
${JSON.stringify(membersPayload, null, 2)}

Task: Identify the top ${topN} candidates whose skills, experience, and background best match this specific requirement. Consider discipline alignment, seniority level, years of experience, certifications, and relevant project history.

Return ONLY a JSON array of exactly ${topN} objects ordered best-to-worst:
[{
  "memberId": <number>,
  "rationale": "<1-2 sentences in Portuguese explaining why this person fits this specific requirement>",
  "evidence": "<verbatim excerpt copied word-for-word from the candidate's bio field — do NOT paraphrase or rewrite, quote exactly as written; use empty string if nothing relevant>"
}]

No markdown, no extra text — only the JSON array.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  let aiResults: { memberId: number; rationale: string; evidence: string }[]
  try { aiResults = JSON.parse(jsonText) } catch {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Resposta inválida da IA. Tente novamente.' })
  }

  return aiResults.filter(r => typeof r.memberId === 'number').map(r => {
    const m = memberData.find(x => x.id === r.memberId)
    return {
      memberId: r.memberId, name: m?.name ?? '', title: m?.title ?? '', email: m?.email ?? '',
      bio: m?.bio ?? '', historyCount: m?.historyCats.length ?? 0, projectCount: m?.projectCount ?? 0,
      cvId: m?.cvId ?? null, cvFilename: m?.cvFilename ?? null,
      recentHistory: (m?.recentHistory ?? []).map(h => ({ projectName: h.project_name, category: h.category, country: h.country })),
      rationale: r.rationale, evidence: r.evidence ?? '',
    }
  })
}
