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

  // ── Membro 1: António Ressano Garcia ─────────────────────────────────────
  const m1 = insertMember.run({
    name: 'António Ressano Garcia',
    title: 'Engenheiro Estrutural Sénior',
    email: 'a.garcia@coba.pt',
    phone: '+351 21 000 1001',
    bio: 'Mais de 30 anos de experiência em grandes projetos de infraestrutura na Europa e África. Especialista em pontes de grande vão e avaliação de risco geotécnico.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 1, team_member_id: m1.lastInsertRowid, role_on_project: 'Gestor de Projeto' })
  insertProjectTeam.run({ project_id: 4, team_member_id: m1.lastInsertRowid, role_on_project: 'Consultor Técnico' })

  // Histórico 1A: Reforço da Ponte 25 de Abril (externo)
  const h1a = insertHistory.run({
    team_member_id: m1.lastInsertRowid,
    project_id: null,
    project_name: 'Reforço da Ponte 25 de Abril',
    macro_region: 'EMEA',
    country: 'Portugal',
    place: 'Lisboa',
    category: 'transport',
    start_date: null,
    end_date: null,
    notes: 'Avaliação estrutural e projeto de reabilitação sísmica da ponte suspensa existente.',
  })
  insertHistoryGeo.run({
    history_id: h1a.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    depth: 38.0, soil_type: 'argila aluvionar', rock_type: 'calcário',
    groundwater_depth: 1.5, bearing_capacity: 160, spt_n_value: 10, seismic_class: 'D',
    latitude: 38.6890, longitude: -9.1770, sampled_at: '1990-04-12',
    notes: 'Argila aluvionar mole sobre calcário aos 32 m.',
  })
  insertHistoryGeo.run({
    history_id: h1a.lastInsertRowid,
    point_label: 'CS-01', type: 'core_sample',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    depth: 15.0, soil_type: '', rock_type: 'calcário',
    groundwater_depth: null, bearing_capacity: 900, spt_n_value: null, seismic_class: 'D',
    latitude: 38.6892, longitude: -9.1775, sampled_at: '1990-05-03',
    notes: 'Carote da base do pilone. RQD 75%.',
  })
  insertHistoryStructure.run({
    history_id: h1a.lastInsertRowid,
    label: 'Vão Principal (reforçado)', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    material: 'aço (suspensão)',
    length_m: 1013, height_m: 70, span_m: 1013,
    foundation_type: 'caixão', design_load: 320,
    latitude: 38.6890, longitude: -9.1770, built_at: null,
    notes: 'Reabilitação sísmica do tabuleiro e torres da ponte suspensa existente.',
  })
  insertHistoryFeature.run({
    history_id: h1a.lastInsertRowid,
    label: 'Sistema de Monitorização Estrutural',
    description: 'Instalação de rede de sensores sísmicos e acelerómetros para monitorização contínua da ponte.',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    latitude: 38.6890, longitude: -9.1770,
    notes: 'Sistema implementado após a conclusão dos trabalhos de reforço.',
  })

  // Histórico 1B: Ponte Vasco da Gama (ligado ao projeto 1)
  const h1b = insertHistory.run({
    team_member_id: m1.lastInsertRowid,
    project_id: 1,
    project_name: 'Ponte Vasco da Gama',
    macro_region: 'EMEA',
    country: 'Portugal',
    place: 'Lisboa',
    category: 'transport',
    start_date: null,
    end_date: null,
    notes: 'Dirigiu a prospeção geotécnica para fundações dos pilones no estuário do Tejo.',
  })
  insertHistoryGeo.run({
    history_id: h1b.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    depth: 42.5, soil_type: 'argila aluvionar', rock_type: 'calcário',
    groundwater_depth: 1.2, bearing_capacity: 180, spt_n_value: 12, seismic_class: 'D',
    latitude: 38.6916, longitude: -9.0965, sampled_at: '1993-06-10',
    notes: 'Depósitos aluvionares moles nas camadas superiores; substrato calcário a ~35 m.',
  })
  insertHistoryGeo.run({
    history_id: h1b.lastInsertRowid,
    point_label: 'TP-02', type: 'trial_pit',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    depth: 3.5, soil_type: 'aterro antrópico', rock_type: '',
    groundwater_depth: 2.1, bearing_capacity: 80, spt_n_value: 5, seismic_class: 'D',
    latitude: 38.6970, longitude: -9.1020, sampled_at: '1993-05-20',
    notes: 'Zona do aterro de acesso rodoviário.',
  })
  insertHistoryStructure.run({
    history_id: h1b.lastInsertRowid,
    label: 'Tabuleiro Principal', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    material: 'betão pré-esforçado / aço',
    length_m: 12300, height_m: null, span_m: 420,
    foundation_type: 'estacas', design_load: 425,
    latitude: 38.6916, longitude: -9.0965, built_at: '1998-03-29',
    notes: 'Vão central estaiado. Pilones com 150 m de altura em fundações por estacas.',
  })
  insertHistoryStructure.run({
    history_id: h1b.lastInsertRowid,
    label: 'Viaduto Norte', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    material: 'betão pré-esforçado',
    length_m: 4900, height_m: 48, span_m: 77,
    foundation_type: 'estacas', design_load: 300,
    latitude: 38.6975, longitude: -9.1025, built_at: '1997-11-15',
    notes: 'Viaduto de viga caixão contínuo a norte do estuário.',
  })

  await attachCv(m1.lastInsertRowid, {
    name: 'António Ressano Garcia', title: 'Engenheiro Estrutural Sénior',
    email: 'a.garcia@coba.pt', phone: '+351 21 000 1001',
    bio: 'Mais de 30 anos de experiência em grandes projetos de infraestrutura na Europa e África. Especialista em pontes de grande vão e avaliação de risco geotécnico.',
    history: [
      { projectName: 'Reforço da Ponte 25 de Abril', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', notes: 'Avaliação estrutural e projeto de reabilitação sísmica da ponte suspensa existente.' },
      { projectName: 'Ponte Vasco da Gama', country: 'Portugal', macroRegion: 'EMEA', category: 'transport', notes: 'Dirigiu a prospeção geotécnica para fundações dos pilones no estuário do Tejo.' },
    ],
  })

  // ── Membro 2: Maria Conceição Figueiredo ──────────────────────────────────
  const m2 = insertMember.run({
    name: 'Maria Conceição Figueiredo',
    title: 'Engenheira Geotécnica',
    email: 'm.figueiredo@coba.pt',
    phone: '+351 21 000 1042',
    bio: 'Especialista em infraestruturas hídricas e hidrogeologia na África Subsaariana e Sudeste Asiático. Experiente em programas de prospeção geotécnica de grande escala.',
    role: 'user',
  })
  insertProjectTeam.run({ project_id: 2, team_member_id: m2.lastInsertRowid, role_on_project: 'Gestora de Projeto' })
  insertProjectTeam.run({ project_id: 5, team_member_id: m2.lastInsertRowid, role_on_project: 'Responsável Geotécnico' })

  // Histórico 2A: Sistema de Abastecimento de Água de Luanda Norte (ligado ao projeto 2)
  const h2a = insertHistory.run({
    team_member_id: m2.lastInsertRowid,
    project_id: 2,
    project_name: 'Sistema de Abastecimento de Água de Luanda Norte',
    macro_region: 'Sub-Saharan Africa',
    country: 'Angola',
    place: 'Luanda',
    category: 'water',
    start_date: null,
    end_date: null,
    notes: 'Coordenou o programa geotécnico completo para a estação de tratamento e corredor de 80 km de conduta.',
  })
  insertHistoryGeo.run({
    history_id: h2a.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Luanda Norte',
    depth: 18.0, soil_type: 'laterite', rock_type: 'granito',
    groundwater_depth: 6.5, bearing_capacity: 300, spt_n_value: 35, seismic_class: 'B',
    latitude: -8.7328, longitude: 13.2543, sampled_at: '2012-09-05',
    notes: 'Crosta laterítica sobre granito decomposto. Boas condições de fundação.',
  })
  insertHistoryGeo.run({
    history_id: h2a.lastInsertRowid,
    point_label: 'BH-03', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Luanda Norte',
    depth: 22.0, soil_type: 'areia argilosa', rock_type: 'xisto',
    groundwater_depth: 8.0, bearing_capacity: 220, spt_n_value: 22, seismic_class: 'B',
    latitude: -8.7102, longitude: 13.2701, sampled_at: '2012-09-12',
    notes: 'Zona de vala da conduta.',
  })
  insertHistoryStructure.run({
    history_id: h2a.lastInsertRowid,
    label: 'Estação de Tratamento', type: 'building',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Luanda Norte',
    material: 'betão armado',
    length_m: 280, height_m: 14, span_m: null,
    foundation_type: 'laje de fundação', design_load: 60,
    latitude: -8.7328, longitude: 13.2543, built_at: '2019-06-01',
    notes: 'Capacidade de 120 000 m³/dia. Coagulação, sedimentação, filtração e cloragem.',
  })
  insertHistoryStructure.run({
    history_id: h2a.lastInsertRowid,
    label: 'Adutora DN1200', type: 'pipeline',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Luanda Norte',
    material: 'ferro dúctil',
    length_m: 82000, height_m: null, span_m: null,
    foundation_type: 'enterrada', design_load: 16,
    latitude: -8.7200, longitude: 13.2600, built_at: '2019-09-15',
    notes: '82 km de adutora DN1200 em ferro dúctil.',
  })
  insertHistoryFeature.run({
    history_id: h2a.lastInsertRowid,
    label: 'Captação do Rio Bengo',
    description: 'Obra de captação de água bruta com estação elevatória de 1,4 m³/s.',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Caxito',
    latitude: -8.5800, longitude: 13.6600,
    notes: 'Responsável pela prospeção hidrogeológica do local de captação.',
  })

  // Histórico 2B: Abastecimento de Água e Saneamento de Nacala (externo)
  const h2b = insertHistory.run({
    team_member_id: m2.lastInsertRowid,
    project_id: null,
    project_name: 'Abastecimento de Água e Saneamento de Nacala',
    macro_region: 'Sub-Saharan Africa',
    country: 'Moçambique',
    place: 'Nacala',
    category: 'water',
    start_date: null,
    end_date: null,
    notes: 'Avaliação hidrogeológica e projeto de furos de captação para sistema de abastecimento de água rural.',
  })
  insertHistoryGeo.run({
    history_id: h2b.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Nacala',
    depth: 45.0, soil_type: 'argila arenosa', rock_type: 'gnaisse',
    groundwater_depth: 12.0, bearing_capacity: 250, spt_n_value: 28, seismic_class: 'B',
    latitude: -14.5420, longitude: 40.6730, sampled_at: '2010-07-18',
    notes: 'Aquífero produtivo entre 35–45 m em gnaisse alterado.',
  })
  insertHistoryStructure.run({
    history_id: h2b.lastInsertRowid,
    label: 'Torre de Água', type: 'building',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Nacala',
    material: 'betão armado',
    length_m: null, height_m: 25, span_m: null,
    foundation_type: 'estacas', design_load: null,
    latitude: -14.5420, longitude: 40.6730, built_at: '2013-03-01',
    notes: 'Reservatório elevado de 500 m³ ao serviço de 40 000 habitantes.',
  })
  insertHistoryStructure.run({
    history_id: h2b.lastInsertRowid,
    label: 'Ramais de Distribuição', type: 'pipeline',
    macro_region: 'Sub-Saharan Africa', country: 'Moçambique', place: 'Nacala',
    material: 'PEAD',
    length_m: 35000, height_m: null, span_m: null,
    foundation_type: 'enterrada', design_load: 10,
    latitude: -14.5420, longitude: 40.6730, built_at: '2013-06-01',
    notes: '35 km de rede de distribuição em PEAD.',
  })

  await attachCv(m2.lastInsertRowid, {
    name: 'Maria Conceição Figueiredo', title: 'Engenheira Geotécnica',
    email: 'm.figueiredo@coba.pt', phone: '+351 21 000 1042',
    bio: 'Especialista em infraestruturas hídricas e hidrogeologia na África Subsaariana e Sudeste Asiático. Experiente em programas de prospeção geotécnica de grande escala.',
    history: [
      { projectName: 'Sistema de Abastecimento de Água de Luanda Norte', country: 'Angola', macroRegion: 'Sub-Saharan Africa', category: 'water', notes: 'Coordenou o programa geotécnico completo para a estação de tratamento e corredor de 80 km de conduta.' },
      { projectName: 'Abastecimento de Água e Saneamento de Nacala', country: 'Moçambique', macroRegion: 'Sub-Saharan Africa', category: 'water', notes: 'Avaliação hidrogeológica e projeto de furos de captação para sistema de abastecimento de água rural.' },
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
