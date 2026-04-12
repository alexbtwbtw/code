import { db } from '../db'

const insertTeam = db.prepare(`
  INSERT INTO company_teams (name, description) VALUES (@name, @description)
`)
const insertMember = db.prepare(`
  INSERT OR IGNORE INTO company_team_members (team_id, member_id) VALUES (?, ?)
`)

// Member IDs match insertion order in seed/team.ts (1-indexed, AUTOINCREMENT from 1)
// 1  António Ressano Garcia   — Geotécnico Sénior
// 2  Maria Conceição Figueiredo — Estrutural Sénior
// 3  Paulo Rodrigues          — Hidráulico Sénior
// 4  Sónia Lopes              — Ambiental e Planeamento Sénior
// 5  Catarina Mendes          — Ambiental
// 6  Ricardo Neves            — Transportes e Mobilidade
// 7  Filipa Tavares           — Geotécnica Júnior
// 8  Manuel Fernandes         — Hidráulico Sénior
// 9  João Soares Pinto        — Energia
// 10 Ana Luísa Cardoso        — Geotécnica Sénior
// 11 Bernardo Correia         — Estrutural Pleno
// 12 Inês Brito               — Ambiente e Sustentabilidade
// 13 Tiago Almeida            — Transportes Júnior
// 14 Margarida Pires          — Abastecimento de Água
// 15 Carlos Monteiro          — Planeamento Urbano
// 16 Vera Simões              — Geotécnica Plena
// 17 Nuno Azevedo             — Hidráulico Pleno
// 18 Leonor Baptista          — Energia Renovável
// 19 Rui Sequeira             — Geotécnico Júnior
// 20 Dora Vasconcellos        — Gestão de Projetos
// 21 Fernando Mota            — Estruturas Metálicas Sénior
// 22 Susana Quintela          — Saneamento Plena
// 23 Afonso Guerreiro         — Infraestruturas Ferroviárias
// 24 Helena Fonseca           — Civil Júnior
// 25 Miguel Valente           — Energia Sénior
// 26 Teresa Oliveira          — Ambiental Júnior
// 27 Hugo Pinheiro            — Pontes e Viadutos Especialista
// 28 Graça Esteves            — Recursos Hídricos Sénior
// 29 Pedro Noronha            — Pavimentos Pleno
// 30 Beatriz Cunha            — Planeamento e Ordenamento Sénior

export const seedCompanyTeams = db.transaction(() => {
  // ── Geotecnia ────────────────────────────────────────────────────────────────
  const tGeo = insertTeam.run({
    name: 'Geotecnia',
    description: 'Prospeção geotécnica, fundações especiais, estabilidade de taludes e caracterização de maciços rochosos.',
  })
  for (const id of [1, 7, 10, 16, 19]) insertMember.run(tGeo.lastInsertRowid, id)

  // ── Estruturas ───────────────────────────────────────────────────────────────
  const tStr = insertTeam.run({
    name: 'Estruturas',
    description: 'Projeto e verificação estrutural de pontes, viadutos, edifícios e obras de arte especiais.',
  })
  for (const id of [2, 11, 21, 23, 24, 27]) insertMember.run(tStr.lastInsertRowid, id)

  // ── Hidráulica e Recursos Hídricos ──────────────────────────────────────────
  const tHyd = insertTeam.run({
    name: 'Hidráulica e Recursos Hídricos',
    description: 'Hidrologia, hidráulica fluvial, barragens, sistemas de abastecimento de água e saneamento.',
  })
  for (const id of [3, 8, 14, 17, 22, 28]) insertMember.run(tHyd.lastInsertRowid, id)

  // ── Ambiente e Sustentabilidade ──────────────────────────────────────────────
  const tEnv = insertTeam.run({
    name: 'Ambiente e Sustentabilidade',
    description: 'Avaliação de impacte ambiental, gestão de resíduos, monitorização ecológica e sustentabilidade de projetos.',
  })
  for (const id of [4, 5, 12, 26]) insertMember.run(tEnv.lastInsertRowid, id)

  // ── Transportes e Mobilidade ─────────────────────────────────────────────────
  const tTrans = insertTeam.run({
    name: 'Transportes e Mobilidade',
    description: 'Planeamento e projeto de infraestruturas rodoviárias, ferroviárias, pavimentos e sistemas de mobilidade.',
  })
  for (const id of [6, 13, 29]) insertMember.run(tTrans.lastInsertRowid, id)

  // ── Energia ──────────────────────────────────────────────────────────────────
  const tEnergy = insertTeam.run({
    name: 'Energia',
    description: 'Infraestruturas de energia, energias renováveis, redes elétricas e estudos de viabilidade energética.',
  })
  for (const id of [9, 18, 25]) insertMember.run(tEnergy.lastInsertRowid, id)

  // ── Planeamento e Território ─────────────────────────────────────────────────
  const tPlan = insertTeam.run({
    name: 'Planeamento e Território',
    description: 'Ordenamento do território, planeamento urbano, estudos socioeconómicos e instrumentos de gestão territorial.',
  })
  for (const id of [15, 30]) insertMember.run(tPlan.lastInsertRowid, id)

  // ── Gestão de Projetos ───────────────────────────────────────────────────────
  const tPM = insertTeam.run({
    name: 'Gestão de Projetos',
    description: 'Coordenação, planeamento e controlo de projetos de engenharia. Gestão de risco, prazo e custo.',
  })
  for (const id of [20]) insertMember.run(tPM.lastInsertRowid, id)
})
