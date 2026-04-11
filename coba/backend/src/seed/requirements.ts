import { db } from '../db'
import { insertBook, insertRequirement as insertReq } from '../db/statements/requirements'

export const seedRequirements = db.transaction(() => {

  // Look up project IDs by ref_code so we can link books to existing projects
  function pid(ref: string): number | null {
    const row = db.prepare(`SELECT id FROM projects WHERE ref_code = ?`).get(ref) as { id: number } | undefined
    return row?.id ?? null
  }

  // ── Livro 1: Ponte Vasco da Gama (already completed, used as reference) ──────
  const b1 = insertBook.run({
    title: 'Livro de Encargos — Ponte Vasco da Gama',
    project_id: pid('PT-1995-012'),
    category: 'transport',
    description: 'Requisitos técnicos e de qualificação para a equipa de projeto e supervisão da Ponte Vasco da Gama. Foco em estruturas de grande vão e fundações especiais em ambiente estuarino.',
  })
  const b1id = b1.lastInsertRowid
  insertReq.run({ book_id: b1id, title: 'Engenheiro Estrutural Sénior', description: 'Responsável pelo projeto de tabuleiros em betão pré-esforçado e elementos estaiados.', discipline: 'structural', level: 'senior', years_experience: 10, certifications: 'Ordem dos Engenheiros — Especialista em Estruturas', notes: 'Experiência comprovada em pontes de vão superior a 200 m.' })
  insertReq.run({ book_id: b1id, title: 'Especialista em Fundações', description: 'Projeto e supervisão de fundações por estacas em ambiente aquático e solos brandos do estuário do Tejo.', discipline: 'geotechnical', level: 'senior', years_experience: 8, certifications: 'Mestrado em Geotecnia', notes: 'Familiaridade com ensaios SPT e CPTu em solos estuarinos.' })
  insertReq.run({ book_id: b1id, title: 'Engenheiro de Transportes', description: 'Análise de tráfego, dimensionamento de perfil transversal e definição de requisitos de desempenho da via.', discipline: 'transport', level: 'mid', years_experience: 5, certifications: '', notes: '' })
  insertReq.run({ book_id: b1id, title: 'Técnico de Controlo Ambiental', description: 'Monitorização de impactes ambientais durante a fase de construção sobre o estuário e ecossistema ribeirinho.', discipline: 'environmental', level: 'mid', years_experience: 3, certifications: 'Avaliação de Impacte Ambiental', notes: '' })

  // ── Livro 2: Sistema de Abastecimento de Água Luanda Norte ───────────────────
  const b2 = insertBook.run({
    title: 'Caderno de Encargos — Abastecimento de Água Luanda Norte',
    project_id: pid('AO-2014-033'),
    category: 'water',
    description: 'Requisitos para a equipa de projeto do sistema de captação, tratamento e distribuição de água potável para a região norte de Luanda, Angola.',
  })
  const b2id = b2.lastInsertRowid
  insertReq.run({ book_id: b2id, title: 'Engenheiro Hidráulico Sénior', description: 'Projeto de redes de distribuição, dimensionamento de condutas e estações elevatórias.', discipline: 'hydraulic', level: 'senior', years_experience: 10, certifications: 'Especialização em Sistemas de Abastecimento de Água', notes: 'Experiência em África Sub-Sahariana valorizada.' })
  insertReq.run({ book_id: b2id, title: 'Geotécnico para Infraestruturas Enterradas', description: 'Caracterização geotécnica dos traçados de condutas e análise de estabilidade de taludes.', discipline: 'geotechnical', level: 'mid', years_experience: 5, certifications: '', notes: 'Familiaridade com solos tropicais e lateríticos.' })
  insertReq.run({ book_id: b2id, title: 'Especialista em Qualidade da Água', description: 'Projeto e supervisão do processo de tratamento de água — coagulação, filtração e desinfeção.', discipline: 'environmental', level: 'senior', years_experience: 8, certifications: 'Engenharia Sanitária e Ambiental', notes: '' })
  insertReq.run({ book_id: b2id, title: 'Engenheiro Electromecânico', description: 'Projeto dos grupos eletrobomba, quadros elétricos e sistema SCADA das estações elevatórias.', discipline: 'electrical', level: 'mid', years_experience: 5, certifications: '', notes: '' })

  // ── Livro 3: Expansão do Aeroporto Julius Nyerere ───────────────────────────
  const b3 = insertBook.run({
    title: 'Livro de Encargos — Expansão do Aeroporto Julius Nyerere',
    project_id: pid('TZ-2018-007'),
    category: 'transport',
    description: 'Requisitos de qualificação para a equipa multidisciplinar de projeto da expansão do terminal e infraestrutura aeroportuária em Dar es Salaam, Tanzânia.',
  })
  const b3id = b3.lastInsertRowid
  insertReq.run({ book_id: b3id, title: 'Coordenador de Projeto Sénior', description: 'Coordenação geral do projeto multidisciplinar, interface com o cliente e entidades reguladoras.', discipline: 'planning', level: 'lead', years_experience: 15, certifications: 'PMP ou equivalente', notes: 'Experiência em projetos aeroportuários ou grandes infraestruturas.' })
  insertReq.run({ book_id: b3id, title: 'Engenheiro Estrutural — Terminais', description: 'Projeto estrutural de coberturas de grande vão e estruturas metálicas do novo terminal de passageiros.', discipline: 'structural', level: 'senior', years_experience: 8, certifications: '', notes: '' })
  insertReq.run({ book_id: b3id, title: 'Especialista em Pavimentos Aeronáuticos', description: 'Projeto de pistas, taxiways e plataformas de estacionamento de aeronaves.', discipline: 'transport', level: 'senior', years_experience: 8, certifications: 'ICAO Aerodrome Design', notes: 'Experiência em climas tropicais valorizada.' })
  insertReq.run({ book_id: b3id, title: 'Engenheiro Geotécnico — Solos Tropicais', description: 'Caracterização geotécnica do terreno de expansão e projeto de fundações do terminal.', discipline: 'geotechnical', level: 'mid', years_experience: 5, certifications: '', notes: 'Conhecimento de solos expansivos e argilosos.' })

  // ── Livro 4: Alta Velocidade Lisboa–Porto — Troço Norte ─────────────────────
  const b4 = insertBook.run({
    title: 'Caderno de Encargos — Alta Velocidade Lisboa–Porto (Troço Norte)',
    project_id: pid('PT-2023-088'),
    category: 'transport',
    description: 'Requisitos de qualificação para a equipa multidisciplinar de projeto do troço norte da linha de alta velocidade, incluindo viadutos sobre a Ria de Aveiro e túneis em maciço granítico.',
  })
  const b4id = b4.lastInsertRowid
  insertReq.run({ book_id: b4id, title: 'Engenheiro Estrutural — Pontes e Viadutos', description: 'Projeto de viadutos de grande vão em betão pré-esforçado sobre zonas de vasa e planícies aluvionares.', discipline: 'structural', level: 'senior', years_experience: 12, certifications: 'Ordem dos Engenheiros — Especialista em Estruturas', notes: 'Experiência em fundações em vasa e solos muito moles.' })
  insertReq.run({ book_id: b4id, title: 'Engenheiro Geotécnico — Túneis', description: 'Projeto geotécnico de túneis NATM em maciço granítico e caracterização das descontinuidades.', discipline: 'geotechnical', level: 'senior', years_experience: 10, certifications: 'Mestrado em Geotecnia / Mecânica das Rochas', notes: 'Experiência em prospeção geotécnica para túneis em granito.' })
  insertReq.run({ book_id: b4id, title: 'Especialista em Infraestruturas Ferroviárias', description: 'Projeto de geometria de via, drenagem ferroviária e superestrutura de via para linha de alta velocidade.', discipline: 'transport', level: 'senior', years_experience: 10, certifications: 'Experiência em projetos UIC de alta velocidade', notes: 'Familiaridade com EN 13848 e normas de interoperabilidade.' })
  insertReq.run({ book_id: b4id, title: 'Responsável de Projeto — Coordenação', description: 'Coordenação geral da equipa multidisciplinar, interface com IP e entidades reguladoras.', discipline: 'planning', level: 'lead', years_experience: 15, certifications: 'PMP ou IPMA-A', notes: 'Experiência em projetos de infraestrutura linear de grande dimensão.' })

  // ── Livro 5: Central Fotovoltaica de Mocuba ──────────────────────────────────
  const b5 = insertBook.run({
    title: 'Livro de Encargos — Central Fotovoltaica de Mocuba',
    project_id: pid('MZ-2019-031'),
    category: 'energy',
    description: 'Requisitos técnicos para a equipa de projeto e supervisão da central fotovoltaica de 40 MW em Mocuba, incluindo subestação de elevação e linha de evacuação.',
  })
  const b5id = b5.lastInsertRowid
  insertReq.run({ book_id: b5id, title: 'Engenheiro de Sistemas Fotovoltaicos', description: 'Dimensionamento e projeto de central fotovoltaica de grande escala, incluindo inversores, transformadores e sistema SCADA.', discipline: 'electrical', level: 'senior', years_experience: 8, certifications: 'Certificação em Sistemas de Energia Solar', notes: 'Experiência em África Sub-Sahariana valorizada.' })
  insertReq.run({ book_id: b5id, title: 'Geotécnico — Fundações de Painéis', description: 'Caracterização geotécnica do terreno e projeto de fundações de painéis solares em solo laterítico.', discipline: 'geotechnical', level: 'mid', years_experience: 5, certifications: '', notes: 'Familiaridade com solos tropicais e ensaios de arrancamento de estacas.' })
  insertReq.run({ book_id: b5id, title: 'Especialista em Linhas de Evacuação', description: 'Projeto de linha de transmissão de 220 kV para evacuação da energia produzida na central.', discipline: 'electrical', level: 'senior', years_experience: 8, certifications: 'IEC 60826 — Projeto de Linhas Aéreas', notes: '' })

  // ── Livro 6: Sistema de Drenagem Urbana de Maputo ───────────────────────────
  const b6 = insertBook.run({
    title: 'Caderno de Encargos — Drenagem Urbana de Maputo (Bacias A e B)',
    project_id: pid('MZ-2022-029'),
    category: 'water',
    description: 'Requisitos para a equipa de projeto do sistema de drenagem pluvial de Maputo, incluindo modelação hidráulica, colectores e bacias de retenção.',
  })
  const b6id = b6.lastInsertRowid
  insertReq.run({ book_id: b6id, title: 'Engenheiro Hidráulico — Modelação de Cheias', description: 'Modelação hidráulica 1D/2D das bacias hidrográficas urbanas de Maputo para dimensionamento da rede de drenagem.', discipline: 'hydraulic', level: 'senior', years_experience: 8, certifications: 'Formação avançada em HEC-RAS / MIKE Flood', notes: 'Experiência em drenagem urbana em cidades costeiras tropicais.' })
  insertReq.run({ book_id: b6id, title: 'Engenheiro de Hidráulica Urbana', description: 'Projeto de colectores, bacias de retenção e canais de descarga. Verificação hidráulica e dimensionamento estrutural.', discipline: 'hydraulic', level: 'mid', years_experience: 5, certifications: '', notes: '' })
  insertReq.run({ book_id: b6id, title: 'Especialista em Qualidade Ambiental', description: 'Avaliação de impacte da descarga de águas pluviais na Baía de Maputo e definição de medidas de mitigação.', discipline: 'environmental', level: 'mid', years_experience: 5, certifications: 'Avaliação de Impacte Ambiental', notes: 'Conhecimento de ecossistemas costeiros de Moçambique.' })
})
