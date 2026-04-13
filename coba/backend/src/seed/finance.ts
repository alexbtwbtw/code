import { db } from '../db'
import { insertMemberRate, insertFixedCost } from '../db/statements/finance'

function seedRate(teamMemberId: number, hourlyRate: number, effectiveFrom: string, notes: string) {
  insertMemberRate.run({ team_member_id: teamMemberId, hourly_rate: hourlyRate, effective_from: effectiveFrom, notes })
}

function seedFixedCost(
  projectId: number,
  description: string,
  amount: number,
  costDate: string,
  category: string,
  notes: string = '',
) {
  insertFixedCost.run({ project_id: projectId, description, amount, cost_date: costDate, category, notes })
}

export function seedFinance() {
  const allMembers = db.prepare(`SELECT id, title FROM team_members ORDER BY id`).all() as
    Array<{ id: number; title: string }>

  // ── Explicit rates for the first 4 named members ──────────────────────────
  // Member 1: António Ressano Garcia — Engenheiro Geotécnico Sénior
  seedRate(1, 85, '2020-01-01', 'Initial rate')
  seedRate(1, 95, '2024-01-01', '2024 salary review')

  // Member 2: Structural Engineer Senior
  seedRate(2, 80, '2021-06-01', 'Initial rate')
  seedRate(2, 90, '2025-01-01', '2025 salary review')

  // Member 3: Hydraulics Engineer Senior
  seedRate(3, 75, '2022-01-01', 'Initial rate')

  // Member 4: Environmental Consultant Senior
  seedRate(4, 70, '2023-03-01', 'Initial rate')

  // ── Default rates for remaining members, based on seniority keywords ──────
  const seeded = new Set([1, 2, 3, 4])

  for (const member of allMembers) {
    if (seeded.has(member.id)) continue
    const title = member.title.toLowerCase()

    let rate: number
    if (title.includes('diretor') || title.includes('diretora') || title.includes('director')) {
      rate = 120
    } else if (title.includes('sénior') || title.includes('senior') || title.includes('especialista') || title.includes('specialist')) {
      rate = 80
    } else if (title.includes('pleno') || title.includes('plena') || title.includes('gestor') || title.includes('gestora')) {
      rate = 60
    } else if (title.includes('júnior') || title.includes('junior')) {
      rate = 38
    } else {
      rate = 55
    }

    seedRate(member.id, rate, '2023-01-01', 'Initial rate')
  }

  // ── Project fixed costs ───────────────────────────────────────────────────

  // Project 2 — EN222/A32 Serrinha (transport)
  seedFixedCost(2, 'Topographic survey — km 4+200 to 7+800', 12500, '2026-01-10', 'survey')
  seedFixedCost(2, 'Traffic modelling software licence', 3200, '2026-01-25', 'software')
  seedFixedCost(2, 'Signage fabrication and delivery', 45000, '2026-02-15', 'materials')

  // Project 3 — AH Caculo Cabaça (dam)
  seedFixedCost(3, 'Geotechnical drilling contractor (3 boreholes)', 28000, '2026-01-08', 'subcontractor')
  seedFixedCost(3, 'Lab testing — soil samples', 4500, '2026-01-30', 'survey')
  seedFixedCost(3, 'Site accommodation and transport', 6800, '2026-02-20', 'travel')

  // Project 11 — Lisbon Metro Green Line Extension
  seedFixedCost(11, 'Geotechnical instrumentation supply', 18000, '2026-01-06', 'equipment')
  seedFixedCost(11, 'Environmental permit — Lisbon Municipality', 2200, '2026-01-28', 'permits')
  seedFixedCost(11, 'Specialist subcontractor — ground anchors', 85000, '2026-02-14', 'subcontractor')

  // Project 19 — Tete Suspension Bridge
  seedFixedCost(19, 'Wind tunnel testing — external laboratory', 32000, '2026-01-07', 'survey')
  seedFixedCost(19, 'Cable specification materials', 220000, '2026-02-05', 'materials', 'Large structural cable procurement')
  seedFixedCost(19, 'Team travel and accommodation — Tete', 9500, '2026-02-18', 'travel')
}
