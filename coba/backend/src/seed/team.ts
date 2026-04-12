import { db } from '../db'
import { insertMember, insertProjectTeam, insertHistory, insertHistoryGeo, insertHistoryStructure, insertHistoryFeature } from '../db/statements/team'
import { generateCvPdf, type CvMember } from '../lib/generateCv'

const insertCv = db.prepare(`
  INSERT INTO member_cvs (team_member_id, filename, file_size, file_data)
  VALUES (@team_member_id, @filename, @file_size, @file_data)
`)

async function attachCv(memberId: bigint | number, cvMember: CvMember) {
  const buf = await generateCvPdf(cvMember)
  const b64 = buf.toString('base64')
  const slug = cvMember.name.toLowerCase().replace(/\s+/g, '_')
  insertCv.run({ team_member_id: Number(memberId), filename: `cv_${slug}.pdf`, file_size: buf.byteLength, file_data: b64 })
}

// ── Seed: Membros de Equipa, Histórico de Projetos e Sub-registos ────────────

// seedTeam is async because PDF generation is async
export async function seedTeam() {

  // ── Membro 1: António Ressano Garcia — Especialista Geotécnico ──────────────
  const m1 = insertMember.run({
    name: 'António Ressano Garcia',
    title: 'Engenheiro Geotécnico Sénior',
    email: 'a.garcia@coba.pt',
    phone: '+351 21 000 1001',
    bio: 'Mais de 28 anos de experiência em prospeção geotécnica, fundações especiais e estabilidade de taludes em Portugal e África Austral. Liderou campanhas de reconhecimento em terrenos difíceis — de argilas moles do estuário do Tejo a maciços graníticos alterados de Angola e Moçambique. Especialista em análise de risco geotécnico para barragens e infraestruturas críticas.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 1, team_member_id: m1.lastInsertRowid, role_on_project: 'Responsável Geotécnico' })
  insertProjectTeam.run({ project_id: 13, team_member_id: m1.lastInsertRowid, role_on_project: 'Consultor Geotécnico' })
  insertProjectTeam.run({ project_id: 19, team_member_id: m1.lastInsertRowid, role_on_project: 'Especialista Geotécnico' })

  // Histórico 1A: Estudo Geotécnico para a Ponte Vasco da Gama
  const h1a = insertHistory.run({
    team_member_id: m1.lastInsertRowid,
    project_id: 1,
    project_name: 'Ponte Vasco da Gama — Prospeção Geotécnica',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    category: 'transport', start_date: '1993-03-01', end_date: '1994-06-30',
    notes: 'Dirigiu o programa de prospeção com 42 sondagens rotativas e ensaios de carga in situ para caracterizar os depósitos aluvionares do estuário do Tejo. Coordenou os ensaios de carga em estacas de grande diâmetro e a interpretação geológica do substrato calcário a 35–40 m de profundidade.',
  })
  insertHistoryGeo.run({
    history_id: h1a.lastInsertRowid,
    point_label: 'BH-P01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa — Estuário do Tejo',
    depth: 42.5, soil_type: 'argila aluvionar mole', rock_type: 'calcário cretácico',
    groundwater_depth: 1.2, bearing_capacity: 180, spt_n_value: 8, seismic_class: 'D',
    latitude: 38.6916, longitude: -9.0965, sampled_at: '1993-06-10',
    notes: 'Perfil típico: 0-5 m aterro, 5-32 m argila aluvionar mole (N≤10), 32-42 m calcário com fragmentação. Parâmetros de consolidação (Cc=0.35, Cv=0.8 cm²/min) determinados em laboratório.',
  })
  insertHistoryGeo.run({
    history_id: h1a.lastInsertRowid,
    point_label: 'BH-P07', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa — Estuário do Tejo',
    depth: 50.0, soil_type: 'silte arenoso / argila', rock_type: 'calcário',
    groundwater_depth: 0.8, bearing_capacity: 200, spt_n_value: 12, seismic_class: 'D',
    latitude: 38.6930, longitude: -9.0940, sampled_at: '1993-07-22',
    notes: 'Sondagem na zona dos pilones P7 e P8. Variação lateral de siltes e argilas. Substrato calcário a 38 m.',
  })
  insertHistoryGeo.run({
    history_id: h1a.lastInsertRowid,
    point_label: 'TP-T01', type: 'trial_pit',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    depth: 3.5, soil_type: 'aterro antrópico', rock_type: '',
    groundwater_depth: 2.1, bearing_capacity: 80, spt_n_value: 5, seismic_class: 'D',
    latitude: 38.6970, longitude: -9.1020, sampled_at: '1993-05-20',
    notes: 'Zona dos acessos rodoviários norte. Aterro heterogéneo com entulho e solo remexido.',
  })
  insertHistoryStructure.run({
    history_id: h1a.lastInsertRowid,
    label: 'Fundações dos Pilones (P1–P10)', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    material: 'estacas moldadas Ø1500',
    length_m: null, height_m: null, span_m: null,
    foundation_type: 'estacas moldadas em calcário', design_load: 18000,
    latitude: 38.6916, longitude: -9.0965, built_at: null,
    notes: 'Grupo de estacas Ø1.5 m com capacidade unitária de 18 MN. Ensaios de carga estática em 3 estacas de prova.',
  })
  insertHistoryStructure.run({
    history_id: h1a.lastInsertRowid,
    label: 'Viaduto Norte — Fundações Correntes', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    material: 'betão pré-esforçado',
    length_m: 4900, height_m: 48, span_m: 77,
    foundation_type: 'estacas CFA Ø600', design_load: 3500,
    latitude: 38.6975, longitude: -9.1025, built_at: '1997-11-15',
    notes: 'Viaduto de viga caixão contínuo a norte. Fundações em estacas CFA de 600 mm.',
  })

  // Histórico 1B: Reforço da Encosta do Convento de Cristo, Tomar
  const h1b = insertHistory.run({
    team_member_id: m1.lastInsertRowid,
    project_id: null,
    project_name: 'Estabilização da Encosta do Convento de Cristo',
    macro_region: 'EMEA', country: 'Portugal', place: 'Tomar',
    category: 'planning', start_date: '1997-01-01', end_date: '1998-06-30',
    notes: 'Projeto de estabilização de encosta xistosa em risco de deslizamento sobre o claustro do Convento de Cristo. Instalação de rede de monitorização inclinométrica e pregagens passivas em rocha fraturada. Relatório geotécnico entregue à UNESCO como suporte à candidatura a Património Mundial.',
  })
  insertHistoryGeo.run({
    history_id: h1b.lastInsertRowid,
    point_label: 'INC-01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Tomar',
    depth: 22.0, soil_type: 'coluvião', rock_type: 'xisto',
    groundwater_depth: 8.5, bearing_capacity: 180, spt_n_value: 18, seismic_class: 'B',
    latitude: 39.6030, longitude: -8.4120, sampled_at: '1997-04-10',
    notes: 'Sondagem inclinométrica. Superfície de deslizamento identificada a 14 m de profundidade em plano de xistosidade.',
  })
  insertHistoryGeo.run({
    history_id: h1b.lastInsertRowid,
    point_label: 'TP-C01', type: 'trial_pit',
    macro_region: 'EMEA', country: 'Portugal', place: 'Tomar',
    depth: 3.0, soil_type: 'coluvião', rock_type: '',
    groundwater_depth: 2.0, bearing_capacity: 90, spt_n_value: 7, seismic_class: 'B',
    latitude: 39.6028, longitude: -8.4115, sampled_at: '1997-03-25',
    notes: 'Coluvião heterogéneo com blocos de xisto. Humidade elevada.',
  })
  insertHistoryStructure.run({
    history_id: h1b.lastInsertRowid,
    label: 'Sistema de Pregagens Passivas', type: 'other',
    macro_region: 'EMEA', country: 'Portugal', place: 'Tomar',
    material: 'aço nervurado / calda de cimento',
    length_m: null, height_m: null, span_m: null,
    foundation_type: 'pregagens em xisto', design_load: null,
    latitude: 39.6030, longitude: -8.4120, built_at: '1998-05-01',
    notes: '65 pregagens Ø32 mm de 8 m em rocha fraturada. Sistema de drenagem de subsuperfície associado.',
  })

  // Histórico 1C: Barragem de Calucuve — Geotecnia (ligado ao projeto 13)
  const h1c = insertHistory.run({
    team_member_id: m1.lastInsertRowid,
    project_id: 13,
    project_name: 'Barragem Calucuve — Prospeção e Caracterização Geotécnica',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Calucuve',
    category: 'water', start_date: '2023-03-01', end_date: '2024-02-28',
    notes: 'Responsável pela campanha de prospeção geotécnica da fundação da barragem de Calucuve. Executou 18 sondagens rotativas com ensaios de absorção de água (Lugeon) para avaliar a permeabilidade do maciço basáltico. Elaborou o relatório geotécnico de fundação e a proposta de tratamento por injeção de cortina impermeabilizante.',
  })
  insertHistoryGeo.run({
    history_id: h1c.lastInsertRowid,
    point_label: 'BH-C01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Calucuve',
    depth: 35.0, soil_type: 'argila laterítica', rock_type: 'basalto',
    groundwater_depth: 4.5, bearing_capacity: 320, spt_n_value: 35, seismic_class: 'B',
    latitude: -11.20, longitude: 14.60, sampled_at: '2023-06-05',
    notes: 'Sondagem no eixo da barragem. Laterite argilosa (0-6 m), basalto alterado (6-18 m), basalto são (18-35 m). Ensaio Lugeon: 5-12 UL a 20 m.',
  })
  insertHistoryGeo.run({
    history_id: h1c.lastInsertRowid,
    point_label: 'BH-C04', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Calucuve',
    depth: 28.0, soil_type: 'areia laterítica', rock_type: 'basalto',
    groundwater_depth: 6.0, bearing_capacity: 280, spt_n_value: 30, seismic_class: 'B',
    latitude: -11.22, longitude: 14.62, sampled_at: '2023-07-12',
    notes: 'Sondagem na ombreira esquerda. Perfil menos alterado, basalto são a 14 m. RQD médio 68%.',
  })
  insertHistoryGeo.run({
    history_id: h1c.lastInsertRowid,
    point_label: 'BH-C09', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Calucuve',
    depth: 40.0, soil_type: 'saibro basáltico', rock_type: 'basalto',
    groundwater_depth: 3.5, bearing_capacity: 350, spt_n_value: 42, seismic_class: 'B',
    latitude: -11.18, longitude: 14.58, sampled_at: '2023-08-03',
    notes: 'Sondagem na ombreira direita. Falha de orientação N45E identificada a 22 m. Requer tratamento por injeção.',
  })
  insertHistoryStructure.run({
    history_id: h1c.lastInsertRowid,
    label: 'Cortina de Injeção — Barragem Calucuve', type: 'dam',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Calucuve',
    material: 'calda de cimento / bentonite',
    length_m: 180, height_m: 35, span_m: null,
    foundation_type: 'rocha basáltica tratada', design_load: null,
    latitude: -11.20, longitude: 14.60, built_at: null,
    notes: 'Cortina de impermeabilização em dois alinhamentos, profundidade média 28 m. Ensaios de absorção a cada 5 m.',
  })

  // Histórico 1D: Aterro da Lezíria Norte — Controlo de Qualidade
  const h1d = insertHistory.run({
    team_member_id: m1.lastInsertRowid,
    project_id: null,
    project_name: 'Lezíria Norte A10 — Prospeção e Controlo de Qualidade de Aterros',
    macro_region: 'EMEA', country: 'Portugal', place: 'Benavente',
    category: 'transport', start_date: '2001-05-01', end_date: '2003-12-31',
    notes: 'Coordenação da prospeção geotécnica e controlo de qualidade durante a construção de 12 km de aterros sobre solos moles aluvionares do Vale do Tejo. Monitorização de recalques e pressões intersticiais com 48 transdutores e inclinómetros. Validou eficácia do pré-carregamento com drenos verticais.',
  })
  insertHistoryGeo.run({
    history_id: h1d.lastInsertRowid,
    point_label: 'CPT-L01', type: 'cpt',
    macro_region: 'EMEA', country: 'Portugal', place: 'Benavente',
    depth: 22.0, soil_type: 'vasa / argila orgânica', rock_type: '',
    groundwater_depth: 0.3, bearing_capacity: 40, spt_n_value: 2, seismic_class: 'D',
    latitude: 38.9700, longitude: -8.8200, sampled_at: '2001-07-15',
    notes: 'CPT em vasa orgânica de elevada compressibilidade. qc<0.3 MPa nos primeiros 10 m. Parâmetros Su=15-25 kPa. Requer pré-carregamento com drenos verticais.',
  })
  insertHistoryGeo.run({
    history_id: h1d.lastInsertRowid,
    point_label: 'CPT-L08', type: 'cpt',
    macro_region: 'EMEA', country: 'Portugal', place: 'Benavente',
    depth: 18.0, soil_type: 'argila siltosa', rock_type: '',
    groundwater_depth: 0.5, bearing_capacity: 60, spt_n_value: 4, seismic_class: 'D',
    latitude: 39.0100, longitude: -8.7900, sampled_at: '2002-03-22',
    notes: 'CPT 8 meses após instalação de drenos. Aumento de resistência de 40% face ao CPT inicial.',
  })
  insertHistoryStructure.run({
    history_id: h1d.lastInsertRowid,
    label: 'Aterro Lezíria Norte (km 22–34)', type: 'embankment',
    macro_region: 'EMEA', country: 'Portugal', place: 'Benavente',
    material: 'solo argiloso compactado',
    length_m: 12000, height_m: 6.5, span_m: null,
    foundation_type: 'solo tratado / drenos verticais', design_load: null,
    latitude: 38.9900, longitude: -8.8000, built_at: '2004-03-01',
    notes: 'Aterro sobre solos moles com pré-carregamento e drenos verticais de PVC (malha 1.8×1.8 m).',
  })

  // Histórico 1E: Fundações do Hospital de São José (Lisboa)
  const h1e = insertHistory.run({
    team_member_id: m1.lastInsertRowid,
    project_id: null,
    project_name: 'Ampliação do Hospital de São José — Fundações Especiais',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    category: 'planning', start_date: '2005-09-01', end_date: '2007-03-31',
    notes: 'Estudo geotécnico e projeto de fundações para novo bloco hospitalar em terreno urbano com interferências arqueológicas. Solução de microestacas em calcário para minimizar perturbação das estruturas vizinhas. Acompanhou os trabalhos de escavação com registo arqueológico.',
  })
  insertHistoryGeo.run({
    history_id: h1e.lastInsertRowid,
    point_label: 'BH-SJ01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    depth: 28.0, soil_type: 'aterro histórico', rock_type: 'calcário',
    groundwater_depth: 5.5, bearing_capacity: 250, spt_n_value: 22, seismic_class: 'D',
    latitude: 38.7162, longitude: -9.1335, sampled_at: '2005-11-08',
    notes: 'Aterro histórico com vestígios arqueológicos até 4 m. Calcário com cavidades cársticas aos 18-22 m.',
  })
  insertHistoryStructure.run({
    history_id: h1e.lastInsertRowid,
    label: 'Microestacas Bloco C', type: 'building',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    material: 'microestacas Ø180 mm',
    length_m: null, height_m: null, span_m: null,
    foundation_type: 'microestacas em calcário', design_load: 600,
    latitude: 38.7162, longitude: -9.1335, built_at: '2007-01-01',
    notes: '96 microestacas de 12 m com calda de injeção em calcário cárstico. Carga admissível 600 kN/estaca.',
  })

  // Histórico 1F: Barragem Cova do Leão (ligado ao projeto 19)
  const h1f = insertHistory.run({
    team_member_id: m1.lastInsertRowid,
    project_id: 19,
    project_name: 'Barragem Cova do Leão — Estudos Geotécnicos',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Cova do Leão',
    category: 'water', start_date: '2023-08-01', end_date: '2024-06-30',
    notes: 'Realização da campanha geotécnica de fase de projeto para a barragem de terra de Cova do Leão. Programa de 12 sondagens com ensaios de permeabilidade e corte direto. Caracterizou a aptidão do material de empréstimo para o núcleo argiloso e os filtros. Participou na revisão do traçado de desvio do curso de água.',
  })
  insertHistoryGeo.run({
    history_id: h1f.lastInsertRowid,
    point_label: 'BH-CL01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Cova do Leão',
    depth: 25.0, soil_type: 'argila siltosa', rock_type: 'basalto',
    groundwater_depth: 6.0, bearing_capacity: 200, spt_n_value: 18, seismic_class: 'B',
    latitude: -12.30, longitude: 14.80, sampled_at: '2023-11-10',
    notes: 'Sondagem no eixo da barragem. Argila siltosa de baixa plasticidade (LL=38%, IP=12). Basalto são a 18 m. Ensaios Lugeon: 3-8 UL.',
  })
  insertHistoryGeo.run({
    history_id: h1f.lastInsertRowid,
    point_label: 'TP-CL03', type: 'trial_pit',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Cova do Leão',
    depth: 4.5, soil_type: 'argila laterítica', rock_type: '',
    groundwater_depth: null, bearing_capacity: 120, spt_n_value: 10, seismic_class: 'B',
    latitude: -12.28, longitude: 14.78, sampled_at: '2023-12-01',
    notes: 'Vala de empréstimo para material do núcleo. Argila de plasticidade adequada (IP=15-18). Volume estimado 250 000 m³.',
  })
  insertHistoryStructure.run({
    history_id: h1f.lastInsertRowid,
    label: 'Barragem de Terra Cova do Leão', type: 'dam',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Cova do Leão',
    material: 'terra compactada',
    length_m: 280, height_m: 22, span_m: null,
    foundation_type: 'solo compactado sobre basalto', design_load: null,
    latitude: -12.30, longitude: 14.80, built_at: null,
    notes: 'Barragem homogénea com núcleo argiloso, filtro de areia e enrocamento. Descarga de fundo em betão armado.',
  })

  // Histórico 1G: Estudo de Deslizamentos de Faro (Algarve)
  const h1g = insertHistory.run({
    team_member_id: m1.lastInsertRowid,
    project_id: null,
    project_name: 'Inventário e Mitigação de Movimentos de Massa — Algarve Central',
    macro_region: 'EMEA', country: 'Portugal', place: 'Faro / Silves',
    category: 'planning', start_date: '2008-06-01', end_date: '2010-03-31',
    notes: 'Cartografia de inventário de 340 movimentos de massa nas formações calcárias e margas do Algarve Central. Avaliação de suscetibilidade por SIG e proposta de medidas corretivas para 28 taludes críticos em vias municipais. Relatório final adotado como instrumento de ordenamento do território por 4 municípios.',
  })
  insertHistoryGeo.run({
    history_id: h1g.lastInsertRowid,
    point_label: 'FS-ALG01', type: 'field_survey',
    macro_region: 'EMEA', country: 'Portugal', place: 'Silves',
    depth: 0, soil_type: 'coluvião / marga', rock_type: 'marga calcária',
    groundwater_depth: null, bearing_capacity: null, spt_n_value: null, seismic_class: 'C',
    latitude: 37.1910, longitude: -8.4400, sampled_at: '2008-09-14',
    notes: 'Levantamento de campo de talude em marga calcária com inclinação 38°. Evidências de reptação e quedas de blocos. Área afetada: 1.2 ha.',
  })
  insertHistoryStructure.run({
    history_id: h1g.lastInsertRowid,
    label: 'Muro de Suporte — EN125 km 48', type: 'retaining_wall',
    macro_region: 'EMEA', country: 'Portugal', place: 'Faro',
    material: 'betão armado',
    length_m: 120, height_m: 4.5, span_m: null,
    foundation_type: 'sapata em marga compacta', design_load: null,
    latitude: 37.0200, longitude: -7.9300, built_at: '2010-02-01',
    notes: 'Muro de gravidade em betão armado para estabilização de talude marginal da EN125.',
  })

  // Histórico 1H: Prospeção Geotécnica — Aproveitamento de Saltinho
  const h1h = insertHistory.run({
    team_member_id: m1.lastInsertRowid,
    project_id: null,
    project_name: 'AH Saltinho — Prospeção Geotécnica de Fase de Concurso',
    macro_region: 'Sub-Saharan Africa', country: 'Guinea-Bissau', place: 'Rio Corubal',
    category: 'energy', start_date: '2015-04-01', end_date: '2016-08-31',
    notes: 'Coordenou a prospeção geotécnica para o projeto de concurso do aproveitamento hidroelétrico de Saltinho. Executou 10 sondagens no leito e ombreiras do Rio Corubal, com ensaios de permeabilidade Lugeon e pressiómetros. Preparou o relatório de zonamento geotécnico para apoio ao projeto do corpo da barragem.',
  })
  insertHistoryGeo.run({
    history_id: h1h.lastInsertRowid,
    point_label: 'BH-S01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Guinea-Bissau', place: 'Rio Corubal',
    depth: 30.0, soil_type: 'laterite', rock_type: 'xisto',
    groundwater_depth: 3.0, bearing_capacity: 220, spt_n_value: 22, seismic_class: 'B',
    latitude: 11.82, longitude: -14.92, sampled_at: '2015-09-08',
    notes: 'Sondagem na crista da barragem. Xisto são a partir dos 12 m. RQD=72%. Lugeon: 2-5 UL entre 15-30 m.',
  })
  insertHistoryGeo.run({
    history_id: h1h.lastInsertRowid,
    point_label: 'BH-S05', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Guinea-Bissau', place: 'Rio Corubal',
    depth: 22.0, soil_type: 'aluvião arenosa', rock_type: 'xisto',
    groundwater_depth: 0.5, bearing_capacity: 150, spt_n_value: 14, seismic_class: 'B',
    latitude: 11.83, longitude: -14.91, sampled_at: '2015-10-15',
    notes: 'Sondagem no leito do rio. Aluvião de 8 m a remover. Xisto muito alterado na interface.',
  })
  insertHistoryStructure.run({
    history_id: h1h.lastInsertRowid,
    label: 'Barragem de Saltinho — Conceção Geotécnica', type: 'dam',
    macro_region: 'Sub-Saharan Africa', country: 'Guinea-Bissau', place: 'Rio Corubal',
    material: 'betão ciclópico',
    length_m: 160, height_m: 18, span_m: null,
    foundation_type: 'rocha xistosa', design_load: null,
    latitude: 11.82, longitude: -14.92, built_at: null,
    notes: 'Barragem de gravidade no xisto do Rio Corubal. Recomendação de limpeza da superfície de fundação e injeção de consolidação.',
  })

  // Histórico 1I: Estabilização de Taludes na Serra da Estrela (A23)
  const h1i = insertHistory.run({
    team_member_id: m1.lastInsertRowid,
    project_id: null,
    project_name: 'Reabilitação e Estabilização de Taludes da A23 — Serra da Estrela',
    macro_region: 'EMEA', country: 'Portugal', place: 'Covilhã / Guarda',
    category: 'transport', start_date: '2011-02-01', end_date: '2012-11-30',
    notes: 'Projeto de estabilização de 14 taludes de corte em granito e xisto ao longo da A23, após evento de instabilidade em 2010. Solução combinada de pregagens, betão projetado e redes de proteção. Instalação de sistema de monitorização extensométrica em 5 taludes críticos.',
  })
  insertHistoryGeo.run({
    history_id: h1i.lastInsertRowid,
    point_label: 'BH-A23-01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Covilhã',
    depth: 20.0, soil_type: 'coluvião granítico', rock_type: 'granito',
    groundwater_depth: 7.0, bearing_capacity: 350, spt_n_value: 28, seismic_class: 'B',
    latitude: 40.2600, longitude: -7.5000, sampled_at: '2011-04-05',
    notes: 'Granito arenítico com foliação. Planos de descontinuidade desfavoráveis para estabilidade de talude. Ângulo de atrito residual φr=28°.',
  })
  insertHistoryStructure.run({
    history_id: h1i.lastInsertRowid,
    label: 'Reforço Talude T7 (km 23+400)', type: 'other',
    macro_region: 'EMEA', country: 'Portugal', place: 'Covilhã',
    material: 'betão projetado / pregagens',
    length_m: 85, height_m: 22, span_m: null,
    foundation_type: 'rocha granítica', design_load: null,
    latitude: 40.2600, longitude: -7.5000, built_at: '2012-09-01',
    notes: 'Talude de corte em granito estabilizado com 40 pregagens Ø32 de 10 m e betão projetado de 150 mm.',
  })
  insertHistoryStructure.run({
    history_id: h1i.lastInsertRowid,
    label: 'Muro de Suporte T12 (km 29+800)', type: 'retaining_wall',
    macro_region: 'EMEA', country: 'Portugal', place: 'Guarda',
    material: 'betão armado / gabiões',
    length_m: 60, height_m: 6, span_m: null,
    foundation_type: 'sapata em rocha', design_load: null,
    latitude: 40.3100, longitude: -7.4200, built_at: '2012-10-15',
    notes: 'Muro misto com gabiões na base e betão armado na crista. Dreno francês na retaguarda.',
  })

  // Histórico 1J: Fundações da Ponte Kwanza — Angola
  const h1j = insertHistory.run({
    team_member_id: m1.lastInsertRowid,
    project_id: null,
    project_name: 'Ponte sobre o Rio Kwanza — Estudos Geotécnicos',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Dondo',
    category: 'transport', start_date: '2019-10-01', end_date: '2020-09-30',
    notes: 'Programa de prospeção geotécnica para a nova travessia do Rio Kwanza em Dondo, na EN120. Executou 8 sondagens na margem e leito do rio com identificação de depósitos fluviais e granito subjacente. Dimensionou as fundações por estacas de grande diâmetro para os pilares centrais em zona fluvial.',
  })
  insertHistoryGeo.run({
    history_id: h1j.lastInsertRowid,
    point_label: 'BH-KW01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Dondo',
    depth: 32.0, soil_type: 'areia fluvial', rock_type: 'granito',
    groundwater_depth: 0.8, bearing_capacity: 300, spt_n_value: 28, seismic_class: 'B',
    latitude: -9.6900, longitude: 14.4200, sampled_at: '2019-12-10',
    notes: 'Areia fluvial de 0-12 m (N=20-35), granito muito alterado 12-22 m, granito são a partir de 22 m. Ensaio de carga em estaca de prova Ø1000 mm.',
  })
  insertHistoryGeo.run({
    history_id: h1j.lastInsertRowid,
    point_label: 'BH-KW04', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Dondo',
    depth: 28.0, soil_type: 'silte fluvial', rock_type: 'granito',
    groundwater_depth: 0.5, bearing_capacity: 180, spt_n_value: 12, seismic_class: 'B',
    latitude: -9.6850, longitude: 14.4250, sampled_at: '2020-01-08',
    notes: 'Silte fluvial mole nos 8 m superiores — pilar central requer estacas de 24 m para atingir granito são.',
  })
  insertHistoryStructure.run({
    history_id: h1j.lastInsertRowid,
    label: 'Fundações Pilares Centrais P3 e P4', type: 'bridge',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Dondo',
    material: 'estacas moldadas Ø1200',
    length_m: null, height_m: null, span_m: null,
    foundation_type: 'estacas moldadas em granito', design_load: 12000,
    latitude: -9.6900, longitude: 14.4200, built_at: null,
    notes: 'Grupo de 6 estacas Ø1.2 m por pilar, comprimento 26 m, encastradas 2 m em granito são.',
  })

  // Histórico 1K: Contenção Periférica — Metro Lisboa Lote 2 (ligado ao projeto 9)
  const h1k = insertHistory.run({
    team_member_id: m1.lastInsertRowid,
    project_id: 9,
    project_name: 'Metro Lisboa Lote 2 — Geotecnia e Contenção Periférica',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    category: 'transport', start_date: '2022-07-01', end_date: null,
    notes: 'Responsável pela geotecnia do Lote 2 da extensão do Metro de Lisboa. Dirigiu a campanha de prospeção em ambiente urbano com 20 sondagens e ensaios CPTu. Projetou a contenção periférica das estações por paredes moldadas com ancoragens provisórias em calcário, incluindo análise de interação com estruturas vizinhas por método observacional.',
  })
  insertHistoryGeo.run({
    history_id: h1k.lastInsertRowid,
    point_label: 'BH-ML01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    depth: 35.0, soil_type: 'argila', rock_type: 'calcário',
    groundwater_depth: 4.5, bearing_capacity: 180, spt_n_value: 14, seismic_class: 'D',
    latitude: 38.72, longitude: -9.14, sampled_at: '2022-09-20',
    notes: 'Perfil tipo da área do túnel: aterro (0-2 m), argila de Lisboa (2-12 m), areias calcárias (12-20 m), calcário são (>20 m).',
  })
  insertHistoryGeo.run({
    history_id: h1k.lastInsertRowid,
    point_label: 'CPT-ML03', type: 'cpt',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    depth: 22.0, soil_type: 'argila / areia calcária', rock_type: 'calcário',
    groundwater_depth: 4.0, bearing_capacity: 160, spt_n_value: null, seismic_class: 'D',
    latitude: 38.7205, longitude: -9.1395, sampled_at: '2022-10-11',
    notes: 'CPTu com medição de pressão intersticial. Su médio = 55 kPa nas argilas. Razão de fricção > 4% confirma argila.',
  })
  insertHistoryStructure.run({
    history_id: h1k.lastInsertRowid,
    label: 'Parede Moldada Estação — Metro Lote 2', type: 'tunnel',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    material: 'betão armado / ancoragens',
    length_m: 320, height_m: 22, span_m: null,
    foundation_type: 'parede moldada em calcário', design_load: null,
    latitude: 38.72, longitude: -9.14, built_at: null,
    notes: 'Parede moldada de espessura 0.8 m com 3 níveis de ancoragens provisórias. Cálculo de assentamentos de superfície por método observacional.',
  })

  await attachCv(m1.lastInsertRowid, {
    name: 'António Ressano Garcia', title: 'Engenheiro Geotécnico Sénior',
    email: 'a.garcia@coba.pt', phone: '+351 21 000 1001',
    bio: 'Mais de 28 anos de experiência em prospeção geotécnica, fundações especiais e estabilidade de taludes em Portugal e África Austral. Especialista em análise de risco geotécnico para barragens e infraestruturas críticas.',
    history: [
      { projectName: 'Ponte Vasco da Gama — Prospeção Geotécnica', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', startDate: '1993-03-01', endDate: '1994-06-30', notes: 'Dirigiu o programa de prospeção com 42 sondagens para caracterizar os depósitos aluvionares do Tejo.' },
      { projectName: 'Estabilização da Encosta do Convento de Cristo', country: 'Portugal', macroRegion: 'EMEA', category: 'planning', startDate: '1997-01-01', endDate: '1998-06-30', notes: 'Projeto de estabilização de encosta xistosa sobre claustro histórico com pregagens e monitorização.' },
      { projectName: 'Lezíria Norte A10 — Prospeção e Controlo de Qualidade de Aterros', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', startDate: '2001-05-01', endDate: '2003-12-31', notes: 'Controlo geotécnico de 12 km de aterros sobre solos moles com monitorização de recalques.' },
      { projectName: 'Ampliação do Hospital de São José — Fundações Especiais', country: 'Portugal', macroRegion: 'EMEA', category: 'planning', startDate: '2005-09-01', endDate: '2007-03-31', notes: 'Microestacas em calcário cárstico para novo bloco hospitalar em terreno urbano.' },
      { projectName: 'Inventário e Mitigação de Movimentos de Massa — Algarve Central', country: 'Portugal', macroRegion: 'EMEA', category: 'planning', startDate: '2008-06-01', endDate: '2010-03-31', notes: 'Cartografia de 340 movimentos de massa e proposta de medidas corretivas para 28 taludes.' },
      { projectName: 'Reabilitação e Estabilização de Taludes da A23 — Serra da Estrela', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', startDate: '2011-02-01', endDate: '2012-11-30', notes: 'Estabilização de 14 taludes de corte em granito e xisto com pregagens e betão projetado.' },
      { projectName: 'AH Saltinho — Prospeção Geotécnica de Fase de Concurso', country: 'Guinea-Bissau', macroRegion: 'Sub-Saharan Africa', category: 'energy', startDate: '2015-04-01', endDate: '2016-08-31', notes: 'Prospeção geotécnica com 10 sondagens e ensaios Lugeon para a barragem de Saltinho.' },
      { projectName: 'Ponte sobre o Rio Kwanza — Estudos Geotécnicos', country: 'Angola', macroRegion: 'Sub-Saharan Africa', category: 'transport', startDate: '2019-10-01', endDate: '2020-09-30', notes: 'Prospeção geotécnica para nova travessia do Rio Kwanza. Fundações por estacas em granito.' },
      { projectName: 'Metro Lisboa Lote 2 — Geotecnia e Contenção Periférica', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', startDate: '2022-07-01', notes: 'Geotecnia e paredes moldadas para extensão do Metro de Lisboa. Método observacional.' },
      { projectName: 'Barragem Calucuve — Prospeção e Caracterização Geotécnica', country: 'Angola', macroRegion: 'Sub-Saharan Africa', category: 'water', startDate: '2023-03-01', endDate: '2024-02-28', notes: '18 sondagens com ensaios Lugeon para cortina de impermeabilização da barragem.' },
      { projectName: 'Barragem Cova do Leão — Estudos Geotécnicos', country: 'Angola', macroRegion: 'Sub-Saharan Africa', category: 'water', startDate: '2023-08-01', endDate: '2024-06-30', notes: 'Campanha geotécnica e caracterização do material de empréstimo para barragem de terra.' },
    ],
  })

  // ── Membro 2: Maria Conceição Figueiredo — Engenheira Estrutural ─────────────
  const m2 = insertMember.run({
    name: 'Maria Conceição Figueiredo',
    title: 'Engenheira Estrutural Sénior',
    email: 'm.figueiredo@coba.pt',
    phone: '+351 21 000 1042',
    bio: 'Vinte e dois anos de experiência em projeto estrutural de pontes, viadutos e túneis em Portugal, Brasil e Reino Unido. Especialista em betão pré-esforçado, estruturas metálicas mistas e avaliação sísmica. Participou em alguns dos projetos de infraestrutura de transporte mais exigentes de Portugal, desde a Ponte Vasco da Gama até às novas linhas de Alta Velocidade.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 21, team_member_id: m2.lastInsertRowid, role_on_project: 'Responsável Estrutural' })
  insertProjectTeam.run({ project_id: 24, team_member_id: m2.lastInsertRowid, role_on_project: 'Projetista Estrutural' })
  insertProjectTeam.run({ project_id: 9, team_member_id: m2.lastInsertRowid, role_on_project: 'Especialista Estrutural' })

  // Histórico 2A: Viaduto Lezíria (A10)
  const h2a = insertHistory.run({
    team_member_id: m2.lastInsertRowid,
    project_id: null,
    project_name: 'Viaduto do Carregado — A10 Lezíria',
    macro_region: 'EMEA', country: 'Portugal', place: 'Benavente / Carregado',
    category: 'transport', start_date: '2002-01-01', end_date: '2004-08-31',
    notes: 'Projeto de execução do viaduto do Carregado sobre o Vale do Tejo, com tabuleiro de viga caixão de betão pré-esforçado de 1 200 m. Dimensionou os pilares de grande altura (até 28 m) em zona sísmica D e efetuou o controlo de pós-tensão durante a execução por avanços sucessivos.',
  })
  insertHistoryGeo.run({
    history_id: h2a.lastInsertRowid,
    point_label: 'BH-VC01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Benavente',
    depth: 20.0, soil_type: 'argila aluvionar', rock_type: '',
    groundwater_depth: 1.0, bearing_capacity: 80, spt_n_value: 5, seismic_class: 'D',
    latitude: 38.9800, longitude: -8.8100, sampled_at: '2002-03-15',
    notes: 'Argila aluvionar mole no vale inundável. Estacas necessárias para atingir material competente a 18 m.',
  })
  insertHistoryStructure.run({
    history_id: h2a.lastInsertRowid,
    label: 'Viaduto do Carregado — Tabuleiro Principal', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Benavente',
    material: 'betão pré-esforçado',
    length_m: 1200, height_m: 28, span_m: 60,
    foundation_type: 'estacas moldadas Ø1200', design_load: 450,
    latitude: 38.9750, longitude: -8.8050, built_at: '2004-07-01',
    notes: 'Viga caixão contínua de 20 vãos. Construção por avanços sucessivos. Pós-tensão interna e externa.',
  })
  insertHistoryStructure.run({
    history_id: h2a.lastInsertRowid,
    label: 'Pilares P8 a P12 — Grande Altura', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Benavente',
    material: 'betão armado',
    length_m: null, height_m: 28, span_m: null,
    foundation_type: 'estacas moldadas Ø1200', design_load: 450,
    latitude: 38.9780, longitude: -8.8070, built_at: '2004-06-01',
    notes: 'Pilares ocos de secção variável. Análise de interação sísmica pilar-tabuleiro (método N2).',
  })

  // Histórico 2B: Reabilitação da Ponte Marechal Carmona — Luanda
  const h2b = insertHistory.run({
    team_member_id: m2.lastInsertRowid,
    project_id: null,
    project_name: 'Reabilitação da Ponte Marechal Carmona — Luanda',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Luanda',
    category: 'transport', start_date: '2007-03-01', end_date: '2008-11-30',
    notes: 'Avaliação estrutural e projeto de reabilitação da histórica ponte metálica de Luanda. Inspeção detalhada da estrutura, modelação numérica e proposta de reforço por adição de tabuleiro de betão colaborante. Coordenou os ensaios de carga estática e dinâmica antes e após a intervenção.',
  })
  insertHistoryGeo.run({
    history_id: h2b.lastInsertRowid,
    point_label: 'BH-LA01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Luanda',
    depth: 18.0, soil_type: 'areia vermelha', rock_type: 'arenito',
    groundwater_depth: 4.0, bearing_capacity: 200, spt_n_value: 22, seismic_class: 'B',
    latitude: -8.8200, longitude: 13.2300, sampled_at: '2007-05-10',
    notes: 'Sondagem para verificação das fundações existentes. Arenito a 14 m.',
  })
  insertHistoryStructure.run({
    history_id: h2b.lastInsertRowid,
    label: 'Ponte Marechal Carmona — Tabuleiro Reforçado', type: 'bridge',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Luanda',
    material: 'aço / betão colaborante',
    length_m: 380, height_m: null, span_m: 45,
    foundation_type: 'caixão existente', design_load: 300,
    latitude: -8.8200, longitude: 13.2300, built_at: '2008-10-01',
    notes: 'Reabilitação com laje colaborante de 200 mm e reforço das vigas metálicas por soldadura de chapas.',
  })
  insertHistoryStructure.run({
    history_id: h2b.lastInsertRowid,
    label: 'Guardas e Passeios — Nova Geometria', type: 'bridge',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Luanda',
    material: 'aço galvanizado / betão',
    length_m: 380, height_m: null, span_m: null,
    foundation_type: null, design_load: null,
    latitude: -8.8200, longitude: 13.2300, built_at: '2008-11-01',
    notes: 'Novas guardas de segurança e passeios bilaterais de 1.5 m.',
  })

  // Histórico 2C: Pontes sobre o Rio Douro — IP4 (Portugal)
  const h2c = insertHistory.run({
    team_member_id: m2.lastInsertRowid,
    project_id: null,
    project_name: 'IP4 — Pontes Variante de Amarante',
    macro_region: 'EMEA', country: 'Portugal', place: 'Amarante',
    category: 'transport', start_date: '2010-06-01', end_date: '2012-09-30',
    notes: 'Projeto de execução de duas pontes sobre o Rio Tâmega na variante de Amarante. Tabuleiro de viga mista aço-betão com vigas principais em I. Análise dinâmica de vento e verificação de fadiga das soldaduras em meio fluvial com exposição ambiental classe XS.',
  })
  insertHistoryGeo.run({
    history_id: h2c.lastInsertRowid,
    point_label: 'BH-AM01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Amarante',
    depth: 28.0, soil_type: 'solo residual', rock_type: 'granito',
    groundwater_depth: 5.0, bearing_capacity: 800, spt_n_value: 45, seismic_class: 'A',
    latitude: 41.2660, longitude: -8.0760, sampled_at: '2010-08-12',
    notes: 'Granito são a 12 m. Boas condições para fundações diretas nos pilares de margem.',
  })
  insertHistoryStructure.run({
    history_id: h2c.lastInsertRowid,
    label: 'Ponte Norte — Rio Tâmega', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Amarante',
    material: 'aço / betão (misto)',
    length_m: 220, height_m: 18, span_m: 55,
    foundation_type: 'sapata em granito', design_load: 400,
    latitude: 41.2660, longitude: -8.0760, built_at: '2012-08-01',
    notes: 'Ponte mista de 4 vãos (2×55 + 2×55 m). Vigas metálicas em I de altura variável.',
  })
  insertHistoryStructure.run({
    history_id: h2c.lastInsertRowid,
    label: 'Ponte Sul — Rio Tâmega', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Amarante',
    material: 'aço / betão (misto)',
    length_m: 180, height_m: 14, span_m: 45,
    foundation_type: 'estacas em granito', design_load: 380,
    latitude: 41.2640, longitude: -8.0740, built_at: '2012-09-01',
    notes: 'Ponte mista de 4 vãos (45 m). Fundações em estacas Ø900 mm no granito.',
  })

  // Histórico 2D: Túnel Lote 2 Metro Lisboa (ligado ao projeto 9)
  const h2d = insertHistory.run({
    team_member_id: m2.lastInsertRowid,
    project_id: 9,
    project_name: 'Metro Lisboa Lote 2 — Estruturas do Túnel',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    category: 'transport', start_date: '2022-07-01', end_date: null,
    notes: 'Projetista responsável pelas estruturas do túnel TBM do Lote 2 da extensão do Metro de Lisboa. Dimensionou os anéis de aduelas pré-fabricadas e os acessos especiais em secção aberta. Verificou os estados limites de fissuraçção em meio agressivo subterrâneo (classe de exposição XC4, XA2).',
  })
  insertHistoryGeo.run({
    history_id: h2d.lastInsertRowid,
    point_label: 'BH-T01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    depth: 30.0, soil_type: 'argila', rock_type: 'calcário',
    groundwater_depth: 5.0, bearing_capacity: 180, spt_n_value: 14, seismic_class: 'D',
    latitude: 38.72, longitude: -9.14, sampled_at: '2022-09-20',
    notes: 'Perfil: argila 0-12 m (N=14), areia calcária 12-20 m, calcário 20-30 m. Nível freático a 5 m.',
  })
  insertHistoryStructure.run({
    history_id: h2d.lastInsertRowid,
    label: 'Túnel TBM — Lote 2 Metro Lisboa', type: 'tunnel',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    material: 'betão reforçado — aduelas pré-fabricadas',
    length_m: 1800, height_m: null, span_m: 9.2,
    foundation_type: null, design_load: null,
    latitude: 38.72, longitude: -9.14, built_at: null,
    notes: 'Túnel TBM Ø9.2 m. Aduelas de betão C40/50 com fibras metálicas. Cálculo pelo método dos elementos finitos (Plaxis 2D).',
  })
  insertHistoryStructure.run({
    history_id: h2d.lastInsertRowid,
    label: 'Caixão de Acesso Estação — Lote 2', type: 'tunnel',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    material: 'betão armado (NATM)',
    length_m: 120, height_m: 12, span_m: 18,
    foundation_type: 'calcário', design_load: null,
    latitude: 38.7205, longitude: -9.1395, built_at: null,
    notes: 'Estação subterrânea escavada por NATM. Cobertura de 8 m em calcário. Suporte de pregagens e betão projetado.',
  })

  // Histórico 2E: Viaduto Crossrail — Londres (UK)
  const h2e = insertHistory.run({
    team_member_id: m2.lastInsertRowid,
    project_id: null,
    project_name: 'Crossrail — Viadutos de Acesso Eastern Section',
    macro_region: 'EMEA', country: 'UK', place: 'Londres',
    category: 'transport', start_date: '2015-01-01', end_date: '2017-06-30',
    notes: 'Colaboração como especialista em betão pré-esforçado no consórcio de projeto do Eastern Section do Crossrail (Elizabeth Line). Responsável pelo dimensionamento de 3 viadutos de acesso com estrutura mista aço-betão em área urbana densa. Trabalhou integrada numa equipa britânica em conformidade com BS EN 1992 e BS EN 1993.',
  })
  insertHistoryStructure.run({
    history_id: h2e.lastInsertRowid,
    label: 'Viaduto Acesso A — Crossrail East', type: 'bridge',
    macro_region: 'EMEA', country: 'UK', place: 'Londres',
    material: 'aço / betão colaborante',
    length_m: 160, height_m: 10, span_m: 40,
    foundation_type: 'estacas micropilotes', design_load: 350,
    latitude: 51.5200, longitude: 0.0800, built_at: '2017-05-01',
    notes: 'Viaduto misto de 4 vãos. Projetos em conformidade BS EN 1990-1993. BIM Level 2.',
  })
  insertHistoryStructure.run({
    history_id: h2e.lastInsertRowid,
    label: 'Viaduto Acesso B — Crossrail East', type: 'bridge',
    macro_region: 'EMEA', country: 'UK', place: 'Londres',
    material: 'aço / betão colaborante',
    length_m: 120, height_m: 8, span_m: 35,
    foundation_type: 'estacas moldadas', design_load: 320,
    latitude: 51.5180, longitude: 0.0820, built_at: '2017-04-01',
    notes: 'Estrutura mista. Análise de fadiga (EN 1993-1-9) para carga de tráfego ferroviário.',
  })

  // Histórico 2F: Pontes da Linha de Alta Velocidade — Lote A (ligado ao projeto 21)
  const h2f = insertHistory.run({
    team_member_id: m2.lastInsertRowid,
    project_id: 21,
    project_name: 'LAV Lote A — Viadutos e Pontes Aveiro-Porto',
    macro_region: 'EMEA', country: 'Portugal', place: 'Aveiro / Porto',
    category: 'transport', start_date: '2024-01-01', end_date: null,
    notes: 'Projetista sénior responsável pelas 7 pontes e 12 viadutos do Lote A da Alta Velocidade Ferroviária entre Aveiro e Porto. Dimensionou os viadutos de betão pré-esforçado sobre a planície de Aveiro e as pontes metálicas mistas na zona montanhosa. Garante conformidade com EN 1991-2 (cargas ferroviárias) e EN 1998-2 (sismo em pontes).',
  })
  insertHistoryGeo.run({
    history_id: h2f.lastInsertRowid,
    point_label: 'BH-LAV01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Aveiro',
    depth: 20.0, soil_type: 'areia fina siltosa', rock_type: 'granito',
    groundwater_depth: 1.5, bearing_capacity: 120, spt_n_value: 8, seismic_class: 'C',
    latitude: 40.64, longitude: -8.65, sampled_at: '2024-02-15',
    notes: 'Solo mole da planície costeira. Estacas CFA de 18 m para fundações dos viadutos.',
  })
  insertHistoryStructure.run({
    history_id: h2f.lastInsertRowid,
    label: 'Viaduto LAV Aveiro — V1 (2 200 m)', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Aveiro',
    material: 'betão pré-esforçado',
    length_m: 2200, height_m: 12, span_m: 50,
    foundation_type: 'estacas CFA Ø600', design_load: 350,
    latitude: 40.65, longitude: -8.64, built_at: null,
    notes: 'Viaduto sobre terrenos moles da planície de Aveiro. Tabuleiro de viga caixão bi-celular. L/H=17.',
  })
  insertHistoryStructure.run({
    history_id: h2f.lastInsertRowid,
    label: 'Ponte Mista LAV — Zona Serrana', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Entre Aveiro e Porto',
    material: 'aço / betão (misto)',
    length_m: 350, height_m: 45, span_m: 85,
    foundation_type: 'sapata em granito', design_load: 480,
    latitude: 40.80, longitude: -8.58, built_at: null,
    notes: 'Viaduto misto de grande altura. Verificação da instabilidade lateral-torsional dos troços metálicos. Análise não linear geométrica.',
  })

  // Histórico 2G: Ponte Ferroviária sobre o Rio Mondego (Coimbra)
  const h2g = insertHistory.run({
    team_member_id: m2.lastInsertRowid,
    project_id: null,
    project_name: 'Nova Ponte Ferroviária do Mondego — Coimbra',
    macro_region: 'EMEA', country: 'Portugal', place: 'Coimbra',
    category: 'transport', start_date: '2018-09-01', end_date: '2020-12-31',
    notes: 'Projeto de execução de nova ponte ferroviária sobre o Rio Mondego para duplicação de via da Linha do Norte. Estrutura mista com dois tabuleiros independentes de 280 m. Análise de interação solo-estrutura para os pilares em aluvião fluvial e verificação de fadiga de soldaduras para tráfego de 300 comboios/dia.',
  })
  insertHistoryGeo.run({
    history_id: h2g.lastInsertRowid,
    point_label: 'BH-MO01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Coimbra',
    depth: 24.0, soil_type: 'aluvião arenosa', rock_type: 'calcário',
    groundwater_depth: 1.5, bearing_capacity: 160, spt_n_value: 14, seismic_class: 'C',
    latitude: 40.2050, longitude: -8.4230, sampled_at: '2018-11-20',
    notes: 'Aluvião arenosa com seixos (0-14 m), calcário a partir de 14 m. Estacas de 16 m previstas.',
  })
  insertHistoryStructure.run({
    history_id: h2g.lastInsertRowid,
    label: 'Ponte Ferroviária Mondego — Tabuleiro Norte', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Coimbra',
    material: 'aço / betão (misto)',
    length_m: 280, height_m: 14, span_m: 70,
    foundation_type: 'estacas Ø1000 em calcário', design_load: 550,
    latitude: 40.2050, longitude: -8.4230, built_at: '2020-10-01',
    notes: 'Tabuleiro ferroviário com 4 vãos de 70 m. Aço S460 nos banzos comprimidos.',
  })
  insertHistoryStructure.run({
    history_id: h2g.lastInsertRowid,
    label: 'Ponte Ferroviária Mondego — Tabuleiro Sul', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Coimbra',
    material: 'aço / betão (misto)',
    length_m: 280, height_m: 14, span_m: 70,
    foundation_type: 'estacas Ø1000 em calcário', design_load: 550,
    latitude: 40.2045, longitude: -8.4225, built_at: '2020-11-01',
    notes: 'Tabuleiro ferroviário paralelo. Análise de vibração de rail para passagem a 220 km/h.',
  })

  // Histórico 2H: Linha Vermelha Metro Lisboa (ligado ao projeto 24)
  const h2h = insertHistory.run({
    team_member_id: m2.lastInsertRowid,
    project_id: 24,
    project_name: 'Linha Vermelha Lisboa Metro — Estruturas da Extensão',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    category: 'transport', start_date: '2024-02-01', end_date: null,
    notes: 'Responsável pelo projeto estrutural das estruturas enterradas e à superfície da extensão da Linha Vermelha. Dimensionou o caixão de betão armado da nova estação e as travessias em viaduto elevado sobre rodovias existentes. Análise de resposta sísmica e verificação do isolamento de vibrações para edifícios adjacentes.',
  })
  insertHistoryStructure.run({
    history_id: h2h.lastInsertRowid,
    label: 'Estação Linha Vermelha — Estrutura NATM', type: 'tunnel',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    material: 'betão armado / NATM',
    length_m: 850, height_m: null, span_m: 10.5,
    foundation_type: null, design_load: null,
    latitude: 38.75, longitude: -9.10, built_at: null,
    notes: 'Estação subterrânea NATM. Suporte por jet-grouting para contenção em argila. Secção cavada de 10.5×8 m.',
  })
  insertHistoryStructure.run({
    history_id: h2h.lastInsertRowid,
    label: 'Viaduto de Acesso — Linha Vermelha', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    material: 'betão pré-esforçado',
    length_m: 280, height_m: 8, span_m: 35,
    foundation_type: 'estacas em calcário', design_load: 350,
    latitude: 38.752, longitude: -9.098, built_at: null,
    notes: 'Viaduto de ligação em betão pré-esforçado sobre a CRIL. Análise dinâmica para controlo de acelerações.',
  })

  // Histórico 2I: Ponte Pedonal Museu dos Coches — Lisboa
  const h2i = insertHistory.run({
    team_member_id: m2.lastInsertRowid,
    project_id: null,
    project_name: 'Passarela Pedonal Museu Nacional dos Coches',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa — Belém',
    category: 'planning', start_date: '2013-04-01', end_date: '2014-07-31',
    notes: 'Projeto da passarela pedonal de ligação entre o novo edifício do Museu Nacional dos Coches e o Picadeiro Real. Estrutura em aço corten com secção variável e comprimento de 62 m. Verificação de vibração para pedestres (EN 1990 Anexo A2) e análise estética integrada com o contexto patrimonial.',
  })
  insertHistoryStructure.run({
    history_id: h2i.lastInsertRowid,
    label: 'Passarela Museu Coches — Belém', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    material: 'aço corten S355',
    length_m: 62, height_m: 4, span_m: 62,
    foundation_type: 'sapatas em calcário', design_load: 5,
    latitude: 38.6978, longitude: -9.1986, built_at: '2014-06-01',
    notes: 'Passarela monolítica em corten. Carga viva 5 kN/m². Frequência natural de 2.1 Hz (zona segura de vibração pedonal).',
  })

  // Histórico 2J: Viadutos A22 — Algarve
  const h2j = insertHistory.run({
    team_member_id: m2.lastInsertRowid,
    project_id: null,
    project_name: 'A22 Via do Infante — Viadutos do Troço Portimão-Lagos',
    macro_region: 'EMEA', country: 'Portugal', place: 'Portimão / Lagos',
    category: 'transport', start_date: '2006-04-01', end_date: '2008-07-31',
    notes: 'Projeto de 6 viadutos de betão pré-esforçado do troço Portimão-Lagos da A22. Tipologia de viga caixão mono-celular em betão pré-esforçado por avanços sucessivos. Verificação de fendilhação em ambiente marítimo (classe XS1) e modelação das perdas de pré-esforço a longo prazo.',
  })
  insertHistoryGeo.run({
    history_id: h2j.lastInsertRowid,
    point_label: 'BH-A22-01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Portimão',
    depth: 22.0, soil_type: 'areia calcária', rock_type: 'calcário',
    groundwater_depth: 3.5, bearing_capacity: 250, spt_n_value: 28, seismic_class: 'C',
    latitude: 37.1400, longitude: -8.5400, sampled_at: '2006-06-14',
    notes: 'Areia calcária sobre calcário. Fundações diretas possíveis nos pilares altos.',
  })
  insertHistoryStructure.run({
    history_id: h2j.lastInsertRowid,
    label: 'Viaduto Odiáxere V1 (A22)', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lagos',
    material: 'betão pré-esforçado',
    length_m: 420, height_m: 22, span_m: 60,
    foundation_type: 'sapata em calcário', design_load: 420,
    latitude: 37.1050, longitude: -8.6200, built_at: '2008-06-01',
    notes: 'Maior viaduto do troço. Viga caixão de 7 vãos com 5 avanços sucessivos simétricos.',
  })
  insertHistoryStructure.run({
    history_id: h2j.lastInsertRowid,
    label: 'Viaduto Odelouca V2 (A22)', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Portimão',
    material: 'betão pré-esforçado',
    length_m: 280, height_m: 18, span_m: 55,
    foundation_type: 'estacas Ø900', design_load: 400,
    latitude: 37.1600, longitude: -8.5000, built_at: '2007-11-01',
    notes: 'Viga caixão sobre o Rio Odelouca. 5 vãos de 55 m.',
  })

  // Histórico 2K: Ponte de São João — Porto (análise e reabilitação)
  const h2k = insertHistory.run({
    team_member_id: m2.lastInsertRowid,
    project_id: null,
    project_name: 'Ponte de São João — Avaliação Estrutural e Reforço',
    macro_region: 'EMEA', country: 'Portugal', place: 'Porto',
    category: 'transport', start_date: '2020-11-01', end_date: '2022-03-31',
    notes: 'Avaliação estrutural da Ponte de São João para introdução de tráfego de alta velocidade ferroviária. Modelação dinâmica avançada da ponte e análise da resposta sob comboios a 220 km/h. Proposta de reforço por adição de contraventamentos metálicos e substituição de aparelhos de apoio por isoladores sísmicos de alta amortecimento.',
  })
  insertHistoryStructure.run({
    history_id: h2k.lastInsertRowid,
    label: 'Ponte São João — Arco Principal', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Porto',
    material: 'betão armado (arco)',
    length_m: 1498, height_m: 74, span_m: 250,
    foundation_type: 'fundação em granito', design_load: 500,
    latitude: 41.1380, longitude: -8.6000, built_at: '1991-01-01',
    notes: 'Reavaliação para alta velocidade. Análise modal com 18 modos de vibração. Frequência fundamental 0.48 Hz.',
  })
  insertHistoryStructure.run({
    history_id: h2k.lastInsertRowid,
    label: 'Aparelhos de Apoio — Substituição', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Porto',
    material: 'elastomérico / HDR',
    length_m: null, height_m: null, span_m: null,
    foundation_type: null, design_load: null,
    latitude: 41.1380, longitude: -8.6000, built_at: null,
    notes: 'Proposta de substituição dos apoios elastoméricos existentes por isoladores HDR para controlo de vibrações.',
  })

  await attachCv(m2.lastInsertRowid, {
    name: 'Maria Conceição Figueiredo', title: 'Engenheira Estrutural Sénior',
    email: 'm.figueiredo@coba.pt', phone: '+351 21 000 1042',
    bio: 'Vinte e dois anos de experiência em projeto estrutural de pontes, viadutos e túneis em Portugal, Brasil e Reino Unido. Especialista em betão pré-esforçado, estruturas metálicas mistas e avaliação sísmica.',
    history: [
      { projectName: 'Viaduto do Carregado — A10 Lezíria', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', startDate: '2002-01-01', endDate: '2004-08-31', notes: 'Projeto de viaduto de 1 200 m com tabuleiro de viga caixão por avanços sucessivos.' },
      { projectName: 'Reabilitação da Ponte Marechal Carmona — Luanda', country: 'Angola', macroRegion: 'Sub-Saharan Africa', category: 'transport', startDate: '2007-03-01', endDate: '2008-11-30', notes: 'Avaliação e reforço de ponte metálica histórica com tabuleiro colaborante.' },
      { projectName: 'A22 Via do Infante — Viadutos do Troço Portimão-Lagos', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', startDate: '2006-04-01', endDate: '2008-07-31', notes: 'Projeto de 6 viadutos de betão pré-esforçado em ambiente marítimo.' },
      { projectName: 'IP4 — Pontes Variante de Amarante', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', startDate: '2010-06-01', endDate: '2012-09-30', notes: 'Projeto de pontes mistas aço-betão sobre o Rio Tâmega.' },
      { projectName: 'Passarela Pedonal Museu Nacional dos Coches', country: 'Portugal', macroRegion: 'EMEA', category: 'planning', startDate: '2013-04-01', endDate: '2014-07-31', notes: 'Passarela em aço corten de 62 m com verificação de vibração pedonal.' },
      { projectName: 'Crossrail — Viadutos de Acesso Eastern Section', country: 'UK', macroRegion: 'EMEA', category: 'transport', startDate: '2015-01-01', endDate: '2017-06-30', notes: 'Especialista em betão pré-esforçado para 3 viadutos do Crossrail em Londres.' },
      { projectName: 'Nova Ponte Ferroviária do Mondego — Coimbra', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', startDate: '2018-09-01', endDate: '2020-12-31', notes: 'Projeto de pontes ferroviárias mistas de 280 m sobre o Rio Mondego.' },
      { projectName: 'Ponte de São João — Avaliação Estrutural e Reforço', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', startDate: '2020-11-01', endDate: '2022-03-31', notes: 'Modelação dinâmica avançada para introdução de tráfego de alta velocidade.' },
      { projectName: 'Metro Lisboa Lote 2 — Estruturas do Túnel', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', startDate: '2022-07-01', notes: 'Projeto de aduelas pré-fabricadas TBM e estação NATM.' },
      { projectName: 'LAV Lote A — Viadutos e Pontes Aveiro-Porto', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', startDate: '2024-01-01', notes: 'Responsável pelas 7 pontes e 12 viadutos da Alta Velocidade Ferroviária Aveiro-Porto.' },
      { projectName: 'Linha Vermelha Lisboa Metro — Estruturas da Extensão', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', startDate: '2024-02-01', notes: 'Projeto estrutural de estação NATM e viadutos de acesso da Linha Vermelha.' },
    ],
  })

  // ── Membro 3: Paulo Rodrigues ─────────────────────────────────────────────
  const m3 = insertMember.run({
    name: 'Paulo Rodrigues',
    title: 'Especialista em Infraestruturas Aeroportuárias',
    email: 'p.rodrigues@coba.pt',
    phone: '+351 21 000 1078',
    bio: 'Focado em projetos aeroportuários e centros de transporte na África Oriental. Especialista em engenharia de pavimentos e tratamento de solos expansivos.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 3, team_member_id: m3.lastInsertRowid, role_on_project: 'Gestor de Projeto' })

  // Histórico 3A: Expansão do Aeroporto Internacional Julius Nyerere (ligado ao projeto 3)
  const h3a = insertHistory.run({
    team_member_id: m3.lastInsertRowid,
    project_id: 3,
    project_name: 'Expansão do Aeroporto Internacional Julius Nyerere',
    macro_region: 'Sub-Saharan Africa',
    country: 'Tanzania',
    place: 'Dar es Salaam',
    category: 'transport',
    start_date: null,
    end_date: null,
    notes: 'Prospeção da fundação da pista e projeto do pavimento para operações de aeronaves de fuselagem larga.',
  })
  insertHistoryGeo.run({
    history_id: h3a.lastInsertRowid,
    point_label: 'BH-R01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Tanzania', place: 'Dar es Salaam',
    depth: 25.0, soil_type: 'argila expansiva (black cotton)', rock_type: 'basalto',
    groundwater_depth: 3.2, bearing_capacity: 120, spt_n_value: 8, seismic_class: 'C',
    latitude: -6.8780, longitude: 39.2026, sampled_at: '2017-03-14',
    notes: 'Solo expansivo. Requer estabilização.',
  })
  insertHistoryGeo.run({
    history_id: h3a.lastInsertRowid,
    point_label: 'CS-01', type: 'core_sample',
    macro_region: 'Sub-Saharan Africa', country: 'Tanzania', place: 'Dar es Salaam',
    depth: 12.0, soil_type: '', rock_type: 'basalto',
    groundwater_depth: null, bearing_capacity: 850, spt_n_value: null, seismic_class: 'C',
    latitude: -6.8800, longitude: 39.2050, sampled_at: '2017-04-02',
    notes: 'Recuperação de carote 95%. RQD 82%.',
  })
  insertHistoryStructure.run({
    history_id: h3a.lastInsertRowid,
    label: 'Extensão do Terminal 3', type: 'building',
    macro_region: 'Sub-Saharan Africa', country: 'Tanzania', place: 'Dar es Salaam',
    material: 'aço / betão armado',
    length_m: 450, height_m: 22, span_m: 36,
    foundation_type: 'estacas', design_load: 50,
    latitude: -6.8720, longitude: 39.2010, built_at: null,
    notes: 'Nova extensão do terminal para aeronaves de fuselagem larga.',
  })
  insertHistoryStructure.run({
    history_id: h3a.lastInsertRowid,
    label: 'Pista 23/05', type: 'road',
    macro_region: 'Sub-Saharan Africa', country: 'Tanzania', place: 'Dar es Salaam',
    material: 'betão / betuminoso',
    length_m: 3800, height_m: null, span_m: null,
    foundation_type: 'leito estabilizado', design_load: null,
    latitude: -6.8780, longitude: 39.2026, built_at: null,
    notes: 'Reconstrução total do pavimento com leito de solo expansivo estabilizado.',
  })
  insertHistoryFeature.run({
    history_id: h3a.lastInsertRowid,
    label: 'Novo Tablier Sul',
    description: 'Área de estacionamento expandida para aeronaves de fuselagem larga (código E e F).',
    macro_region: 'Sub-Saharan Africa', country: 'Tanzania', place: 'Dar es Salaam',
    latitude: -6.8760, longitude: 39.2040,
    notes: 'Coordenação com o projeto de terminal para integração operacional.',
  })

  // Histórico 3B: Reabilitação do Aeroporto Internacional de Entebbe (externo)
  const h3b = insertHistory.run({
    team_member_id: m3.lastInsertRowid,
    project_id: null,
    project_name: 'Reabilitação do Aeroporto Internacional de Entebbe',
    macro_region: 'Sub-Saharan Africa',
    country: 'Uganda',
    place: 'Entebbe',
    category: 'transport',
    start_date: null,
    end_date: null,
    notes: 'Avaliação geotécnica da expansão de caminhos de circulação e tablier adjacente ao Lago Vitória.',
  })
  insertHistoryGeo.run({
    history_id: h3b.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Uganda', place: 'Entebbe',
    depth: 20.0, soil_type: 'laterite vermelha', rock_type: 'granito',
    groundwater_depth: 9.0, bearing_capacity: 280, spt_n_value: 30, seismic_class: 'B',
    latitude: 0.0424, longitude: 32.4432, sampled_at: '2015-02-10',
    notes: 'Laterite vermelha sobre granito. Boa capacidade de carga.',
  })
  insertHistoryGeo.run({
    history_id: h3b.lastInsertRowid,
    point_label: 'FS-01', type: 'field_survey',
    macro_region: 'Sub-Saharan Africa', country: 'Uganda', place: 'Entebbe',
    depth: 0, soil_type: 'argila lacustre', rock_type: '',
    groundwater_depth: 0.5, bearing_capacity: 60, spt_n_value: 4, seismic_class: 'B',
    latitude: 0.0420, longitude: 32.4440, sampled_at: '2015-02-18',
    notes: 'Argila lacustre mole perto da margem do lago. Requer pré-carregamento.',
  })
  insertHistoryStructure.run({
    history_id: h3b.lastInsertRowid,
    label: 'Extensão do Taxiway Echo', type: 'road',
    macro_region: 'Sub-Saharan Africa', country: 'Uganda', place: 'Entebbe',
    material: 'betuminoso / betão',
    length_m: 1200, height_m: null, span_m: null,
    foundation_type: 'aterro de laterite compactada', design_load: null,
    latitude: 0.0424, longitude: 32.4432, built_at: '2017-08-01',
    notes: 'Nova extensão de caminho de circulação para aeronaves Code E.',
  })

  await attachCv(m3.lastInsertRowid, {
    name: 'Paulo Rodrigues', title: 'Especialista em Infraestruturas Aeroportuárias',
    email: 'p.rodrigues@coba.pt', phone: '+351 21 000 1078',
    bio: 'Focado em projetos aeroportuários e centros de transporte na África Oriental. Especialista em engenharia de pavimentos e tratamento de solos expansivos.',
    history: [
      { projectName: 'Expansão do Aeroporto Internacional Julius Nyerere', country: 'Tanzania', macroRegion: 'Sub-Saharan Africa', category: 'transport', notes: 'Prospeção da fundação da pista e projeto do pavimento para operações de aeronaves de fuselagem larga.' },
      { projectName: 'Reabilitação do Aeroporto Internacional de Entebbe', country: 'Uganda', macroRegion: 'Sub-Saharan Africa', category: 'transport', notes: 'Avaliação geotécnica da expansão de caminhos de circulação e tablier adjacente ao Lago Vitória.' },
    ],
  })

  // ── Membro 4: Sónia Lopes ─────────────────────────────────────────────────
  const m4 = insertMember.run({
    name: 'Sónia Lopes',
    title: 'Engenheira de Estradas e Pavimentos',
    email: 's.lopes@coba.pt',
    phone: '+351 21 000 1093',
    bio: 'Especializada em reabilitação de estradas e projeto de pavimentos em climas tropicais e subtropicais. Experiente em projetos de corredor de longa extensão no sul de África.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 5, team_member_id: m4.lastInsertRowid, role_on_project: 'Gestora de Projeto' })

  // Histórico 4A: Reabilitação da EN1 — Maputo a Beira (ligado ao projeto 5)
  const h4a = insertHistory.run({
    team_member_id: m4.lastInsertRowid,
    project_id: 5,
    project_name: 'Reabilitação da EN1 — Maputo a Beira',
    macro_region: 'Sub-Saharan Africa',
    country: 'Moçambique',
    place: 'Sofala / Inhambane',
    category: 'transport',
    start_date: null,
    end_date: null,
    notes: 'Prospeção da fundação em corredor de 620 km. Identificadas múltiplas zonas de tratamento necessárias.',
  })
  insertHistoryGeo.run({
    history_id: h4a.lastInsertRowid,
    point_label: 'BH-101', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Sofala',
    depth: 6.0, soil_type: 'argila arenosa', rock_type: '',
    groundwater_depth: 4.5, bearing_capacity: 100, spt_n_value: 9, seismic_class: 'C',
    latitude: -19.8436, longitude: 34.8389, sampled_at: '2020-10-03',
    notes: 'Fundação fraca — estabilização recomendada.',
  })
  insertHistoryGeo.run({
    history_id: h4a.lastInsertRowid,
    point_label: 'FS-01', type: 'field_survey',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Inhambane',
    depth: 0, soil_type: 'laterite', rock_type: '',
    groundwater_depth: null, bearing_capacity: 200, spt_n_value: null, seismic_class: 'C',
    latitude: -19.2100, longitude: 34.5600, sampled_at: '2020-11-15',
    notes: '65% da faixa de rodagem requer reconstrução total.',
  })
  insertHistoryStructure.run({
    history_id: h4a.lastInsertRowid,
    label: 'Reabilitação da EN1', type: 'road',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Sofala / Inhambane',
    material: 'betuminoso / base granular',
    length_m: 620000, height_m: null, span_m: null,
    foundation_type: 'leito estabilizado', design_load: null,
    latitude: -19.2100, longitude: 34.5600, built_at: null,
    notes: 'Reabilitação de 620 km de estrada nacional primária.',
  })
  insertHistoryStructure.run({
    history_id: h4a.lastInsertRowid,
    label: 'Reforço de Pontes (24 un.)', type: 'bridge',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Sofala / Inhambane',
    material: 'betão armado',
    length_m: 1240, height_m: null, span_m: null,
    foundation_type: 'estacas existentes', design_load: 300,
    latitude: -19.5000, longitude: 34.6000, built_at: null,
    notes: '24 estruturas de pontes reforçadas e alargadas.',
  })
  insertHistoryFeature.run({
    history_id: h4a.lastInsertRowid,
    label: 'Posto de Pesagem do Save',
    description: 'Novo posto de controlo de peso com balança dinâmica integrada na reabilitação.',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Rio Save',
    latitude: -21.0000, longitude: 34.5500,
    notes: 'Coordenação com entidades fiscalizadoras para operacionalização do posto.',
  })

  // Histórico 4B: Requalificação da EN1 — Lusaka a Chirundu (externo)
  const h4b = insertHistory.run({
    team_member_id: m4.lastInsertRowid,
    project_id: null,
    project_name: 'Requalificação da EN1 — Lusaka a Chirundu',
    macro_region: 'Sub-Saharan Africa',
    country: 'Zâmbia',
    place: 'Lusaka',
    category: 'transport',
    start_date: null,
    end_date: null,
    notes: 'Projeto do pavimento e avaliação de materiais para requalificação de 200 km de estrada nacional.',
  })
  insertHistoryGeo.run({
    history_id: h4b.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Zâmbia', place: 'Lusaka',
    depth: 8.0, soil_type: 'cascalho arenoso', rock_type: 'quartzito',
    groundwater_depth: 5.5, bearing_capacity: 350, spt_n_value: 40, seismic_class: 'B',
    latitude: -15.4167, longitude: 28.2833, sampled_at: '2018-06-20',
    notes: 'Cascalho arenoso denso com seixos de quartzito. Boa fundação.',
  })
  insertHistoryStructure.run({
    history_id: h4b.lastInsertRowid,
    label: 'Requalificação da EN1 Zâmbia', type: 'road',
    macro_region: 'Sub-Saharan Africa', country: 'Zâmbia', place: 'Lusaka',
    material: 'betuminoso / brita',
    length_m: 200000, height_m: null, span_m: null,
    foundation_type: 'fundação natural', design_load: null,
    latitude: -15.4167, longitude: 28.2833, built_at: null,
    notes: 'Requalificação de 200 km com dupla faixa de rodagem.',
  })
  insertHistoryStructure.run({
    history_id: h4b.lastInsertRowid,
    label: 'Ponte do Rio Kafue', type: 'bridge',
    macro_region: 'Sub-Saharan Africa', country: 'Zâmbia', place: 'Rio Kafue',
    material: 'betão pré-esforçado',
    length_m: 280, height_m: 18, span_m: 60,
    foundation_type: 'estacas', design_load: 400,
    latitude: -15.8000, longitude: 27.8000, built_at: null,
    notes: 'Nova travessia fluvial. 5 vãos de 56 m em betão pré-esforçado.',
  })

  await attachCv(m4.lastInsertRowid, {
    name: 'Sónia Lopes', title: 'Engenheira de Estradas e Pavimentos',
    email: 's.lopes@coba.pt', phone: '+351 21 000 1093',
    bio: 'Especializada em reabilitação de estradas e projeto de pavimentos em climas tropicais e subtropicais. Experiente em projetos de corredor de longa extensão no sul de África.',
    history: [
      { projectName: 'Reabilitação da EN1 — Maputo a Beira', country: 'Moçambique', macroRegion: 'Sub-Saharan Africa', category: 'transport', notes: 'Prospeção da fundação em corredor de 620 km. Identificadas múltiplas zonas de tratamento necessárias.' },
      { projectName: 'Requalificação da EN1 — Lusaka a Chirundu', country: 'Zâmbia', macroRegion: 'Sub-Saharan Africa', category: 'transport', notes: 'Projeto do pavimento e avaliação de materiais para requalificação de 200 km de estrada nacional.' },
    ],
  })

  // ── Membro 5: Catarina Mendes ─────────────────────────────────────────────
  const m5 = insertMember.run({
    name: 'Catarina Mendes',
    title: 'Engenheira Ambiental',
    email: 'c.mendes@coba.pt',
    phone: '+351 21 000 1105',
    bio: 'Especialista em tratamento de águas residuais e gestão ambiental. 15 anos de experiência em projetos de ETAR e reutilização de água em Portugal e PALOP.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 6, team_member_id: m5.lastInsertRowid, role_on_project: 'Gestora de Projeto' })
  insertProjectTeam.run({ project_id: 2, team_member_id: m5.lastInsertRowid, role_on_project: 'Consultora Ambiental' })

  const h5a = insertHistory.run({
    team_member_id: m5.lastInsertRowid,
    project_id: null,
    project_name: 'ETAR do Funchal — Modernização',
    macro_region: 'EMEA',
    country: 'Portugal',
    place: 'Funchal, Madeira',
    category: 'water',
    start_date: null,
    end_date: null,
    notes: 'Projeto de modernização do tratamento terciário e desidratação de lamas.',
  })
  insertHistoryGeo.run({
    history_id: h5a.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Funchal',
    depth: 15.0, soil_type: 'solo vulcânico', rock_type: 'basalto',
    groundwater_depth: 4.0, bearing_capacity: 350, spt_n_value: 32, seismic_class: 'B',
    latitude: 32.6500, longitude: -16.9100, sampled_at: '2016-04-15',
    notes: 'Solo vulcânico sobre basalto. Boa capacidade de carga.',
  })
  insertHistoryStructure.run({
    history_id: h5a.lastInsertRowid,
    label: 'Digestor Anaeróbio', type: 'reservoir',
    macro_region: 'EMEA', country: 'Portugal', place: 'Funchal',
    material: 'betão armado',
    length_m: null, height_m: 16, span_m: null,
    foundation_type: 'laje de fundação', design_load: 40,
    latitude: 32.6500, longitude: -16.9100, built_at: '2018-09-01',
    notes: 'Digestor de 3 000 m³ com cogeração de biogás.',
  })

  await attachCv(m5.lastInsertRowid, {
    name: 'Catarina Mendes', title: 'Engenheira Ambiental',
    email: 'c.mendes@coba.pt', phone: '+351 21 000 1105',
    bio: 'Especialista em tratamento de águas residuais e gestão ambiental. 15 anos de experiência em projetos de ETAR e reutilização de água em Portugal e PALOP.',
    history: [
      { projectName: 'ETAR do Funchal — Modernização', country: 'Portugal', macroRegion: 'EMEA', category: 'water', notes: 'Projeto de modernização do tratamento terciário e desidratação de lamas.' },
    ],
  })

  // ── Membro 6: Ricardo Neves ───────────────────────────────────────────────
  const m6 = insertMember.run({
    name: 'Ricardo Neves',
    title: 'Engenheiro de Transportes e Mobilidade',
    email: 'r.neves@coba.pt',
    phone: '+351 21 000 1120',
    bio: 'Especialista em projetos de transporte público e mobilidade urbana. Experiência em metros ligeiros e BRT em Maputo, Luanda e Lisboa.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 7, team_member_id: m6.lastInsertRowid, role_on_project: 'Gestor de Projeto' })

  const h6a = insertHistory.run({
    team_member_id: m6.lastInsertRowid,
    project_id: null,
    project_name: 'Estudo de Viabilidade do BRT de Luanda',
    macro_region: 'Sub-Saharan Africa',
    country: 'Angola',
    place: 'Luanda',
    category: 'transport',
    start_date: null,
    end_date: null,
    notes: 'Coordenação do estudo de viabilidade técnica e financeira de 3 linhas de BRT em Luanda, totalizando 65 km.',
  })
  insertHistoryGeo.run({
    history_id: h6a.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Luanda',
    depth: 12.0, soil_type: 'areia vermelha', rock_type: 'arenito',
    groundwater_depth: 6.0, bearing_capacity: 180, spt_n_value: 20, seismic_class: 'B',
    latitude: -8.8390, longitude: 13.2890, sampled_at: '2019-03-10',
    notes: 'Areia vermelha típica de Luanda. Adequada para infraestruturas rodoviárias.',
  })

  await attachCv(m6.lastInsertRowid, {
    name: 'Ricardo Neves', title: 'Engenheiro de Transportes e Mobilidade',
    email: 'r.neves@coba.pt', phone: '+351 21 000 1120',
    bio: 'Especialista em projetos de transporte público e mobilidade urbana. Experiência em metros ligeiros e BRT em Maputo, Luanda e Lisboa.',
    history: [
      { projectName: 'Estudo de Viabilidade do BRT de Luanda', country: 'Angola', macroRegion: 'Sub-Saharan Africa', category: 'transport', notes: 'Coordenação do estudo de viabilidade técnica e financeira de 3 linhas de BRT em Luanda, totalizando 65 km.' },
    ],
  })

  // ── Membro 7: Filipa Tavares ──────────────────────────────────────────────
  const m7 = insertMember.run({
    name: 'Filipa Tavares',
    title: 'Engenheira Geotécnica Júnior',
    email: 'f.tavares@coba.pt',
    phone: '+351 21 000 1135',
    bio: 'Recém-formada pelo IST com especialização em mecânica dos solos e fundações. Em formação nos projetos de África Subsaariana.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 5, team_member_id: m7.lastInsertRowid, role_on_project: 'Assistente Geotécnica' })
  insertProjectTeam.run({ project_id: 10, team_member_id: m7.lastInsertRowid, role_on_project: 'Assistente de Projeto' })

  const h7a = insertHistory.run({
    team_member_id: m7.lastInsertRowid,
    project_id: 5,
    project_name: 'Reabilitação da EN1 — Maputo a Beira',
    macro_region: 'Sub-Saharan Africa',
    country: 'Moçambique',
    place: 'Sofala / Inhambane',
    category: 'transport',
    start_date: null,
    end_date: null,
    notes: 'Apoio à campanha geotécnica e ensaios de laboratório no corredor da EN1.',
  })
  insertHistoryGeo.run({
    history_id: h7a.lastInsertRowid,
    point_label: 'BH-101', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Sofala',
    depth: 6.0, soil_type: 'argila arenosa', rock_type: '',
    groundwater_depth: 4.5, bearing_capacity: 100, spt_n_value: 9, seismic_class: 'C',
    latitude: -19.8436, longitude: 34.8389, sampled_at: '2020-10-03',
    notes: 'Fundação fraca — estabilização recomendada.',
  })

  await attachCv(m7.lastInsertRowid, {
    name: 'Filipa Tavares', title: 'Engenheira Geotécnica Júnior',
    email: 'f.tavares@coba.pt', phone: '+351 21 000 1135',
    bio: 'Recém-formada pelo IST com especialização em mecânica dos solos e fundações. Em formação nos projetos de África Subsaariana.',
    history: [
      { projectName: 'Reabilitação da EN1 — Maputo a Beira', country: 'Moçambique', macroRegion: 'Sub-Saharan Africa', category: 'transport', notes: 'Apoio à campanha geotécnica e ensaios de laboratório no corredor da EN1.' },
    ],
  })

  // ── Membro 8: Manuel Fernandes ────────────────────────────────────────────
  const m8 = insertMember.run({
    name: 'Manuel Fernandes',
    title: 'Engenheiro Hidráulico Sénior',
    email: 'm.fernandes@coba.pt',
    phone: '+351 21 000 1148',
    bio: 'Especialista em engenharia hidráulica com 25 anos de experiência em barragens, aproveitamentos hidroelétricos e gestão de cheias. Projetos em Portugal, Angola e Moçambique.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 4, team_member_id: m8.lastInsertRowid, role_on_project: 'Responsável Hidráulico' })
  insertProjectTeam.run({ project_id: 9, team_member_id: m8.lastInsertRowid, role_on_project: 'Diretor Técnico' })

  const h8a = insertHistory.run({
    team_member_id: m8.lastInsertRowid,
    project_id: 4,
    project_name: 'Aproveitamento Hidroelétrico do Baixo Tâmega',
    macro_region: 'EMEA',
    country: 'Portugal',
    place: 'Chaves, Trás-os-Montes',
    category: 'energy',
    start_date: null,
    end_date: null,
    notes: 'Responsável pela modelação hidráulica e dimensionamento dos órgãos de descarga das três barragens.',
  })
  insertHistoryGeo.run({
    history_id: h8a.lastInsertRowid,
    point_label: 'BH-G01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Gouvães',
    depth: 80.0, soil_type: 'solo residual', rock_type: 'granito',
    groundwater_depth: 5.0, bearing_capacity: 1200, spt_n_value: 50, seismic_class: 'A',
    latitude: 41.7204, longitude: -7.6832, sampled_at: '2007-05-08',
    notes: 'Maciço granítico com fraturação reduzida.',
  })
  insertHistoryStructure.run({
    history_id: h8a.lastInsertRowid,
    label: 'Barragem de Gouvães', type: 'dam',
    macro_region: 'EMEA', country: 'Portugal', place: 'Gouvães',
    material: 'betão armado (arco-gravidade)',
    length_m: 370, height_m: 95, span_m: null,
    foundation_type: 'encastramento em granito', design_load: null,
    latitude: 41.7204, longitude: -7.6832, built_at: '2017-09-01',
    notes: 'Barragem principal com descarregador de cheias e central de 880 MW.',
  })

  const h8b = insertHistory.run({
    team_member_id: m8.lastInsertRowid,
    project_id: null,
    project_name: 'Barragem do Cambambe — Reforço',
    macro_region: 'Sub-Saharan Africa',
    country: 'Angola',
    place: 'Kwanza Norte',
    category: 'energy',
    start_date: null,
    end_date: null,
    notes: 'Assessoria técnica para a elevação da barragem existente e aumento da potência de 260 MW para 960 MW.',
  })
  insertHistoryGeo.run({
    history_id: h8b.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Cambambe',
    depth: 50.0, soil_type: 'solo residual', rock_type: 'gnaisse',
    groundwater_depth: 10.0, bearing_capacity: 1100, spt_n_value: 50, seismic_class: 'B',
    latitude: -9.7500, longitude: 14.4500, sampled_at: '2008-02-15',
    notes: 'Gnaisse são com fraturação reduzida. Condições adequadas para elevação da barragem.',
  })
  insertHistoryStructure.run({
    history_id: h8b.lastInsertRowid,
    label: 'Barragem do Cambambe (elevada)', type: 'dam',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Cambambe',
    material: 'betão armado',
    length_m: 300, height_m: 110, span_m: null,
    foundation_type: 'encastramento em gnaisse', design_load: null,
    latitude: -9.7500, longitude: 14.4500, built_at: '2017-01-01',
    notes: 'Elevação de 23 m para aumento da capacidade do reservatório.',
  })

  await attachCv(m8.lastInsertRowid, {
    name: 'Manuel Fernandes', title: 'Engenheiro Hidráulico Sénior',
    email: 'm.fernandes@coba.pt', phone: '+351 21 000 1148',
    bio: 'Especialista em engenharia hidráulica com 25 anos de experiência em barragens, aproveitamentos hidroelétricos e gestão de cheias.',
    history: [
      { projectName: 'Aproveitamento Hidroelétrico do Baixo Tâmega', country: 'Portugal', macroRegion: 'EMEA', category: 'energy', notes: 'Responsável pela modelação hidráulica e dimensionamento dos órgãos de descarga.' },
      { projectName: 'Barragem do Cambambe — Reforço', country: 'Angola', macroRegion: 'Sub-Saharan Africa', category: 'energy', notes: 'Assessoria técnica para a elevação da barragem existente e aumento da potência.' },
    ],
  })

  // ── Membro 9: João Soares Pinto ──────────────────────────────────────────
  const m9 = insertMember.run({
    name: 'João Soares Pinto',
    title: 'Diretor de Projetos de Energia',
    email: 'joao.soares@coba.pt',
    phone: '+351 21 000 1161',
    bio: 'Diretor com 28 anos de experiência em grandes aproveitamentos hidroelétricos e parques eólicos offshore. Liderou projetos em Portugal, Angola e Moçambique com orçamentos superiores a 1 000 M€.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 4, team_member_id: m9.lastInsertRowid, role_on_project: 'Diretor de Projeto' })
  insertProjectTeam.run({ project_id: 8, team_member_id: m9.lastInsertRowid, role_on_project: 'Diretor de Projeto' })

  const h9a = insertHistory.run({
    team_member_id: m9.lastInsertRowid,
    project_id: 4,
    project_name: 'Aproveitamento Hidroelétrico do Baixo Tâmega',
    macro_region: 'EMEA', country: 'Portugal', place: 'Chaves',
    category: 'energy', start_date: '2009-06-01', end_date: '2017-12-15',
    notes: 'Direção geral do projeto de três barragens em cascata com 1 158 MW de potência instalada.',
  })
  insertHistoryStructure.run({
    history_id: h9a.lastInsertRowid,
    label: 'Barragem de Gouvães', type: 'dam',
    macro_region: 'EMEA', country: 'Portugal', place: 'Gouvães',
    material: 'betão armado (arco-gravidade)',
    length_m: 370, height_m: 95, span_m: null,
    foundation_type: 'encastramento em granito', design_load: null,
    latitude: 41.7204, longitude: -7.6832, built_at: '2017-09-01',
    notes: 'Barragem principal do complexo. Potência de 880 MW.',
  })

  const h9b = insertHistory.run({
    team_member_id: m9.lastInsertRowid,
    project_id: null,
    project_name: 'Parque Eólico de Fontes (Viana do Castelo)',
    macro_region: 'EMEA', country: 'Portugal', place: 'Viana do Castelo',
    category: 'energy', start_date: null, end_date: null,
    notes: 'Coordenação do estudo de viabilidade e projeto de fundações de 18 aerogeradores em terreno granítico acidentado.',
  })
  insertHistoryGeo.run({
    history_id: h9b.lastInsertRowid,
    point_label: 'BH-F01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Viana do Castelo',
    depth: 20.0, soil_type: 'solo residual', rock_type: 'granito',
    groundwater_depth: 8.0, bearing_capacity: 900, spt_n_value: 50, seismic_class: 'A',
    latitude: 41.8500, longitude: -8.3000, sampled_at: '2015-07-10',
    notes: 'Granito são a partir dos 5 m. Fundação direta sobre rocha.',
  })

  await attachCv(m9.lastInsertRowid, {
    name: 'João Soares Pinto', title: 'Diretor de Projetos de Energia',
    email: 'joao.soares@coba.pt', phone: '+351 21 000 1161',
    bio: 'Diretor com 28 anos de experiência em grandes aproveitamentos hidroelétricos e parques eólicos offshore.',
    history: [
      { projectName: 'Aproveitamento Hidroelétrico do Baixo Tâmega', country: 'Portugal', macroRegion: 'EMEA', category: 'energy', startDate: '2009-06-01', endDate: '2017-12-15', notes: 'Direção geral do projeto de três barragens em cascata com 1 158 MW.' },
      { projectName: 'Parque Eólico de Fontes (Viana do Castelo)', country: 'Portugal', macroRegion: 'EMEA', category: 'energy', notes: 'Coordenação do estudo de viabilidade e projeto de fundações de 18 aerogeradores.' },
    ],
  })

  // ── Membro 10: Ana Luísa Cardoso ─────────────────────────────────────────
  const m10 = insertMember.run({
    name: 'Ana Luísa Cardoso',
    title: 'Engenheira Geotécnica Sénior',
    email: 'ana.cardoso@coba.pt',
    phone: '+351 21 000 1174',
    bio: 'Especialista em caracterização geotécnica e estabilidade de taludes com 18 anos de experiência. Responsável por campanhas de prospeção em terrenos tropicais em Angola, Moçambique e Guiné-Bissau.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 9, team_member_id: m10.lastInsertRowid, role_on_project: 'Responsável Geotécnico' })

  const h10a = insertHistory.run({
    team_member_id: m10.lastInsertRowid,
    project_id: 9,
    project_name: 'Aproveitamento Hidroelétrico de Laúca',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Kwanza Norte',
    category: 'energy', start_date: '2012-01-15', end_date: '2022-06-30',
    notes: 'Responsável pela campanha de prospeção geotécnica das ombreiras e fundação da barragem de Laúca.',
  })
  insertHistoryGeo.run({
    history_id: h10a.lastInsertRowid,
    point_label: 'BH-L01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Kwanza Norte',
    depth: 95.0, soil_type: 'solo residual', rock_type: 'gnaisse',
    groundwater_depth: 12.0, bearing_capacity: 1400, spt_n_value: 50, seismic_class: 'B',
    latitude: -9.6800, longitude: 15.2800, sampled_at: '2010-08-15',
    notes: 'Gnaisse são a partir dos 25 m. Excelentes condições para fundação.',
  })

  const h10b = insertHistory.run({
    team_member_id: m10.lastInsertRowid,
    project_id: null,
    project_name: 'Estabilização de Taludes — EN 10 Beira Interior',
    macro_region: 'EMEA', country: 'Portugal', place: 'Covilhã',
    category: 'transport', start_date: null, end_date: null,
    notes: 'Projeto de estabilização de taludes em xisto com pregagens e redes de proteção em troço montanhoso.',
  })
  insertHistoryGeo.run({
    history_id: h10b.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Covilhã',
    depth: 25.0, soil_type: 'coluvião', rock_type: 'xisto',
    groundwater_depth: 6.0, bearing_capacity: 400, spt_n_value: 30, seismic_class: 'B',
    latitude: 40.2800, longitude: -7.5100, sampled_at: '2018-03-20',
    notes: 'Xisto com foliação desfavorável. Requer pregagens profundas.',
  })

  await attachCv(m10.lastInsertRowid, {
    name: 'Ana Luísa Cardoso', title: 'Engenheira Geotécnica Sénior',
    email: 'ana.cardoso@coba.pt', phone: '+351 21 000 1174',
    bio: 'Especialista em caracterização geotécnica e estabilidade de taludes com 18 anos de experiência.',
    history: [
      { projectName: 'Aproveitamento Hidroelétrico de Laúca', country: 'Angola', macroRegion: 'Sub-Saharan Africa', category: 'energy', startDate: '2012-01-15', endDate: '2022-06-30', notes: 'Responsável pela campanha de prospeção geotécnica das ombreiras e fundação.' },
      { projectName: 'Estabilização de Taludes — EN 10 Beira Interior', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', notes: 'Projeto de estabilização de taludes em xisto com pregagens e redes de proteção.' },
    ],
  })

  // ── Membro 11: Bernardo Correia ───────────────────────────────────────────
  const m11 = insertMember.run({
    name: 'Bernardo Correia',
    title: 'Engenheiro Estrutural Pleno',
    email: 'bernardo.correia@coba.pt',
    phone: '+351 21 000 1187',
    bio: 'Engenheiro estrutural com 12 anos de experiência em pontes, viadutos e infraestruturas rodoviárias. Especialização em betão pré-esforçado e estruturas metálicas mistas.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 10, team_member_id: m11.lastInsertRowid, role_on_project: 'Responsável Estrutural' })

  const h11a = insertHistory.run({
    team_member_id: m11.lastInsertRowid,
    project_id: 10,
    project_name: 'Variante Rodoviária de Pemba',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Pemba',
    category: 'transport', start_date: '2024-02-01', end_date: null,
    notes: 'Projeto estrutural das duas pontes da variante e do nó de acesso em betão armado.',
  })
  insertHistoryStructure.run({
    history_id: h11a.lastInsertRowid,
    label: 'Ponte sobre o Rio Pemba', type: 'bridge',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Pemba',
    material: 'betão armado',
    length_m: 180, height_m: 12, span_m: 35,
    foundation_type: 'estacas', design_load: 350,
    latitude: -12.9730, longitude: 40.5180, built_at: null,
    notes: 'Ponte de 5 vãos em betão armado. Estacas cravadas em calcário coralíneo.',
  })

  const h11b = insertHistory.run({
    team_member_id: m11.lastInsertRowid,
    project_id: null,
    project_name: 'Viaduto de Acesso ao Porto de Sines',
    macro_region: 'EMEA', country: 'Portugal', place: 'Sines',
    category: 'transport', start_date: null, end_date: null,
    notes: 'Projeto de um viaduto de 850 m de acesso ao porto industrial de Sines, com tabuleiro de viga caixão em betão pré-esforçado.',
  })
  insertHistoryStructure.run({
    history_id: h11b.lastInsertRowid,
    label: 'Viaduto Porto de Sines', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Sines',
    material: 'betão pré-esforçado',
    length_m: 850, height_m: 18, span_m: 55,
    foundation_type: 'estacas', design_load: 400,
    latitude: 37.9400, longitude: -8.8800, built_at: '2019-05-01',
    notes: 'Tabuleiro de viga caixão pré-esforçado. 15 vãos de 55 m.',
  })

  await attachCv(m11.lastInsertRowid, {
    name: 'Bernardo Correia', title: 'Engenheiro Estrutural Pleno',
    email: 'bernardo.correia@coba.pt', phone: '+351 21 000 1187',
    bio: 'Engenheiro estrutural com 12 anos de experiência em pontes, viadutos e infraestruturas rodoviárias.',
    history: [
      { projectName: 'Variante Rodoviária de Pemba', country: 'Moçambique', macroRegion: 'Sub-Saharan Africa', category: 'transport', startDate: '2024-02-01', notes: 'Projeto estrutural das duas pontes da variante e do nó de acesso.' },
      { projectName: 'Viaduto de Acesso ao Porto de Sines', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', notes: 'Projeto de viaduto de 850 m com tabuleiro de viga caixão pré-esforçado.' },
    ],
  })

  // ── Membro 12: Inês Brito ─────────────────────────────────────────────────
  const m12 = insertMember.run({
    name: 'Inês Brito',
    title: 'Engenheira de Ambiente e Sustentabilidade',
    email: 'ines.brito@coba.pt',
    phone: '+351 21 000 1200',
    bio: 'Especializada em avaliação de impacte ambiental e sustentabilidade de grandes infraestruturas. Dez anos de experiência em EIA, RECAPE e planos de monitorização ambiental em projetos de transporte e energia.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 6, team_member_id: m12.lastInsertRowid, role_on_project: 'Técnica de Ambiente' })

  const h12a = insertHistory.run({
    team_member_id: m12.lastInsertRowid,
    project_id: null,
    project_name: 'EIA do Corredor de Alta Tensão Setúbal–Évora',
    macro_region: 'EMEA', country: 'Portugal', place: 'Setúbal / Évora',
    category: 'energy', start_date: null, end_date: null,
    notes: 'Coordenação da avaliação de impacte ambiental do corredor de linha de alta tensão de 120 km, incluindo estudo de alternativas e consulta pública.',
  })
  insertHistoryGeo.run({
    history_id: h12a.lastInsertRowid,
    point_label: 'FS-01', type: 'field_survey',
    macro_region: 'EMEA', country: 'Portugal', place: 'Évora',
    depth: 0, soil_type: 'argila vermelha', rock_type: 'xisto',
    groundwater_depth: null, bearing_capacity: null, spt_n_value: null, seismic_class: 'B',
    latitude: 38.5700, longitude: -8.0000, sampled_at: '2020-04-14',
    notes: 'Levantamento florístico e de habitats na zona de amortecimento do corredor.',
  })

  await attachCv(m12.lastInsertRowid, {
    name: 'Inês Brito', title: 'Engenheira de Ambiente e Sustentabilidade',
    email: 'ines.brito@coba.pt', phone: '+351 21 000 1200',
    bio: 'Especializada em avaliação de impacte ambiental e sustentabilidade de grandes infraestruturas.',
    history: [
      { projectName: 'EIA do Corredor de Alta Tensão Setúbal–Évora', country: 'Portugal', macroRegion: 'EMEA', category: 'energy', notes: 'Coordenação do EIA de corredor de alta tensão de 120 km, incluindo consulta pública.' },
    ],
  })

  // ── Membro 13: Tiago Almeida ──────────────────────────────────────────────
  const m13 = insertMember.run({
    name: 'Tiago Almeida',
    title: 'Engenheiro de Transportes Júnior',
    email: 'tiago.almeida@coba.pt',
    phone: '+351 21 000 1213',
    bio: 'Recém-formado pelo FEUP com especialização em engenharia de tráfego e mobilidade urbana. A iniciar carreira em projetos de infraestrutura de transportes em África.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 7, team_member_id: m13.lastInsertRowid, role_on_project: 'Assistente de Mobilidade' })

  const h13a = insertHistory.run({
    team_member_id: m13.lastInsertRowid,
    project_id: 7,
    project_name: 'Metro de Superfície de Maputo — Fase 1',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Maputo',
    category: 'transport', start_date: '2023-11-01', end_date: null,
    notes: 'Apoio à modelação de tráfego e análise da procura de passageiros para o estudo de viabilidade.',
  })
  insertHistoryGeo.run({
    history_id: h13a.lastInsertRowid,
    point_label: 'BH-M01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Maputo',
    depth: 20.0, soil_type: 'areia vermelha', rock_type: 'arenito',
    groundwater_depth: 8.0, bearing_capacity: 200, spt_n_value: 25, seismic_class: 'B',
    latitude: -25.9692, longitude: 32.5732, sampled_at: '2023-05-15',
    notes: 'Areia vermelha densa típica de Maputo.',
  })

  await attachCv(m13.lastInsertRowid, {
    name: 'Tiago Almeida', title: 'Engenheiro de Transportes Júnior',
    email: 'tiago.almeida@coba.pt', phone: '+351 21 000 1213',
    bio: 'Recém-formado pelo FEUP com especialização em engenharia de tráfego e mobilidade urbana.',
    history: [
      { projectName: 'Metro de Superfície de Maputo — Fase 1', country: 'Moçambique', macroRegion: 'Sub-Saharan Africa', category: 'transport', startDate: '2023-11-01', notes: 'Apoio à modelação de tráfego e análise da procura de passageiros.' },
    ],
  })

  // ── Membro 14: Margarida Pires ────────────────────────────────────────────
  const m14 = insertMember.run({
    name: 'Margarida Pires',
    title: 'Especialista em Sistemas de Abastecimento de Água',
    email: 'margarida.pires@coba.pt',
    phone: '+351 21 000 1226',
    bio: 'Engenheira hidráulica com 20 anos de experiência em sistemas de abastecimento e saneamento na África lusófona. Responsável por projetos em Angola, Moçambique e Cabo Verde com financiamento BEI e Banco Mundial.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 2, team_member_id: m14.lastInsertRowid, role_on_project: 'Especialista Hidráulica' })

  const h14a = insertHistory.run({
    team_member_id: m14.lastInsertRowid,
    project_id: null,
    project_name: 'Abastecimento de Água de Praia, Cabo Verde',
    macro_region: 'Sub-Saharan Africa', country: 'Cabo Verde', place: 'Praia',
    category: 'water', start_date: null, end_date: null,
    notes: 'Projeto de reforço do abastecimento de água da capital de Cabo Verde, incluindo dessalinização e nova rede de distribuição para 80 000 habitantes.',
  })
  insertHistoryGeo.run({
    history_id: h14a.lastInsertRowid,
    point_label: 'BH-CV01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Cabo Verde', place: 'Praia',
    depth: 30.0, soil_type: 'solo vulcânico', rock_type: 'basalto',
    groundwater_depth: 15.0, bearing_capacity: 600, spt_n_value: 45, seismic_class: 'B',
    latitude: 14.9330, longitude: -23.5133, sampled_at: '2016-06-20',
    notes: 'Solo vulcânico sobre basalto. Nível freático profundo em período seco.',
  })
  insertHistoryStructure.run({
    history_id: h14a.lastInsertRowid,
    label: 'Central de Dessalinização', type: 'building',
    macro_region: 'Sub-Saharan Africa', country: 'Cabo Verde', place: 'Praia',
    material: 'betão armado',
    length_m: 60, height_m: 8, span_m: null,
    foundation_type: 'laje de fundação', design_load: 40,
    latitude: 14.9330, longitude: -23.5133, built_at: '2019-01-01',
    notes: 'Central de dessalinização por osmose inversa com capacidade de 5 000 m³/dia.',
  })

  const h14b = insertHistory.run({
    team_member_id: m14.lastInsertRowid,
    project_id: null,
    project_name: 'ETAR de Bissau — Construção',
    macro_region: 'Sub-Saharan Africa', country: 'Guiné-Bissau', place: 'Bissau',
    category: 'water', start_date: null, end_date: null,
    notes: 'Projeto e supervisão da primeira ETAR urbana de Bissau, com capacidade de 15 000 EP e tratamento secundário biológico.',
  })
  insertHistoryStructure.run({
    history_id: h14b.lastInsertRowid,
    label: 'ETAR de Bissau', type: 'building',
    macro_region: 'Sub-Saharan Africa', country: 'Guiné-Bissau', place: 'Bissau',
    material: 'betão armado',
    length_m: 120, height_m: 6, span_m: null,
    foundation_type: 'laje de fundação', design_load: 30,
    latitude: 11.8636, longitude: -15.5977, built_at: '2021-06-01',
    notes: 'Tratamento secundário por biorreator de membrana. Reutilização de efluente para rega.',
  })

  await attachCv(m14.lastInsertRowid, {
    name: 'Margarida Pires', title: 'Especialista em Sistemas de Abastecimento de Água',
    email: 'margarida.pires@coba.pt', phone: '+351 21 000 1226',
    bio: 'Engenheira hidráulica com 20 anos de experiência em sistemas de abastecimento e saneamento na África lusófona.',
    history: [
      { projectName: 'Abastecimento de Água de Praia, Cabo Verde', country: 'Cabo Verde', macroRegion: 'Sub-Saharan Africa', category: 'water', notes: 'Reforço do abastecimento da capital com dessalinização e nova rede de distribuição.' },
      { projectName: 'ETAR de Bissau — Construção', country: 'Guiné-Bissau', macroRegion: 'Sub-Saharan Africa', category: 'water', notes: 'Projeto e supervisão da primeira ETAR urbana de Bissau com tratamento biológico.' },
    ],
  })

  // ── Membro 15: Carlos Monteiro ────────────────────────────────────────────
  const m15 = insertMember.run({
    name: 'Carlos Monteiro',
    title: 'Engenheiro de Planeamento Urbano',
    email: 'carlos.monteiro@coba.pt',
    phone: '+351 21 000 1239',
    bio: 'Especialista em planeamento urbano e ordenamento do território com 16 anos de experiência. Coordenou planos diretores municipais e estudos de expansão urbana em Portugal e nos PALOP.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 7, team_member_id: m15.lastInsertRowid, role_on_project: 'Consultor de Planeamento' })

  const h15a = insertHistory.run({
    team_member_id: m15.lastInsertRowid,
    project_id: null,
    project_name: 'Plano Diretor Municipal de Matola',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Matola',
    category: 'planning', start_date: null, end_date: null,
    notes: 'Elaboração do PDM da maior cidade industrial de Moçambique, incluindo zoneamento funcional, rede viária estruturante e áreas de expansão urbana.',
  })

  await attachCv(m15.lastInsertRowid, {
    name: 'Carlos Monteiro', title: 'Engenheiro de Planeamento Urbano',
    email: 'carlos.monteiro@coba.pt', phone: '+351 21 000 1239',
    bio: 'Especialista em planeamento urbano e ordenamento do território com 16 anos de experiência.',
    history: [
      { projectName: 'Plano Diretor Municipal de Matola', country: 'Moçambique', macroRegion: 'Sub-Saharan Africa', category: 'planning', notes: 'Elaboração do PDM da maior cidade industrial de Moçambique.' },
    ],
  })

  // ── Membro 16: Vera Simões ────────────────────────────────────────────────
  const m16 = insertMember.run({
    name: 'Vera Simões',
    title: 'Engenheira Geotécnica Plena',
    email: 'vera.simoes@coba.pt',
    phone: '+351 21 000 1252',
    bio: 'Engenheira geotécnica com 10 anos de experiência em fundações especiais, muros de suporte e contenção periférica. Familiaridade com solos tropicais lateríticos e argilas expansivas.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 3, team_member_id: m16.lastInsertRowid, role_on_project: 'Geotécnica Plena' })

  const h16a = insertHistory.run({
    team_member_id: m16.lastInsertRowid,
    project_id: 3,
    project_name: 'Expansão do Aeroporto Internacional Julius Nyerere',
    macro_region: 'Sub-Saharan Africa', country: 'Tanzania', place: 'Dar es Salaam',
    category: 'transport', start_date: '2018-09-01', end_date: null,
    notes: 'Apoio à campanha geotécnica da extensão do terminal e ensaios de estabilização de solos expansivos.',
  })
  insertHistoryGeo.run({
    history_id: h16a.lastInsertRowid,
    point_label: 'BH-R01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Tanzania', place: 'Dar es Salaam',
    depth: 25.0, soil_type: 'argila expansiva (black cotton)', rock_type: 'basalto',
    groundwater_depth: 3.2, bearing_capacity: 120, spt_n_value: 8, seismic_class: 'C',
    latitude: -6.8780, longitude: 39.2026, sampled_at: '2017-03-14',
    notes: 'Solo expansivo — requer tratamento com cal.',
  })

  const h16b = insertHistory.run({
    team_member_id: m16.lastInsertRowid,
    project_id: null,
    project_name: 'Contenção Periférica do Metro do Porto — Extensão',
    macro_region: 'EMEA', country: 'Portugal', place: 'Porto',
    category: 'transport', start_date: null, end_date: null,
    notes: 'Projeto de contenção por paredes moldadas e ancoragens provisórias para estações subterrâneas do metro.',
  })
  insertHistoryStructure.run({
    history_id: h16b.lastInsertRowid,
    label: 'Parede Moldada — Estação do Freixo', type: 'other',
    macro_region: 'EMEA', country: 'Portugal', place: 'Porto',
    material: 'betão armado',
    length_m: 240, height_m: 18, span_m: null,
    foundation_type: 'parede moldada', design_load: null,
    latitude: 41.1400, longitude: -8.5700, built_at: '2021-03-01',
    notes: 'Parede moldada de 18 m de profundidade com 3 níveis de ancoragens.',
  })

  await attachCv(m16.lastInsertRowid, {
    name: 'Vera Simões', title: 'Engenheira Geotécnica Plena',
    email: 'vera.simoes@coba.pt', phone: '+351 21 000 1252',
    bio: 'Engenheira geotécnica com 10 anos de experiência em fundações especiais, muros de suporte e contenção periférica.',
    history: [
      { projectName: 'Expansão do Aeroporto Internacional Julius Nyerere', country: 'Tanzania', macroRegion: 'Sub-Saharan Africa', category: 'transport', notes: 'Campanha geotécnica do terminal e ensaios de estabilização de solos.' },
      { projectName: 'Contenção Periférica do Metro do Porto — Extensão', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', notes: 'Projeto de paredes moldadas e ancoragens para estações subterrâneas.' },
    ],
  })

  // ── Membro 17: Nuno Azevedo ───────────────────────────────────────────────
  const m17 = insertMember.run({
    name: 'Nuno Azevedo',
    title: 'Engenheiro Hidráulico Pleno',
    email: 'nuno.azevedo@coba.pt',
    phone: '+351 21 000 1265',
    bio: 'Engenheiro com 11 anos de experiência em modelação hidráulica, gestão de cheias e infraestrutura de drenagem urbana. Utiliza ferramentas HEC-RAS, SWMM e MIKE Flood em projetos de Portugal e África.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 4, team_member_id: m17.lastInsertRowid, role_on_project: 'Modelação Hidráulica' })

  const h17a = insertHistory.run({
    team_member_id: m17.lastInsertRowid,
    project_id: null,
    project_name: 'Plano de Gestão de Cheias do Rio Douro',
    macro_region: 'EMEA', country: 'Portugal', place: 'Porto',
    category: 'water', start_date: null, end_date: null,
    notes: 'Elaboração do plano de gestão do risco de cheias para o troço urbano do Douro, incluindo modelação 2D e mapeamento de zonas de inundação.',
  })

  await attachCv(m17.lastInsertRowid, {
    name: 'Nuno Azevedo', title: 'Engenheiro Hidráulico Pleno',
    email: 'nuno.azevedo@coba.pt', phone: '+351 21 000 1265',
    bio: 'Engenheiro com 11 anos de experiência em modelação hidráulica, gestão de cheias e infraestrutura de drenagem urbana.',
    history: [
      { projectName: 'Plano de Gestão de Cheias do Rio Douro', country: 'Portugal', macroRegion: 'EMEA', category: 'water', notes: 'Elaboração do plano de gestão do risco de cheias com modelação 2D e mapeamento.' },
    ],
  })

  // ── Membro 18: Leonor Baptista ────────────────────────────────────────────
  const m18 = insertMember.run({
    name: 'Leonor Baptista',
    title: 'Engenheira de Energia Renovável',
    email: 'leonor.baptista@coba.pt',
    phone: '+351 21 000 1278',
    bio: 'Especialista em projetos de energia solar e eólica com 9 anos de experiência. Experiência em estudos de recurso, projeto de centrais fotovoltaicas e parques eólicos em Portugal, Moçambique e São Tomé e Príncipe.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 8, team_member_id: m18.lastInsertRowid, role_on_project: 'Especialista em Energia' })

  const h18a = insertHistory.run({
    team_member_id: m18.lastInsertRowid,
    project_id: null,
    project_name: 'Central Solar de Mocuba',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Mocuba',
    category: 'energy', start_date: null, end_date: null,
    notes: 'Projeto de central fotovoltaica de 40 MW em Mocuba, Moçambique, incluindo subestação de evacuação e linha de ligação à rede nacional.',
  })
  insertHistoryGeo.run({
    history_id: h18a.lastInsertRowid,
    point_label: 'BH-MO01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Mocuba',
    depth: 12.0, soil_type: 'laterite', rock_type: 'granito',
    groundwater_depth: 5.0, bearing_capacity: 280, spt_n_value: 30, seismic_class: 'B',
    latitude: -16.8430, longitude: 36.9870, sampled_at: '2020-02-10',
    notes: 'Laterite sobre granito decomposto. Adequado para fundação de painéis solares.',
  })

  await attachCv(m18.lastInsertRowid, {
    name: 'Leonor Baptista', title: 'Engenheira de Energia Renovável',
    email: 'leonor.baptista@coba.pt', phone: '+351 21 000 1278',
    bio: 'Especialista em projetos de energia solar e eólica com 9 anos de experiência.',
    history: [
      { projectName: 'Central Solar de Mocuba', country: 'Moçambique', macroRegion: 'Sub-Saharan Africa', category: 'energy', notes: 'Projeto de central fotovoltaica de 40 MW incluindo subestação e linha de evacuação.' },
    ],
  })

  // ── Membro 19: Rui Sequeira ───────────────────────────────────────────────
  const m19 = insertMember.run({
    name: 'Rui Sequeira',
    title: 'Engenheiro Geotécnico Júnior',
    email: 'rui.sequeira@coba.pt',
    phone: '+351 21 000 1291',
    bio: 'Engenheiro geotécnico júnior com 3 anos de experiência em prospeção geotécnica e ensaios de campo. A desenvolver competências em projetos de fundações em solo tropical.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 9, team_member_id: m19.lastInsertRowid, role_on_project: 'Assistente Geotécnico' })

  const h19a = insertHistory.run({
    team_member_id: m19.lastInsertRowid,
    project_id: null,
    project_name: 'Prospeção Geotécnica — Parque Industrial de Viana, Angola',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Viana',
    category: 'planning', start_date: null, end_date: null,
    notes: 'Campanha de prospeção com 35 sondagens rotativas e ensaios SPT/CPTu para o parque industrial de Viana.',
  })
  insertHistoryGeo.run({
    history_id: h19a.lastInsertRowid,
    point_label: 'BH-V01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Viana',
    depth: 20.0, soil_type: 'areia argilosa', rock_type: 'arenito',
    groundwater_depth: 7.0, bearing_capacity: 180, spt_n_value: 18, seismic_class: 'B',
    latitude: -8.9200, longitude: 13.3700, sampled_at: '2022-09-05',
    notes: 'Areia argilosa com variabilidade lateral. Requer atenção no projeto de fundações.',
  })

  await attachCv(m19.lastInsertRowid, {
    name: 'Rui Sequeira', title: 'Engenheiro Geotécnico Júnior',
    email: 'rui.sequeira@coba.pt', phone: '+351 21 000 1291',
    bio: 'Engenheiro geotécnico júnior com 3 anos de experiência em prospeção geotécnica e ensaios de campo.',
    history: [
      { projectName: 'Prospeção Geotécnica — Parque Industrial de Viana, Angola', country: 'Angola', macroRegion: 'Sub-Saharan Africa', category: 'planning', notes: 'Campanha de 35 sondagens rotativas e ensaios SPT/CPTu para parque industrial.' },
    ],
  })

  // ── Membro 20: Dora Vasconcellos ──────────────────────────────────────────
  const m20 = insertMember.run({
    name: 'Dora Vasconcellos',
    title: 'Especialista em Gestão de Projetos',
    email: 'dora.vasconcellos@coba.pt',
    phone: '+351 21 000 1304',
    bio: 'Especialista em gestão de projetos de engenharia com certificação PMP e 15 anos de experiência. Competências em planeamento, controlo de custos, risco e interface com clientes em projetos de grande dimensão em África e Europa.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 5, team_member_id: m20.lastInsertRowid, role_on_project: 'Gestora de Projeto Adjunta' })

  const h20a = insertHistory.run({
    team_member_id: m20.lastInsertRowid,
    project_id: null,
    project_name: 'Reabilitação da Rede Viária Urbana de Luanda',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Luanda',
    category: 'transport', start_date: null, end_date: null,
    notes: 'Gestão de projeto de reabilitação de 185 km de arruamentos urbanos em Luanda, incluindo drenagem e iluminação pública.',
  })

  await attachCv(m20.lastInsertRowid, {
    name: 'Dora Vasconcellos', title: 'Especialista em Gestão de Projetos',
    email: 'dora.vasconcellos@coba.pt', phone: '+351 21 000 1304',
    bio: 'Especialista em gestão de projetos de engenharia com certificação PMP e 15 anos de experiência.',
    history: [
      { projectName: 'Reabilitação da Rede Viária Urbana de Luanda', country: 'Angola', macroRegion: 'Sub-Saharan Africa', category: 'transport', notes: 'Gestão de reabilitação de 185 km de arruamentos urbanos com drenagem e iluminação.' },
    ],
  })

  // ── Membro 21: Fernando Mota ──────────────────────────────────────────────
  const m21 = insertMember.run({
    name: 'Fernando Mota',
    title: 'Engenheiro de Estruturas Metálicas Sénior',
    email: 'fernando.mota@coba.pt',
    phone: '+351 21 000 1317',
    bio: 'Especialista em projeto e cálculo de estruturas metálicas e mistas com 22 anos de experiência. Participou no projeto de coberturas de grandes terminais aeroportuários, passarelas e torres de telecomunicações em Portugal e em África.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 3, team_member_id: m21.lastInsertRowid, role_on_project: 'Responsável Estruturas Metálicas' })

  const h21a = insertHistory.run({
    team_member_id: m21.lastInsertRowid,
    project_id: 3,
    project_name: 'Expansão do Aeroporto Internacional Julius Nyerere',
    macro_region: 'Sub-Saharan Africa', country: 'Tanzania', place: 'Dar es Salaam',
    category: 'transport', start_date: '2018-09-01', end_date: null,
    notes: 'Projeto da estrutura metálica da cobertura da extensão do Terminal 3 com vãos de 36 m.',
  })
  insertHistoryStructure.run({
    history_id: h21a.lastInsertRowid,
    label: 'Cobertura Terminal 3', type: 'building',
    macro_region: 'Sub-Saharan Africa', country: 'Tanzania', place: 'Dar es Salaam',
    material: 'aço',
    length_m: 450, height_m: 22, span_m: 36,
    foundation_type: 'pilares metálicos em betão', design_load: 45,
    latitude: -6.8720, longitude: 39.2010, built_at: null,
    notes: 'Cobertura espacial em aço com vãos de 36 m e cobertura em chapa de alumínio.',
  })

  await attachCv(m21.lastInsertRowid, {
    name: 'Fernando Mota', title: 'Engenheiro de Estruturas Metálicas Sénior',
    email: 'fernando.mota@coba.pt', phone: '+351 21 000 1317',
    bio: 'Especialista em projeto e cálculo de estruturas metálicas e mistas com 22 anos de experiência.',
    history: [
      { projectName: 'Expansão do Aeroporto Internacional Julius Nyerere', country: 'Tanzania', macroRegion: 'Sub-Saharan Africa', category: 'transport', notes: 'Projeto da estrutura metálica da cobertura do Terminal 3 com vãos de 36 m.' },
    ],
  })

  // ── Membro 22: Susana Quintela ────────────────────────────────────────────
  const m22 = insertMember.run({
    name: 'Susana Quintela',
    title: 'Engenheira de Saneamento Plena',
    email: 'susana.quintela@coba.pt',
    phone: '+351 21 000 1330',
    bio: 'Engenheira de saneamento com 13 anos de experiência em redes de águas residuais, ETAR e saneamento rural. Projetos em Portugal, São Tomé e Príncipe e Guiné-Bissau com financiamento FIDA.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 6, team_member_id: m22.lastInsertRowid, role_on_project: 'Engenheira de Processo' })

  const h22a = insertHistory.run({
    team_member_id: m22.lastInsertRowid,
    project_id: null,
    project_name: 'Saneamento Rural de São Tomé — Fase II',
    macro_region: 'Sub-Saharan Africa', country: 'São Tomé e Príncipe', place: 'São Tomé',
    category: 'water', start_date: null, end_date: null,
    notes: 'Projeto de saneamento básico para 12 aldeias, incluindo fossas séticas, redes de coleta e latrinas melhoradas.',
  })
  insertHistoryGeo.run({
    history_id: h22a.lastInsertRowid,
    point_label: 'TP-ST01', type: 'trial_pit',
    macro_region: 'Sub-Saharan Africa', country: 'São Tomé e Príncipe', place: 'São Tomé',
    depth: 3.0, soil_type: 'solo vulcânico', rock_type: 'basalto',
    groundwater_depth: 1.5, bearing_capacity: 120, spt_n_value: 10, seismic_class: 'B',
    latitude: 0.3370, longitude: 6.7273, sampled_at: '2017-10-05',
    notes: 'Solo vulcânico permeável. Boas condições para infiltração de efluente tratado.',
  })

  await attachCv(m22.lastInsertRowid, {
    name: 'Susana Quintela', title: 'Engenheira de Saneamento Plena',
    email: 'susana.quintela@coba.pt', phone: '+351 21 000 1330',
    bio: 'Engenheira de saneamento com 13 anos de experiência em redes de águas residuais, ETAR e saneamento rural.',
    history: [
      { projectName: 'Saneamento Rural de São Tomé — Fase II', country: 'São Tomé e Príncipe', macroRegion: 'Sub-Saharan Africa', category: 'water', notes: 'Projeto de saneamento básico para 12 aldeias com fossas séticas e redes de coleta.' },
    ],
  })

  // ── Membro 23: Afonso Guerreiro ───────────────────────────────────────────
  const m23 = insertMember.run({
    name: 'Afonso Guerreiro',
    title: 'Engenheiro de Infraestruturas Ferroviárias',
    email: 'afonso.guerreiro@coba.pt',
    phone: '+351 21 000 1343',
    bio: 'Especialista em infraestruturas ferroviárias e metro com 17 anos de experiência em geometria de via, sistemas de drenagem ferroviária e projeto de estações. Projetos em Portugal, Moçambique e Angola.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 7, team_member_id: m23.lastInsertRowid, role_on_project: 'Especialista Ferroviário' })

  const h23a = insertHistory.run({
    team_member_id: m23.lastInsertRowid,
    project_id: 7,
    project_name: 'Metro de Superfície de Maputo — Fase 1',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Maputo',
    category: 'transport', start_date: '2023-11-01', end_date: null,
    notes: 'Responsável pelo projeto de geometria de via e infraestrutura ferroviária do metro de superfície de Maputo.',
  })
  insertHistoryGeo.run({
    history_id: h23a.lastInsertRowid,
    point_label: 'BH-M05', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Maputo',
    depth: 15.0, soil_type: 'aterro + areia', rock_type: '',
    groundwater_depth: 3.5, bearing_capacity: 120, spt_n_value: 12, seismic_class: 'B',
    latitude: -25.9530, longitude: 32.5890, sampled_at: '2023-06-02',
    notes: 'Zona da Baixa com aterros antigos. Requer melhoramento de solo.',
  })

  const h23b = insertHistory.run({
    team_member_id: m23.lastInsertRowid,
    project_id: null,
    project_name: 'Reabilitação da Linha do Caminho de Ferro de Nacala',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Nacala',
    category: 'transport', start_date: null, end_date: null,
    notes: 'Projeto de reabilitação de 220 km da linha ferroviária Nacala–Malawi, incluindo substituição de carril e correção de alinhamento.',
  })
  insertHistoryStructure.run({
    history_id: h23b.lastInsertRowid,
    label: 'Via Ferroviária Nacala–Cuamba', type: 'road',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Nacala',
    material: 'carril UIC54 / travessas betão',
    length_m: 220000, height_m: null, span_m: null,
    foundation_type: 'balastro', design_load: null,
    latitude: -14.5420, longitude: 40.6730, built_at: null,
    notes: 'Reabilitação de via com carril UIC54 e travessas de betão bi-bloco.',
  })

  await attachCv(m23.lastInsertRowid, {
    name: 'Afonso Guerreiro', title: 'Engenheiro de Infraestruturas Ferroviárias',
    email: 'afonso.guerreiro@coba.pt', phone: '+351 21 000 1343',
    bio: 'Especialista em infraestruturas ferroviárias e metro com 17 anos de experiência em geometria de via e projeto de estações.',
    history: [
      { projectName: 'Metro de Superfície de Maputo — Fase 1', country: 'Moçambique', macroRegion: 'Sub-Saharan Africa', category: 'transport', startDate: '2023-11-01', notes: 'Projeto de geometria de via e infraestrutura ferroviária do metro de superfície.' },
      { projectName: 'Reabilitação da Linha do Caminho de Ferro de Nacala', country: 'Moçambique', macroRegion: 'Sub-Saharan Africa', category: 'transport', notes: 'Reabilitação de 220 km de via com carril UIC54 e travessas de betão.' },
    ],
  })

  // ── Membro 24: Helena Fonseca ─────────────────────────────────────────────
  const m24 = insertMember.run({
    name: 'Helena Fonseca',
    title: 'Engenheira Civil Júnior',
    email: 'helena.fonseca@coba.pt',
    phone: '+351 21 000 1356',
    bio: 'Engenheira civil júnior recém-integrada na equipa COBA após mestrado no IST em Geotecnia e Estruturas. Colabora na elaboração de projetos de fundações e prospeção geotécnica.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 10, team_member_id: m24.lastInsertRowid, role_on_project: 'Assistente de Projeto' })

  const h24a = insertHistory.run({
    team_member_id: m24.lastInsertRowid,
    project_id: null,
    project_name: 'Estudo Geotécnico — Bairro do Restelo (Lisboa)',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    category: 'planning', start_date: null, end_date: null,
    notes: 'Campanha geotécnica para estudo de fundações de edifícios de habitação no Restelo, em argila vermelha.',
  })
  insertHistoryGeo.run({
    history_id: h24a.lastInsertRowid,
    point_label: 'BH-RE01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    depth: 18.0, soil_type: 'argila vermelha', rock_type: 'calcário',
    groundwater_depth: 8.0, bearing_capacity: 200, spt_n_value: 20, seismic_class: 'D',
    latitude: 38.7200, longitude: -9.1900, sampled_at: '2023-04-10',
    notes: 'Argila vermelha sobre calcário. Boas condições de fundação direta.',
  })

  await attachCv(m24.lastInsertRowid, {
    name: 'Helena Fonseca', title: 'Engenheira Civil Júnior',
    email: 'helena.fonseca@coba.pt', phone: '+351 21 000 1356',
    bio: 'Engenheira civil júnior recém-integrada na equipa COBA após mestrado no IST em Geotecnia e Estruturas.',
    history: [
      { projectName: 'Estudo Geotécnico — Bairro do Restelo (Lisboa)', country: 'Portugal', macroRegion: 'EMEA', category: 'planning', notes: 'Campanha geotécnica para fundações de edifícios de habitação em argila vermelha.' },
    ],
  })

  // ── Membro 25: Miguel Valente ─────────────────────────────────────────────
  const m25 = insertMember.run({
    name: 'Miguel Valente',
    title: 'Especialista em Infraestruturas de Energia Sénior',
    email: 'miguel.valente@coba.pt',
    phone: '+351 21 000 1369',
    bio: 'Engenheiro eletrotécnico com 20 anos de especialização em subestações de alta tensão, linhas de transmissão e integração de energias renováveis na rede. Projetos em Portugal, Angola e Moçambique.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 8, team_member_id: m25.lastInsertRowid, role_on_project: 'Especialista Elétrico' })

  const h25a = insertHistory.run({
    team_member_id: m25.lastInsertRowid,
    project_id: null,
    project_name: 'Linha de Alta Tensão 400 kV Douro — Valdigem',
    macro_region: 'EMEA', country: 'Portugal', place: 'Douro / Valdigem',
    category: 'energy', start_date: null, end_date: null,
    notes: 'Projeto de linha aérea de alta tensão de 400 kV com 85 km de extensão para reforço da rede nacional de transporte de eletricidade.',
  })

  await attachCv(m25.lastInsertRowid, {
    name: 'Miguel Valente', title: 'Especialista em Infraestruturas de Energia Sénior',
    email: 'miguel.valente@coba.pt', phone: '+351 21 000 1369',
    bio: 'Engenheiro eletrotécnico com 20 anos de especialização em subestações de alta tensão e integração de renováveis.',
    history: [
      { projectName: 'Linha de Alta Tensão 400 kV Douro — Valdigem', country: 'Portugal', macroRegion: 'EMEA', category: 'energy', notes: 'Projeto de linha aérea de 400 kV com 85 km para reforço da rede de transporte.' },
    ],
  })

  // ── Membro 26: Teresa Oliveira ────────────────────────────────────────────
  const m26 = insertMember.run({
    name: 'Teresa Oliveira',
    title: 'Engenheira Ambiental Júnior',
    email: 'teresa.oliveira@coba.pt',
    phone: '+351 21 000 1382',
    bio: 'Engenheira ambiental com 4 anos de experiência em monitorização ambiental, qualidade do ar e gestão de resíduos de construção. Apoia equipas de EIA e RECAPE em grandes projetos de infraestrutura.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 6, team_member_id: m26.lastInsertRowid, role_on_project: 'Assistente Ambiental' })

  const h26a = insertHistory.run({
    team_member_id: m26.lastInsertRowid,
    project_id: null,
    project_name: 'Monitorização Ambiental da Autoestrada A22 (Via do Infante)',
    macro_region: 'EMEA', country: 'Portugal', place: 'Algarve',
    category: 'environment', start_date: null, end_date: null,
    notes: 'Apoio à campanha de monitorização de ruído, qualidade da água e fauna durante a fase de construção do alargamento da A22.',
  })

  await attachCv(m26.lastInsertRowid, {
    name: 'Teresa Oliveira', title: 'Engenheira Ambiental Júnior',
    email: 'teresa.oliveira@coba.pt', phone: '+351 21 000 1382',
    bio: 'Engenheira ambiental com 4 anos de experiência em monitorização ambiental, qualidade do ar e gestão de resíduos.',
    history: [
      { projectName: 'Monitorização Ambiental da Autoestrada A22', country: 'Portugal', macroRegion: 'EMEA', category: 'environment', notes: 'Campanha de monitorização de ruído, qualidade da água e fauna durante construção.' },
    ],
  })

  // ── Membro 27: Hugo Pinheiro ──────────────────────────────────────────────
  const m27 = insertMember.run({
    name: 'Hugo Pinheiro',
    title: 'Engenheiro de Pontes e Viadutos Especialista',
    email: 'hugo.pinheiro@coba.pt',
    phone: '+351 21 000 1395',
    bio: 'Especialista sénior em estruturas de pontes com 24 anos de experiência, focado em pontes de grande vão, pontes estaiadas e tabuleiros de viga caixão. Participou em mais de 40 projetos de pontes em 12 países.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 1, team_member_id: m27.lastInsertRowid, role_on_project: 'Especialista em Pontes' })

  const h27a = insertHistory.run({
    team_member_id: m27.lastInsertRowid,
    project_id: 1,
    project_name: 'Ponte Vasco da Gama',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    category: 'transport', start_date: null, end_date: null,
    notes: 'Projeto de pormenor do tabuleiro estaiado e verificação sísmica dos pilones com 150 m de altura.',
  })
  insertHistoryStructure.run({
    history_id: h27a.lastInsertRowid,
    label: 'Pilone Norte (vão central)', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    material: 'betão armado',
    length_m: null, height_m: 150, span_m: 420,
    foundation_type: 'estacas', design_load: 425,
    latitude: 38.6920, longitude: -9.0970, built_at: '1998-03-29',
    notes: 'Pilone em H invertido com 150 m de altura. Verificação sísmica segundo EC8.',
  })

  const h27b = insertHistory.run({
    team_member_id: m27.lastInsertRowid,
    project_id: null,
    project_name: 'Ponte Internacional do Guadiana',
    macro_region: 'EMEA', country: 'Portugal', place: 'Vila Real de Santo António',
    category: 'transport', start_date: null, end_date: null,
    notes: 'Supervisão técnica da reabilitação e inspeção principal da Ponte Internacional do Guadiana.',
  })

  await attachCv(m27.lastInsertRowid, {
    name: 'Hugo Pinheiro', title: 'Engenheiro de Pontes e Viadutos Especialista',
    email: 'hugo.pinheiro@coba.pt', phone: '+351 21 000 1395',
    bio: 'Especialista sénior em estruturas de pontes com 24 anos de experiência. Participou em mais de 40 projetos de pontes em 12 países.',
    history: [
      { projectName: 'Ponte Vasco da Gama', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', notes: 'Projeto de pormenor do tabuleiro estaiado e verificação sísmica dos pilones.' },
      { projectName: 'Ponte Internacional do Guadiana', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', notes: 'Supervisão técnica da reabilitação e inspeção principal da ponte.' },
    ],
  })

  // ── Membro 28: Graça Esteves ──────────────────────────────────────────────
  const m28 = insertMember.run({
    name: 'Graça Esteves',
    title: 'Engenheira de Recursos Hídricos Sénior',
    email: 'graca.esteves@coba.pt',
    phone: '+351 21 000 1408',
    bio: 'Especialista em recursos hídricos, hidrogeologia e irrigação com 19 anos de experiência. Responsável por estudos de balanço hídrico, planos de bacia hidrográfica e sistemas de irrigação em Moçambique, Angola e Quénia.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 2, team_member_id: m28.lastInsertRowid, role_on_project: 'Especialista em Recursos Hídricos' })

  const h28a = insertHistory.run({
    team_member_id: m28.lastInsertRowid,
    project_id: null,
    project_name: 'Sistema de Irrigação do Vale do Limpopo',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Chókwè',
    category: 'water', start_date: null, end_date: null,
    notes: 'Estudo e projeto de reabilitação do sistema de irrigação do Vale do Limpopo para 30 000 ha, incluindo canais principais, redes de distribuição e drenos.',
  })
  insertHistoryStructure.run({
    history_id: h28a.lastInsertRowid,
    label: 'Canal Principal Norte', type: 'pipeline',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Chókwè',
    material: 'betão',
    length_m: 45000, height_m: null, span_m: null,
    foundation_type: 'fundação em laterite compactada', design_load: null,
    latitude: -24.5300, longitude: 32.9900, built_at: '2015-06-01',
    notes: 'Canal em betão com perfil trapezoidal. Caudal de projeto de 25 m³/s.',
  })

  const h28b = insertHistory.run({
    team_member_id: m28.lastInsertRowid,
    project_id: null,
    project_name: 'Estudo de Balanço Hídrico da Bacia do Rio Tana, Quénia',
    macro_region: 'Sub-Saharan Africa', country: 'Kenya', place: 'Garissa',
    category: 'water', start_date: null, end_date: null,
    notes: 'Modelação hidrológica da bacia do Rio Tana para avaliação do potencial de aproveitamento hidroelétrico e de irrigação.',
  })

  await attachCv(m28.lastInsertRowid, {
    name: 'Graça Esteves', title: 'Engenheira de Recursos Hídricos Sénior',
    email: 'graca.esteves@coba.pt', phone: '+351 21 000 1408',
    bio: 'Especialista em recursos hídricos, hidrogeologia e irrigação com 19 anos de experiência.',
    history: [
      { projectName: 'Sistema de Irrigação do Vale do Limpopo', country: 'Moçambique', macroRegion: 'Sub-Saharan Africa', category: 'water', notes: 'Reabilitação do sistema de irrigação para 30 000 ha com canais e redes de distribuição.' },
      { projectName: 'Estudo de Balanço Hídrico da Bacia do Rio Tana, Quénia', country: 'Kenya', macroRegion: 'Sub-Saharan Africa', category: 'water', notes: 'Modelação hidrológica para avaliação do potencial hidroelétrico e de irrigação.' },
    ],
  })

  // ── Membro 29: Pedro Noronha ──────────────────────────────────────────────
  const m29 = insertMember.run({
    name: 'Pedro Noronha',
    title: 'Engenheiro de Pavimentos Pleno',
    email: 'pedro.noronha@coba.pt',
    phone: '+351 21 000 1421',
    bio: 'Engenheiro de pavimentos com 14 anos de experiência em projeto e reabilitação de estradas em climas tropicais. Especializado em pavimentos betuminosos de alto módulo e estabilização de solos com cimento e cal.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 5, team_member_id: m29.lastInsertRowid, role_on_project: 'Especialista em Pavimentos' })

  const h29a = insertHistory.run({
    team_member_id: m29.lastInsertRowid,
    project_id: 5,
    project_name: 'Reabilitação da EN1 — Maputo a Beira',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Sofala / Inhambane',
    category: 'transport', start_date: '2021-03-15', end_date: null,
    notes: 'Dimensionamento do reforço do pavimento betuminoso ao longo dos 620 km do corredor da EN1.',
  })
  insertHistoryGeo.run({
    history_id: h29a.lastInsertRowid,
    point_label: 'FS-01', type: 'field_survey',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Inhambane',
    depth: 0, soil_type: 'laterite', rock_type: '',
    groundwater_depth: null, bearing_capacity: 200, spt_n_value: null, seismic_class: 'C',
    latitude: -19.2100, longitude: 34.5600, sampled_at: '2020-11-15',
    notes: '65% da faixa de rodagem requer reconstrução total.',
  })

  const h29b = insertHistory.run({
    team_member_id: m29.lastInsertRowid,
    project_id: null,
    project_name: 'Construção da Autoestrada Luanda–Viana',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Luanda',
    category: 'transport', start_date: null, end_date: null,
    notes: 'Projeto do pavimento da autoestrada urbana Luanda–Viana de 25 km em betão betuminoso de alto módulo.',
  })
  insertHistoryStructure.run({
    history_id: h29b.lastInsertRowid,
    label: 'Autoestrada Luanda–Viana', type: 'road',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Luanda',
    material: 'betuminoso de alto módulo',
    length_m: 25000, height_m: null, span_m: null,
    foundation_type: 'base granular + sub-base', design_load: null,
    latitude: -8.9000, longitude: 13.3200, built_at: '2018-12-01',
    notes: '6 vias de circulação. Pavimento com 4 camadas betuminosas de alto módulo.',
  })

  await attachCv(m29.lastInsertRowid, {
    name: 'Pedro Noronha', title: 'Engenheiro de Pavimentos Pleno',
    email: 'pedro.noronha@coba.pt', phone: '+351 21 000 1421',
    bio: 'Engenheiro de pavimentos com 14 anos de experiência em projeto e reabilitação de estradas em climas tropicais.',
    history: [
      { projectName: 'Reabilitação da EN1 — Maputo a Beira', country: 'Moçambique', macroRegion: 'Sub-Saharan Africa', category: 'transport', startDate: '2021-03-15', notes: 'Dimensionamento do reforço do pavimento betuminoso ao longo dos 620 km.' },
      { projectName: 'Construção da Autoestrada Luanda–Viana', country: 'Angola', macroRegion: 'Sub-Saharan Africa', category: 'transport', notes: 'Projeto do pavimento de autoestrada urbana de 25 km em betuminoso de alto módulo.' },
    ],
  })

  // ── Membro 30: Beatriz Cunha ──────────────────────────────────────────────
  const m30 = insertMember.run({
    name: 'Beatriz Cunha',
    title: 'Engenheira de Planeamento e Ordenamento do Território Sénior',
    email: 'beatriz.cunha@coba.pt',
    phone: '+351 21 000 1434',
    bio: 'Especialista em planeamento territorial com 16 anos de experiência em estudos de ordenamento, impacte territorial e gestão costeira. Coordenou planos estratégicos em Portugal e nas ilhas do Atlântico.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 7, team_member_id: m30.lastInsertRowid, role_on_project: 'Consultora de Ordenamento' })

  const h30a = insertHistory.run({
    team_member_id: m30.lastInsertRowid,
    project_id: null,
    project_name: 'Plano de Ordenamento da Orla Costeira — Alentejo',
    macro_region: 'EMEA', country: 'Portugal', place: 'Alentejo Litoral',
    category: 'environment', start_date: null, end_date: null,
    notes: 'Coordenação do POOC do Alentejo Litoral, incluindo cartografia de risco costeiro, zonamento e regulamentação de atividades em faixa costeira.',
  })

  const h30b = insertHistory.run({
    team_member_id: m30.lastInsertRowid,
    project_id: null,
    project_name: 'Estudo de Impacte Territorial da Linha de Alta Velocidade Lisboa–Porto',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa / Porto',
    category: 'transport', start_date: null, end_date: null,
    notes: 'Estudo de impacte territorial da LAV Lisboa–Porto, avaliando efeitos sobre usos do solo, população e atividade económica ao longo do corredor de 280 km.',
  })

  await attachCv(m30.lastInsertRowid, {
    name: 'Beatriz Cunha', title: 'Engenheira de Planeamento e Ordenamento do Território Sénior',
    email: 'beatriz.cunha@coba.pt', phone: '+351 21 000 1434',
    bio: 'Especialista em planeamento territorial com 16 anos de experiência em ordenamento, impacte territorial e gestão costeira.',
    history: [
      { projectName: 'Plano de Ordenamento da Orla Costeira — Alentejo', country: 'Portugal', macroRegion: 'EMEA', category: 'environment', notes: 'Coordenação do POOC do Alentejo Litoral com cartografia de risco e zonamento costeiro.' },
      { projectName: 'Estudo de Impacte Territorial da Linha de Alta Velocidade Lisboa–Porto', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', notes: 'Avaliação de efeitos sobre usos do solo e atividade económica no corredor de 280 km.' },
    ],
  })

  // ── Membros de Supervisão (oversight) ────────────────────────────────────
  const oversight1 = insertMember.run({
    name: 'Margarida Ferreira',
    title: 'Diretora de Portfolio',
    email: 'm.ferreira@coba.pt',
    phone: '+351 21 000 9001',
    bio: 'Responsável pela supervisão estratégica de todos os projetos de infraestrutura. 20 anos de experiência em gestão de portfolios na Europa e África.',
    role: 'oversight',
  })

  const oversight2 = insertMember.run({
    name: 'Rui Monteiro',
    title: 'Gestor de Programa Sénior',
    email: 'r.monteiro@coba.pt',
    phone: '+351 21 000 9002',
    bio: 'Especialista em gestão de risco e reporting executivo. Supervisiona projetos de transporte e energia em múltiplas regiões.',
    role: 'oversight',
  })
}
