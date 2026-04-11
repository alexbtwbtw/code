import { db } from '../db'
import { insertProject } from '../db/statements/projects'
import { insertGeo } from '../db/statements/geo'
import { insertStructure } from '../db/statements/structures'

// ── Seed: Real COBA Projects from DGP R37-2025 (29 September 2025) ──────────

export const seedProjects = db.transaction(() => {

  // ── Project 1: 4ème Rocade d'Alger ──────────────────────────────────────
  insertProject.run({
    ref_code: '1243-ROC12',
    name: "4ème Rocade d'Alger",
    client: 'Algerian gov.',
    macro_region: 'EMEA',
    country: 'Algeria',
    place: 'Alger',
    category: 'transport',
    status: 'completed',
    priority: 'low',
    start_date: '2010-01-01',
    end_date: '2014-12-31',
    currency: 'EUR',
    description: "Projet de la 4ème rocade autoroutière d'Alger. Études complétées. Formation des équipes locales en attente.",
    tags: 'route,rocade,formation',
  })

  // ── Project 2: EN222/A32 Serrinha ────────────────────────────────────────
  insertProject.run({
    ref_code: '40449-SERR',
    name: 'EN222/A32 Serrinha',
    client: 'Infraestruturas de Portugal',
    macro_region: 'EMEA',
    country: 'Portugal',
    place: 'Serrinha',
    category: 'transport',
    status: 'active',
    priority: 'medium',
    start_date: '2022-03-01',
    currency: 'EUR',
    description: 'Projeto de execução e fiscalização da ligação EN222/A32 em Serrinha.',
    tags: 'estrada,ic,sit',
  })

  // ── Project 3: AH Caculo Cabaça ──────────────────────────────────────────
  const p3 = insertProject.run({
    ref_code: '40315-CACU',
    name: 'AH Caculo Cabaça — Serviços de Assessoria',
    client: 'GAMEK',
    macro_region: 'Sub-Saharan Africa',
    country: 'Angola',
    place: 'Rio Kwanza',
    category: 'energy',
    status: 'active',
    priority: 'critical',
    start_date: '2019-06-01',
    currency: 'USD',
    description: 'Aproveitamento hidroelétrico Caculo Cabaça no Rio Kwanza. Serviços de assessoria e supervisão de construção.',
    tags: 'hidroelétrico,angola,kwanza,assessoria',
  })
  insertGeo.run({
    project_id: p3.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Rio Kwanza',
    depth: 35.0, soil_type: 'saibro granítico', rock_type: 'granito',
    groundwater_depth: 4.5, bearing_capacity: 400, spt_n_value: 45, seismic_class: 'B',
    latitude: -9.52, longitude: 14.48, sampled_at: '2019-09-12',
    notes: 'Sondagem de reconhecimento na zona da barragem. Substrato granítico a partir de 8 m.',
  })
  insertGeo.run({
    project_id: p3.lastInsertRowid,
    point_label: 'BH-05', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Rio Kwanza',
    depth: 50.0, soil_type: 'areia média a grosseira', rock_type: 'granito alterado',
    groundwater_depth: 2.8, bearing_capacity: 350, spt_n_value: 38, seismic_class: 'B',
    latitude: -9.54, longitude: 14.50, sampled_at: '2019-09-18',
    notes: 'Zona da central de produção. Granito muito alterado nas primeiras camadas.',
  })
  insertStructure.run({
    project_id: p3.lastInsertRowid,
    label: 'Barragem Caculo Cabaça', type: 'dam',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Rio Kwanza',
    material: 'betão',
    length_m: 380, height_m: 68, span_m: null,
    foundation_type: 'rocha granítica', design_load: null,
    latitude: -9.53, longitude: 14.49, built_at: null,
    notes: 'Barragem de betão em arco no Rio Kwanza. Potência instalada de 2 172 MW.',
  })

  // ── Project 4: Barragem de Rarai ─────────────────────────────────────────
  const p4 = insertProject.run({
    ref_code: '40348-RRAI',
    name: 'Barragem de Rarai',
    client: 'SECAEH',
    macro_region: 'EMEA',
    country: 'Tunisia',
    place: 'Rarai',
    category: 'water',
    status: 'active',
    priority: 'medium',
    start_date: '2021-01-01',
    currency: 'EUR',
    description: 'Projeto de execução e fiscalização da Barragem de Rarai. Consórcio COBA/SCET/AHT. Estudos hidrológicos e hidráulicos em curso.',
    tags: 'barragem,tunísia,sg',
  })
  insertGeo.run({
    project_id: p4.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'EMEA', country: 'Tunisia', place: 'Rarai',
    depth: 28.0, soil_type: 'argila calcária', rock_type: 'calcário margoso',
    groundwater_depth: 6.0, bearing_capacity: 250, spt_n_value: 22, seismic_class: 'C',
    latitude: 36.40, longitude: 9.80, sampled_at: '2021-04-15',
    notes: 'Sondagem na zona da implantação da barragem. Alternância de argila e calcário.',
  })
  insertStructure.run({
    project_id: p4.lastInsertRowid,
    label: 'Barragem de Rarai', type: 'dam',
    macro_region: 'EMEA', country: 'Tunisia', place: 'Rarai',
    material: 'terra/enrocamento',
    length_m: 450, height_m: 32, span_m: null,
    foundation_type: 'solo tratado', design_load: null,
    latitude: 36.40, longitude: 9.80, built_at: null,
    notes: 'Barragem de terra homogénea com núcleo argiloso e filtros de transição.',
  })

  // ── Project 5: IP3 Souselas-Viseu ────────────────────────────────────────
  insertProject.run({
    ref_code: '40418-IP3R',
    name: 'IP3 Souselas-Viseu',
    client: 'Infraestruturas de Portugal',
    macro_region: 'EMEA',
    country: 'Portugal',
    place: 'Souselas-Viseu',
    category: 'transport',
    status: 'active',
    priority: 'medium',
    start_date: '2021-06-01',
    currency: 'EUR',
    description: 'Projeto de requalificação do IP3 entre Souselas e Viseu. Infraestruturas rodoviárias.',
    tags: 'ip3,estrada,portugal',
  })

  // ── Project 6: AH Saltinho ───────────────────────────────────────────────
  const p6 = insertProject.run({
    ref_code: '40433-SALT',
    name: 'AH Saltinho — Projeto e Fiscalização',
    client: 'Ministério de Energia da Guiné-Bissau',
    macro_region: 'Sub-Saharan Africa',
    country: 'Guinea-Bissau',
    place: 'Rio Corubal',
    category: 'energy',
    status: 'active',
    priority: 'high',
    start_date: '2021-09-01',
    currency: 'EUR',
    description: 'Aproveitamento hidroelétrico de Saltinho no Rio Corubal, Guiné-Bissau. Projeto e fiscalização da obra.',
    tags: 'hidroelétrico,guiné-bissau,corubal',
  })
  insertGeo.run({
    project_id: p6.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Guinea-Bissau', place: 'Rio Corubal',
    depth: 22.0, soil_type: 'laterite', rock_type: 'xisto',
    groundwater_depth: 3.2, bearing_capacity: 200, spt_n_value: 18, seismic_class: 'B',
    latitude: 11.82, longitude: -14.92, sampled_at: '2021-12-08',
    notes: 'Sondagem na zona da barragem de Saltinho. Xisto a partir de 10 m.',
  })
  insertStructure.run({
    project_id: p6.lastInsertRowid,
    label: 'Barragem de Saltinho', type: 'dam',
    macro_region: 'Sub-Saharan Africa', country: 'Guinea-Bissau', place: 'Rio Corubal',
    material: 'betão ciclópico',
    length_m: 160, height_m: 18, span_m: null,
    foundation_type: 'rocha xistosa', design_load: null,
    latitude: 11.82, longitude: -14.92, built_at: null,
    notes: 'Barragem de gravidade no Rio Corubal. Central com potência de 55 MW.',
  })

  // ── Project 7: EIA Saltinho ──────────────────────────────────────────────
  insertProject.run({
    ref_code: '40620-IASA',
    name: 'EIA Saltinho',
    client: 'Ministério de Energia da Guiné-Bissau',
    macro_region: 'Sub-Saharan Africa',
    country: 'Guinea-Bissau',
    place: 'Rio Corubal',
    category: 'environment',
    status: 'active',
    priority: 'medium',
    start_date: '2022-01-01',
    currency: 'EUR',
    description: 'Estudo de Impacte Ambiental e Social do Aproveitamento de Saltinho.',
    tags: 'eia,guiné-bissau,ambiente',
  })

  // ── Project 8: STEP ONEE — Estudo de Viabilidade ─────────────────────────
  insertProject.run({
    ref_code: '40432-STEP',
    name: 'STEP ONEE — Estudo de Viabilidade',
    client: 'ONEE',
    macro_region: 'EMEA',
    country: 'Morocco',
    place: 'Marrocos',
    category: 'energy',
    status: 'active',
    priority: 'medium',
    start_date: '2022-04-01',
    currency: 'EUR',
    description: 'Estudo de viabilidade para centrais hidroelétricas reversíveis (STEP) para a ONEE em Marrocos.',
    tags: 'step,hidroelétrico,marrocos,onee',
  })

  // ── Project 9: Metro Lisboa Lote 2 ───────────────────────────────────────
  const p9 = insertProject.run({
    ref_code: '40541-L2ML',
    name: 'Metro Lisboa Lote 2',
    client: 'Metropolitano de Lisboa',
    macro_region: 'EMEA',
    country: 'Portugal',
    place: 'Lisboa',
    category: 'transport',
    status: 'active',
    priority: 'high',
    start_date: '2022-07-01',
    currency: 'EUR',
    description: 'Projeto de execução e fiscalização do Lote 2 da extensão do Metropolitano de Lisboa. Estruturas especiais.',
    tags: 'metro,lisboa,túnel,se',
  })
  insertGeo.run({
    project_id: p9.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    depth: 30.0, soil_type: 'argila', rock_type: 'calcário',
    groundwater_depth: 5.0, bearing_capacity: 180, spt_n_value: 14, seismic_class: 'D',
    latitude: 38.72, longitude: -9.14, sampled_at: '2022-09-20',
    notes: 'Sondagem de reconhecimento para traçado do túnel. Argila entre 0-12 m, calcário abaixo.',
  })
  insertStructure.run({
    project_id: p9.lastInsertRowid,
    label: 'Túnel Lote 2 Metro Lisboa', type: 'tunnel',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    material: 'betão reforçado / TBM',
    length_m: 1800, height_m: null, span_m: 9.2,
    foundation_type: null, design_load: null,
    latitude: 38.72, longitude: -9.14, built_at: null,
    notes: 'Túnel escavado por TBM. Secção circular de 9,2 m de diâmetro.',
  })

  // ── Project 10: STEP El Menzel ───────────────────────────────────────────
  const p10 = insertProject.run({
    ref_code: '40596-MENZ',
    name: 'STEP El Menzel',
    client: 'ONEE/STEG',
    macro_region: 'EMEA',
    country: 'Morocco',
    place: 'El Menzel',
    category: 'energy',
    status: 'active',
    priority: 'very_high',
    start_date: '2022-10-01',
    currency: 'EUR',
    description: 'Projeto da central hidroelétrica reversível de El Menzel, Marrocos. Estruturas subterrâneas e equipamentos hidromecânicos.',
    tags: 'step,el-menzel,marrocos,energia',
  })
  insertGeo.run({
    project_id: p10.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'EMEA', country: 'Morocco', place: 'El Menzel',
    depth: 60.0, soil_type: 'xisto argiloso', rock_type: 'xisto / quartzito',
    groundwater_depth: 12.0, bearing_capacity: 500, spt_n_value: null, seismic_class: 'B',
    latitude: 33.80, longitude: -5.60, sampled_at: '2023-01-10',
    notes: 'Sondagem para reconhecimento da caverna da central. Maciço rochoso competente.',
  })
  insertStructure.run({
    project_id: p10.lastInsertRowid,
    label: 'Caverna Central STEP El Menzel', type: 'tunnel',
    macro_region: 'EMEA', country: 'Morocco', place: 'El Menzel',
    material: 'rocha / betão projetado',
    length_m: 120, height_m: 28, span_m: 22,
    foundation_type: 'rocha', design_load: null,
    latitude: 33.80, longitude: -5.60, built_at: null,
    notes: 'Caverna subterrânea para instalação dos grupos reversíveis. Pressão interna 8 bar.',
  })

  // ── Project 11: Dessalinização Algarve ───────────────────────────────────
  const p11 = insertProject.run({
    ref_code: '40602-DSAL',
    name: 'Dessalinização Algarve — Projeto',
    client: 'AdP / EPAL',
    macro_region: 'EMEA',
    country: 'Portugal',
    place: 'Algarve',
    category: 'water',
    status: 'active',
    priority: 'high',
    start_date: '2023-01-01',
    currency: 'EUR',
    description: 'Projeto de execução da estação de dessalinização do Algarve para reforço do abastecimento de água na região.',
    tags: 'dessalinização,algarve,água,sae',
  })
  insertGeo.run({
    project_id: p11.lastInsertRowid,
    point_label: 'CPT-01', type: 'cpt',
    macro_region: 'EMEA', country: 'Portugal', place: 'Algarve',
    depth: 15.0, soil_type: 'areia calcária', rock_type: 'calcário',
    groundwater_depth: 2.5, bearing_capacity: 150, spt_n_value: null, seismic_class: 'C',
    latitude: 37.00, longitude: -7.94, sampled_at: '2023-03-14',
    notes: 'CPT na zona de implantação da estação. Areias calcárias até 8 m, calcário abaixo.',
  })

  // ── Project 12: Linha Norte Alverca-Castanheira do Ribatejo ──────────────
  insertProject.run({
    ref_code: '40610-ALCR',
    name: 'Linha Norte Alverca-Castanheira do Ribatejo',
    client: 'Infraestruturas de Portugal',
    macro_region: 'EMEA',
    country: 'Portugal',
    place: 'Alverca-Castanheira do Ribatejo',
    category: 'transport',
    status: 'active',
    priority: 'very_high',
    start_date: '2023-02-01',
    currency: 'EUR',
    description: 'Projeto de melhoria e modernização da Linha Norte entre Alverca e Castanheira do Ribatejo. Sistema de informação de tráfego.',
    tags: 'linha-norte,ferrovia,sit,portugal',
  })

  // ── Project 13: Barragem Calucuve ─────────────────────────────────────────
  const p13 = insertProject.run({
    ref_code: '40622-CALU',
    name: 'Barragem Calucuve',
    client: 'MINEA',
    macro_region: 'Sub-Saharan Africa',
    country: 'Angola',
    place: 'Calucuve',
    category: 'water',
    status: 'active',
    priority: 'medium',
    start_date: '2023-03-01',
    currency: 'USD',
    description: 'Projeto da barragem de Calucuve em Angola. Estudos geotécnicos e projeto de execução da barragem.',
    tags: 'barragem,angola,sg',
  })
  insertGeo.run({
    project_id: p13.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Calucuve',
    depth: 25.0, soil_type: 'argila laterítica', rock_type: 'basalto',
    groundwater_depth: 5.0, bearing_capacity: 280, spt_n_value: 30, seismic_class: 'B',
    latitude: -11.20, longitude: 14.60, sampled_at: '2023-06-05',
    notes: 'Sondagem no leito do rio. Solo laterítico sobre basalto. NF a 5 m.',
  })

  // ── Project 14: Fábrica Baterias CALB Sines — EIA ─────────────────────────
  insertProject.run({
    ref_code: '40663-GIGA',
    name: 'Fábrica Baterias CALB Sines — EIA',
    client: 'CALB Technology',
    macro_region: 'EMEA',
    country: 'Portugal',
    place: 'Sines',
    category: 'environment',
    status: 'active',
    priority: 'medium',
    start_date: '2023-05-01',
    currency: 'EUR',
    description: 'Estudo de Impacte Ambiental para a fábrica de baterias CALB (gigafactory) em Sines.',
    tags: 'eia,baterias,sines,ambiente',
  })

  // ── Project 15: ETA de Bita ───────────────────────────────────────────────
  const p15 = insertProject.run({
    ref_code: '40690-BITA',
    name: 'ETA de Bita',
    client: 'MINEA/EPAL Angola',
    macro_region: 'Sub-Saharan Africa',
    country: 'Angola',
    place: 'Bita, Luanda',
    category: 'water',
    status: 'active',
    priority: 'critical',
    start_date: '2023-06-01',
    currency: 'USD',
    description: 'Projeto e fiscalização da Estação de Tratamento de Água de Bita para abastecimento de Luanda. Capacidade de 260 000 m³/dia.',
    tags: 'eta,angola,luanda,água',
  })
  insertGeo.run({
    project_id: p15.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Bita, Luanda',
    depth: 18.0, soil_type: 'areia fina', rock_type: 'granito',
    groundwater_depth: 3.5, bearing_capacity: 150, spt_n_value: 12, seismic_class: 'B',
    latitude: -8.95, longitude: 13.35, sampled_at: '2023-08-20',
    notes: 'Sondagem na zona de implantação dos decantadores. Areia fina superficial, granito a partir de 14 m.',
  })
  insertGeo.run({
    project_id: p15.lastInsertRowid,
    point_label: 'CPT-02', type: 'cpt',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Bita, Luanda',
    depth: 12.0, soil_type: 'argila arenosa', rock_type: null,
    groundwater_depth: 3.0, bearing_capacity: 120, spt_n_value: null, seismic_class: 'B',
    latitude: -8.96, longitude: 13.34, sampled_at: '2023-08-22',
    notes: 'CPT na zona dos filtros rápidos. Perfil argiloso com intercalações arenosas.',
  })

  // ── Project 16: Infraestruturas Bairro Encarnação ────────────────────────
  insertProject.run({
    ref_code: '40665-BENC',
    name: 'Infraestruturas Bairro Encarnação',
    client: 'CML',
    macro_region: 'EMEA',
    country: 'Portugal',
    place: 'Lisboa',
    category: 'transport',
    status: 'active',
    priority: 'low',
    start_date: '2023-04-01',
    currency: 'EUR',
    description: 'Projeto de infraestruturas de transportes e urbanismo do Bairro da Encarnação em Lisboa.',
    tags: 'urbanismo,lisboa,sit',
  })

  // ── Project 17: 4ª Fase Passeio Marítimo de Caxias ───────────────────────
  insertProject.run({
    ref_code: '40667-F4PM',
    name: '4ª Fase Passeio Marítimo de Caxias',
    client: 'CML/CCDR-LVT',
    macro_region: 'EMEA',
    country: 'Portugal',
    place: 'Caxias',
    category: 'other',
    status: 'active',
    priority: 'low',
    start_date: '2023-05-01',
    currency: 'EUR',
    description: 'Projeto da 4ª fase de extensão do Passeio Marítimo de Caxias. Estruturas geotécnicas de suporte.',
    tags: 'passeio-marítimo,caxias,sg',
  })

  // ── Project 18: Barragem N'Dée ────────────────────────────────────────────
  const p18 = insertProject.run({
    ref_code: '40686-NDUE',
    name: "Barragem N'Dée",
    client: 'MINEA',
    macro_region: 'Sub-Saharan Africa',
    country: 'Angola',
    place: "Rio N'Dée",
    category: 'water',
    status: 'active',
    priority: 'high',
    start_date: '2023-07-01',
    currency: 'USD',
    description: "Projeto de execução da barragem de N'Dée em Angola. Estudos hidrológicos, geotécnicos e projeto de execução.",
    tags: 'barragem,angola,sg',
  })
  insertGeo.run({
    project_id: p18.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: "Rio N'Dée",
    depth: 30.0, soil_type: 'saibro', rock_type: 'granito gnaíssico',
    groundwater_depth: 4.0, bearing_capacity: 350, spt_n_value: 40, seismic_class: 'B',
    latitude: -10.50, longitude: 15.20, sampled_at: '2023-10-10',
    notes: "Sondagem na secção da barragem. Saibro nos primeiros 6 m, granito gnaíssico abaixo.",
  })
  insertStructure.run({
    project_id: p18.lastInsertRowid,
    label: "Barragem N'Dée", type: 'dam',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: "Rio N'Dée",
    material: 'terra / enrocamento',
    length_m: 320, height_m: 28, span_m: null,
    foundation_type: 'rocha', design_load: null,
    latitude: -10.50, longitude: 15.20, built_at: null,
    notes: 'Barragem de aterro com núcleo argiloso no Rio N\'Dée.',
  })

  // ── Project 19: Barragem Cova do Leão ────────────────────────────────────
  const p19 = insertProject.run({
    ref_code: '40697-COVL',
    name: 'Barragem Cova do Leão',
    client: 'MINEA',
    macro_region: 'Sub-Saharan Africa',
    country: 'Angola',
    place: 'Cova do Leão',
    category: 'water',
    status: 'active',
    priority: 'very_high',
    start_date: '2023-08-01',
    currency: 'USD',
    description: 'Projeto e fiscalização da barragem de Cova do Leão em Angola. Barragem de terra com descarga de fundo e descarregador de cheias.',
    tags: 'barragem,angola,sae',
  })
  insertGeo.run({
    project_id: p19.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Cova do Leão',
    depth: 20.0, soil_type: 'argila siltosa', rock_type: 'basalto',
    groundwater_depth: 6.5, bearing_capacity: 200, spt_n_value: 20, seismic_class: 'B',
    latitude: -12.30, longitude: 14.80, sampled_at: '2023-11-05',
    notes: 'Zona da fundação da barragem. Argila siltosa de baixa plasticidade. Basalto a 15 m.',
  })
  insertStructure.run({
    project_id: p19.lastInsertRowid,
    label: 'Barragem Cova do Leão', type: 'dam',
    macro_region: 'Sub-Saharan Africa', country: 'Angola', place: 'Cova do Leão',
    material: 'terra',
    length_m: 280, height_m: 22, span_m: null,
    foundation_type: 'solo compactado', design_load: null,
    latitude: -12.30, longitude: 14.80, built_at: null,
    notes: 'Barragem de terra homogénea com descarga de fundo e descarregador de cheias lateral.',
  })

  // ── Project 20: Central Hidroelétrica Mohamed V ───────────────────────────
  insertProject.run({
    ref_code: '40703-UHMV',
    name: 'Central Hidroelétrica Mohamed V — Reforço',
    client: 'ONEE',
    macro_region: 'EMEA',
    country: 'Morocco',
    place: 'Mohamed V',
    category: 'energy',
    status: 'active',
    priority: 'medium',
    start_date: '2023-09-01',
    currency: 'EUR',
    description: 'Estudo para reforço de potência da Central Hidroelétrica Mohamed V em Marrocos.',
    tags: 'hidroelétrico,marrocos,onee,sae',
  })

  // ── Project 21: LAV Lote A — Aveiro-Porto ────────────────────────────────
  const p21 = insertProject.run({
    ref_code: '40815-LAPE',
    name: 'LAV Lote A — Aveiro-Porto',
    client: 'Infraestruturas de Portugal',
    macro_region: 'EMEA',
    country: 'Portugal',
    place: 'Aveiro-Porto',
    category: 'transport',
    status: 'active',
    priority: 'critical',
    start_date: '2024-01-01',
    currency: 'EUR',
    description: 'Projeto de execução da Alta Velocidade Ferroviária Lote A entre Aveiro e Porto. Sistema de informação de tráfego e supervisão.',
    tags: 'lav,alta-velocidade,ferrovia,porto,aveiro,sit',
  })
  insertGeo.run({
    project_id: p21.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Aveiro',
    depth: 20.0, soil_type: 'areia fina siltosa', rock_type: 'granito',
    groundwater_depth: 1.5, bearing_capacity: 120, spt_n_value: 8, seismic_class: 'C',
    latitude: 40.64, longitude: -8.65, sampled_at: '2024-02-15',
    notes: 'Sondagem no corredor do traçado LAV na zona da planície de Aveiro. Solo mole.',
  })
  insertGeo.run({
    project_id: p21.lastInsertRowid,
    point_label: 'BH-12', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Porto',
    depth: 35.0, soil_type: 'granito arenítico', rock_type: 'granito',
    groundwater_depth: 8.0, bearing_capacity: 450, spt_n_value: 60, seismic_class: 'B',
    latitude: 41.05, longitude: -8.62, sampled_at: '2024-02-28',
    notes: 'Sondagem na zona de entrada em Porto. Granito são e fracturado.',
  })
  insertStructure.run({
    project_id: p21.lastInsertRowid,
    label: 'Viaduto LAV Lote A — Zona Aveiro', type: 'bridge',
    macro_region: 'EMEA', country: 'Portugal', place: 'Aveiro',
    material: 'betão pré-esforçado',
    length_m: 2200, height_m: 12, span_m: 50,
    foundation_type: 'estacas CFA', design_load: 350,
    latitude: 40.65, longitude: -8.64, built_at: null,
    notes: 'Viaduto sobre terrenos moles da planície de Aveiro. Fundação por estacas CFA.',
  })

  // ── Project 22: LAV Lote B — Coimbra-Aveiro ──────────────────────────────
  insertProject.run({
    ref_code: '40830-AVLB',
    name: 'LAV Lote B — Coimbra-Aveiro',
    client: 'Infraestruturas de Portugal',
    macro_region: 'EMEA',
    country: 'Portugal',
    place: 'Coimbra-Aveiro',
    category: 'transport',
    status: 'active',
    priority: 'high',
    start_date: '2024-03-01',
    currency: 'EUR',
    description: 'Projeto de execução da Alta Velocidade Ferroviária Lote B entre Coimbra e Aveiro.',
    tags: 'lav,alta-velocidade,ferrovia,coimbra,aveiro,sit',
  })

  // ── Project 23: Oficinas Medway Entroncamento ─────────────────────────────
  const p23 = insertProject.run({
    ref_code: '40729-MEDW',
    name: 'Oficinas Medway Entroncamento',
    client: 'Medway',
    macro_region: 'EMEA',
    country: 'Portugal',
    place: 'Entroncamento',
    category: 'transport',
    status: 'active',
    priority: 'very_high',
    start_date: '2023-11-01',
    currency: 'EUR',
    description: 'Projeto de execução das oficinas de manutenção ferroviária Medway no Entroncamento.',
    tags: 'ferrovia,oficinas,entroncamento,sit',
  })
  insertGeo.run({
    project_id: p23.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Entroncamento',
    depth: 12.0, soil_type: 'aterro ferroviário', rock_type: 'calcário',
    groundwater_depth: 4.0, bearing_capacity: 200, spt_n_value: 25, seismic_class: 'C',
    latitude: 39.46, longitude: -8.47, sampled_at: '2023-12-10',
    notes: 'Sondagem na zona das oficinas. Aterro existente sobre calcário. Fundações diretas possíveis.',
  })

  // ── Project 24: Linha Vermelha Lisboa Metro ───────────────────────────────
  const p24 = insertProject.run({
    ref_code: '40757-LVSA',
    name: 'Linha Vermelha Lisboa Metro',
    client: 'Metropolitano de Lisboa',
    macro_region: 'EMEA',
    country: 'Portugal',
    place: 'Lisboa',
    category: 'transport',
    status: 'active',
    priority: 'critical',
    start_date: '2024-02-01',
    currency: 'EUR',
    description: 'Projeto de execução e fiscalização da extensão da Linha Vermelha do Metro de Lisboa. Estruturas especiais e geotecnia.',
    tags: 'metro,linha-vermelha,lisboa,se',
  })
  insertGeo.run({
    project_id: p24.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    depth: 45.0, soil_type: 'argila', rock_type: 'calcário',
    groundwater_depth: 3.5, bearing_capacity: 160, spt_n_value: 11, seismic_class: 'D',
    latitude: 38.75, longitude: -9.10, sampled_at: '2024-03-18',
    notes: 'Sondagem no traçado do novo troço. Argilas moles nos primeiros 15 m. Calcário a partir de 28 m.',
  })
  insertStructure.run({
    project_id: p24.lastInsertRowid,
    label: 'Estação Linha Vermelha — Extensão', type: 'tunnel',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisboa',
    material: 'betão armado / NATM',
    length_m: 850, height_m: null, span_m: 10.5,
    foundation_type: null, design_load: null,
    latitude: 38.75, longitude: -9.10, built_at: null,
    notes: 'Túnel NATM para nova estação da Linha Vermelha. Contenção por jet-grouting.',
  })

  // ── Project 25: Hospital Lisboa Oriental ─────────────────────────────────
  insertProject.run({
    ref_code: '40755-HLXO',
    name: 'Hospital Lisboa Oriental',
    client: 'HLO/TPF',
    macro_region: 'EMEA',
    country: 'Portugal',
    place: 'Lisboa',
    category: 'other',
    status: 'active',
    priority: 'very_high',
    start_date: '2024-01-01',
    currency: 'EUR',
    description: 'Projeto de especialidades estruturais e geotécnicas do novo Hospital Lisboa Oriental. Inclui análise de isolamento sísmico e revisão de projeto.',
    tags: 'hospital,lisboa,estruturas,se',
  })

  // ── Project 26: PSP Ilha de Santiago ──────────────────────────────────────
  insertProject.run({
    ref_code: '40758-SPSP',
    name: 'PSP Ilha de Santiago',
    client: 'BEI/Governo de Cabo Verde',
    macro_region: 'Sub-Saharan Africa',
    country: 'Cape Verde',
    place: 'Ilha de Santiago',
    category: 'water',
    status: 'active',
    priority: 'very_high',
    start_date: '2024-01-01',
    currency: 'EUR',
    description: 'Projeto de abastecimento de água e saneamento da Ilha de Santiago, Cabo Verde. Estudos hidráulicos e documentos de concurso.',
    tags: 'água,saneamento,cabo-verde,sae',
  })

  // ── Project 27: Plano Diretor EPAL e Oeste ────────────────────────────────
  insertProject.run({
    ref_code: '40771-ABEP',
    name: 'Plano Diretor EPAL e Oeste',
    client: 'EPAL',
    macro_region: 'EMEA',
    country: 'Portugal',
    place: 'Lisboa e Oeste',
    category: 'water',
    status: 'active',
    priority: 'medium',
    start_date: '2024-03-01',
    currency: 'EUR',
    description: 'Plano diretor do sistema de abastecimento de água da EPAL e da região Oeste. Diagnóstico, modelação e planeamento estratégico.',
    tags: 'epal,plano-diretor,água,oeste,sae',
  })

  // ── Project 28: Diques de Proteção contra Cheias — Moçambique ─────────────
  const p28 = insertProject.run({
    ref_code: '40772-DIPC',
    name: 'Diques de Proteção contra Cheias — Moçambique',
    client: 'DNGRH/Banco Mundial',
    macro_region: 'Sub-Saharan Africa',
    country: 'Mozambique',
    place: 'Chókwè, Búzi, Nante',
    category: 'water',
    status: 'active',
    priority: 'critical',
    start_date: '2024-04-01',
    currency: 'USD',
    description: 'Elaboração e atualização de projetos de execução e fiscalização de diques de proteção contra cheias nas bacias do Limpopo, Búzi e Save em Moçambique. Quatro diques: Chókwè Sul, Chókwè Norte, Búzi e Nante.',
    tags: 'diques,cheias,moçambique,limpopo,buzi,sg',
  })
  insertGeo.run({
    project_id: p28.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Mozambique', place: 'Chókwè',
    depth: 15.0, soil_type: 'aluvião arenosa', rock_type: null,
    groundwater_depth: 1.5, bearing_capacity: 80, spt_n_value: 6, seismic_class: 'C',
    latitude: -24.52, longitude: 33.00, sampled_at: '2024-06-10',
    notes: 'Sondagem no leito de cheia do Limpopo. Aluvião muito solta. NF muito superficial.',
  })
  insertStructure.run({
    project_id: p28.lastInsertRowid,
    label: 'Dique Chókwè Sul', type: 'embankment',
    macro_region: 'Sub-Saharan Africa', country: 'Mozambique', place: 'Chókwè',
    material: 'terra compactada',
    length_m: 12500, height_m: 4.5, span_m: null,
    foundation_type: 'solo tratado / jet-grouting', design_load: null,
    latitude: -24.55, longitude: 33.02, built_at: null,
    notes: 'Dique de proteção contra cheias do Limpopo na margem sul de Chókwè. Inclui comportas de descarga.',
  })

  // ── Project 29: Barragem da Corumana ──────────────────────────────────────
  const p29 = insertProject.run({
    ref_code: '40773-CORU',
    name: 'Barragem da Corumana — Descarregador e Tomada de Água',
    client: 'DNGRH/Banco Mundial',
    macro_region: 'Sub-Saharan Africa',
    country: 'Mozambique',
    place: 'Corumana',
    category: 'water',
    status: 'active',
    priority: 'high',
    start_date: '2024-05-01',
    currency: 'USD',
    description: 'Projeto de execução do descarregador de cheias auxiliar e nova tomada de água da barragem da Corumana em Moçambique.',
    tags: 'barragem,corumana,moçambique,descarregador,sae',
  })
  insertGeo.run({
    project_id: p29.lastInsertRowid,
    point_label: 'BH-01', type: 'borehole',
    macro_region: 'Sub-Saharan Africa', country: 'Mozambique', place: 'Corumana',
    depth: 35.0, soil_type: 'granito arenítico', rock_type: 'granito',
    groundwater_depth: 10.0, bearing_capacity: 500, spt_n_value: 60, seismic_class: 'B',
    latitude: -25.98, longitude: 32.57, sampled_at: '2024-07-15',
    notes: 'Sondagem na ombreiras da barragem para o descarregador auxiliar. Granito são muito competente.',
  })
  insertStructure.run({
    project_id: p29.lastInsertRowid,
    label: 'Descarregador Auxiliar Corumana', type: 'dam',
    macro_region: 'Sub-Saharan Africa', country: 'Mozambique', place: 'Corumana',
    material: 'betão armado',
    length_m: 180, height_m: 35, span_m: null,
    foundation_type: 'rocha granítica', design_load: null,
    latitude: -25.98, longitude: 32.57, built_at: null,
    notes: 'Descarregador de cheias auxiliar em canal escavado em rocha com dissipador em bacia de dissipação.',
  })

  // ── Project 30: Reabilitação Grande Canal de Laaroussia ───────────────────
  insertProject.run({
    ref_code: '40785-RGCL',
    name: 'Reabilitação Grande Canal de Laaroussia',
    client: 'CRDA/KfW',
    macro_region: 'EMEA',
    country: 'Tunisia',
    place: 'Laaroussia',
    category: 'water',
    status: 'active',
    priority: 'medium',
    start_date: '2024-06-01',
    currency: 'EUR',
    description: 'Documentos de concurso, projeto de execução, fiscalização e apoio às medidas de acompanhamento para a reabilitação do Grande Canal de Laaroussia na Tunísia.',
    tags: 'canal,irrigação,tunísia,se',
  })

  // ── Project 31: Sistema Bombagem Centrais Hidroelétricas ONEE ─────────────
  insertProject.run({
    ref_code: '40797-SPCH',
    name: 'Sistema Bombagem Centrais Hidroelétricas ONEE',
    client: 'ONEE',
    macro_region: 'EMEA',
    country: 'Morocco',
    place: 'Marrocos',
    category: 'energy',
    status: 'active',
    priority: 'medium',
    start_date: '2024-07-01',
    currency: 'EUR',
    description: 'Estudo de viabilidade para introdução de sistema de bombagem em 6 centrais hidroelétricas da ONEE/BE em Marrocos.',
    tags: 'step,bombagem,hidroelétrico,marrocos,onee,sae',
  })

  // ── Project 32: Barragem do Nhene + Rede Distribuição Água Lubango ─────────
  insertProject.run({
    ref_code: '40844-LTH',
    name: 'Barragem do Nhene + Rede Distribuição Água Lubango',
    client: 'MINEA',
    macro_region: 'Sub-Saharan Africa',
    country: 'Angola',
    place: 'Lubango',
    category: 'water',
    status: 'planning',
    priority: 'high',
    start_date: '2025-10-01',
    budget: 405311,
    currency: 'USD',
    description: 'Projeto da barragem do Nhene e rede de distribuição de água de Lubango, Angola. Novo contrato adjudicado em setembro 2025. Prazo 12 meses.',
    tags: 'barragem,angola,lubango,água,lth',
  })

  // ── Project 33: Barragem N'Ompombo ────────────────────────────────────────
  insertProject.run({
    ref_code: '40845-LTH',
    name: "Barragem N'Ompombo",
    client: 'MINEA',
    macro_region: 'Sub-Saharan Africa',
    country: 'Angola',
    place: 'Angola',
    category: 'water',
    status: 'planning',
    priority: 'high',
    start_date: '2025-10-01',
    budget: 602554,
    currency: 'USD',
    description: "Projeto da barragem de N'Ompombo em Angola. Novo contrato adjudicado em setembro 2025. Prazo 12 meses.",
    tags: 'barragem,angola,sg,lth',
  })

  // ── Project 34: Aeroporto Humberto Delgado — EIA Expansão ────────────────
  insertProject.run({
    ref_code: '40846-IAHD',
    name: 'Aeroporto Humberto Delgado — EIA Expansão',
    client: 'ANA Aeroportos',
    macro_region: 'EMEA',
    country: 'Portugal',
    place: 'Lisboa',
    category: 'environment',
    status: 'planning',
    priority: 'high',
    start_date: '2025-10-01',
    budget: 270152,
    currency: 'EUR',
    description: 'Estudo de Impacte Ambiental para a expansão do Aeroporto Humberto Delgado. Novo contrato adjudicado em setembro 2025. Prazo 210 dias.',
    tags: 'aeroporto,eia,lisboa,expansão',
  })

})
