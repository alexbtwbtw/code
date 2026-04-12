import { db } from '../db'

const insert = db.prepare(`
  INSERT INTO time_entries (project_id, member_id, date, hours, description)
  VALUES (@project_id, @member_id, @date, @hours, @description)
`)

function log(project_id: number, member_id: number, date: string, hours: number, description: string) {
  insert.run({ project_id, member_id, date, hours, description })
}

// Projects referenced here are active/planning projects from seed/projects.ts.
// Member IDs match insertion order in seed/team.ts.
//
// Active projects used (a representative sample):
//   2  — EN222/A32 Serrinha (transport)
//   3  — AH Caculo Cabaça (dam/hydraulics)
//   5  — Beira Alta Corridor (rail)
//   7  — Nacala Logistics Corridor (transport)
//   8  — Sofala Rural Water Supply (hydraulics)
//  10  — Mozambique N1 Road (transport)
//  11  — Lisbon Metro Green Line Extension (transport)
//  13  — Faro Desalination Plant (hydraulics)
//  14  — Cunene River Bridge (structures)
//  17  — Porto BRT Corridor (transport)
//  19  — Tete Suspension Bridge (structures)
//  20  — Pemba Airport Expansion (transport)
//  22  — Luanda Waterfront Regeneration (urban)
//  24  — Manica Road Rehabilitation (transport)
//  26  — Beira Flood Defence (hydraulics)
//  29  — Lilongwe Urban Water (hydraulics)

export const seedTimeEntries = db.transaction(() => {
  // ── Project 2 — EN222/A32 Serrinha ──────────────────────────────────────────
  log(2, 6,  '2026-01-08', 8,   'Revisão do traçado em planta — alinhamentos e perfil longitudinal')
  log(2, 6,  '2026-01-15', 6,   'Coordenação com equipa de expropriações')
  log(2, 6,  '2026-02-03', 7.5, 'Elaboração do projeto de sinalização — sinalização vertical')
  log(2, 13, '2026-01-09', 6,   'Levantamento topográfico de campo — troço km 4+200 a km 7+800')
  log(2, 13, '2026-01-22', 5,   'Modelação de tráfego e análise de capacidade')
  log(2, 29, '2026-02-10', 4,   'Análise de pavimento e definição de estrutura de reforço')
  log(2, 2,  '2026-01-12', 6,   'Verificação estrutural do viaduto da EN222 — estado limite último')
  log(2, 2,  '2026-02-18', 5,   'Revisão de armaduras e emissão de peças desenhadas')

  // ── Project 3 — AH Caculo Cabaça ────────────────────────────────────────────
  log(3, 3,  '2026-01-05', 8,   'Relatório mensal de avanço — hidrologia operacional')
  log(3, 3,  '2026-01-19', 7,   'Análise de caudais de cheia — revisão dos cenários de projeto')
  log(3, 3,  '2026-02-02', 8,   'Inspeção ao descarregador de cheias — visita de obra')
  log(3, 8,  '2026-01-06', 6,   'Modelação hidráulica do reservatório — curva de volumes')
  log(3, 8,  '2026-01-26', 7.5, 'Revisão do projeto de tomada de água')
  log(3, 1,  '2026-01-14', 8,   'Controlo de qualidade de fundações — ensaios de permeabilidade')
  log(3, 1,  '2026-02-04', 6,   'Análise de estabilidade da barragem — método de Bishop')
  log(3, 7,  '2026-01-20', 5,   'Prospeção complementar — 3 sondagens na zona do descarregador')
  log(3, 7,  '2026-02-11', 4,   'Interpretação de ensaios SPT — pilar P3')

  // ── Project 5 — Beira Alta Corridor ─────────────────────────────────────────
  log(5, 23, '2026-01-07', 8,   'Projeto de via — geometria e superestrutura ferroviária')
  log(5, 23, '2026-01-21', 7,   'Coordenação com gestor de infraestrutura — reunião técnica')
  log(5, 23, '2026-02-05', 8,   'Verificação de curvas de transição e diagrama de velocidades')
  log(5, 2,  '2026-01-08', 6,   'Dimensionamento de passagens superiores e inferiores')
  log(5, 2,  '2026-02-12', 5.5, 'Revisão estrutural do viaduto de Coja')
  log(5, 1,  '2026-01-23', 7,   'Reconhecimento geotécnico — túnel de Mangualde')
  log(5, 16, '2026-02-06', 6,   'Compilação dos relatórios de sondagens — troço norte')

  // ── Project 7 — Nacala Logistics Corridor ────────────────────────────────────
  log(7, 6,  '2026-01-09', 7.5, 'Análise de tráfego pesado e capacidade da via')
  log(7, 29, '2026-01-16', 6,   'Inspeção de pavimento — levantamento de degradações km 80–120')
  log(7, 29, '2026-02-03', 7,   'Elaboração do programa de reabilitação de pavimentos')
  log(7, 4,  '2026-01-13', 5,   'Atualização do plano de gestão ambiental e social')
  log(7, 4,  '2026-02-17', 6,   'Consulta pública — Nacala Porto')

  // ── Project 8 — Sofala Rural Water Supply ───────────────────────────────────
  log(8, 14, '2026-01-05', 8,   'Dimensionamento de furos de captação — zona de Buzi')
  log(8, 14, '2026-01-19', 7,   'Projeto de sistemas de bombagem solar')
  log(8, 17, '2026-01-12', 6,   'Modelação de redes de distribuição — EPANET')
  log(8, 17, '2026-02-09', 5.5, 'Relatório de ensaios de bombagem — 6 furos')
  log(8, 5,  '2026-01-20', 4,   'Avaliação de impacte ambiental — recursos hídricos subterrâneos')
  log(8, 22, '2026-02-04', 6,   'Projeto de saneamento rural — fossas sépticas melhoradas')

  // ── Project 10 — Mozambique N1 Road ─────────────────────────────────────────
  log(10, 6,  '2026-01-06', 7,   'Revisão de traçado — variante urbana de Maxixe')
  log(10, 29, '2026-01-27', 8,   'Levantamento de degradações de pavimento — N1 km 350–420')
  log(10, 4,  '2026-01-14', 5,   'Avaliação ambiental das variantes propostas')
  log(10, 20, '2026-02-02', 6,   'Coordenação de equipa e controlo de cronograma')
  log(10, 20, '2026-02-16', 4,   'Reunião de seguimento com cliente — Maputo')

  // ── Project 11 — Lisbon Metro Green Line Extension ──────────────────────────
  log(11, 1,  '2026-01-05', 8,   'Caracterização geotécnica do corredor — solos terciários de Lisboa')
  log(11, 1,  '2026-01-26', 7,   'Análise de assentamentos em construções adjacentes — Alameda')
  log(11, 10, '2026-01-12', 8,   'Prospeção geotécnica — 8 sondagens entre Campo Pequeno e Odivelas')
  log(11, 10, '2026-02-09', 6,   'Ensaios de permeabilidade Lugeon — zona de falhamento')
  log(11, 2,  '2026-01-07', 7.5, 'Dimensionamento de estruturas de suporte — Estação do Rato')
  log(11, 11, '2026-01-21', 6,   'Verificação de contenção periférica — método de Rankine')
  log(11, 23, '2026-02-10', 5,   'Coordenação com Metropolitano de Lisboa — reunião técnica')

  // ── Project 13 — Faro Desalination Plant ────────────────────────────────────
  log(13, 3,  '2026-01-08', 6,   'Modelação hidráulica da captação oceânica')
  log(13, 28, '2026-01-15', 7,   'Estudo de impacte da salmoura no meio marinho')
  log(13, 28, '2026-02-06', 5.5, 'Análise de caudais e pressões na rede de distribuição')
  log(13, 17, '2026-01-22', 6,   'Dimensionamento hidráulico das condutas de permeado')
  log(13, 5,  '2026-02-03', 4,   'Avaliação de impacte ambiental — componente marinha')

  // ── Project 14 — Cunene River Bridge ────────────────────────────────────────
  log(14, 27, '2026-01-06', 8,   'Projeto de estrutura — tabuleiro de betão pré-esforçado')
  log(14, 27, '2026-01-20', 7,   'Dimensionamento dos pilares e fundações profundas')
  log(14, 2,  '2026-01-13', 7.5, 'Verificação sísmica da ponte — espectro de resposta')
  log(14, 11, '2026-02-04', 6,   'Projeto de aparelhos de apoio e juntas de dilatação')
  log(14, 1,  '2026-01-27', 8,   'Prospeção geotécnica no leito do rio Cunene — 4 sondagens')
  log(14, 7,  '2026-02-11', 5,   'Ensaios de carga em estacas — interpretação de resultados')

  // ── Project 17 — Porto BRT Corridor ─────────────────────────────────────────
  log(17, 6,  '2026-01-07', 7,   'Planeamento operacional do BRT — frequências e capacidade')
  log(17, 13, '2026-01-14', 6,   'Modelação de procura de transportes — corredor da Boavista')
  log(17, 13, '2026-02-05', 5,   'Análise de intermodalidade — interface com Metro do Porto')
  log(17, 15, '2026-01-21', 4,   'Projeto de infraestruturas de abastecimento nos terminais')
  log(17, 20, '2026-02-12', 5,   'Gestão de interfaces com concessionárias — reuniões semanais')

  // ── Project 19 — Tete Suspension Bridge ─────────────────────────────────────
  log(19, 27, '2026-01-05', 8,   'Projeto do tabuleiro suspenso — análise não-linear')
  log(19, 27, '2026-01-19', 8,   'Dimensionamento dos cabos principais e pendurais')
  log(19, 27, '2026-02-02', 7,   'Verificação de fadiga — ciclos de tráfego pesado')
  log(19, 2,  '2026-01-12', 6,   'Projeto das torres de betão — estado limite de serviço')
  log(19, 21, '2026-01-26', 7.5, 'Projeto das ancoragens metálicas dos cabos')
  log(19, 1,  '2026-02-03', 8,   'Reconhecimento geotécnico — fundações das torres no rio Zambeze')
  log(19, 10, '2026-02-17', 6,   'Ensaios de pressiómetro — maciço rochoso da margem esquerda')

  // ── Project 22 — Luanda Waterfront Regeneration ─────────────────────────────
  log(22, 15, '2026-01-08', 5,   'Projeto de redes de abastecimento de água — frente marítima')
  log(22, 22, '2026-01-15', 6,   'Dimensionamento de colectores de águas residuais')
  log(22, 4,  '2026-01-22', 6,   'Plano de gestão ambiental — interface terra-mar')
  log(22, 15, '2026-02-05', 4.5, 'Coordenação com EPAL Luanda — ligações à rede existente')
  log(22, 12, '2026-02-12', 5,   'Monitorização da qualidade da água — pontos de amostragem')

  // ── Project 24 — Manica Road Rehabilitation ─────────────────────────────────
  log(24, 29, '2026-01-09', 7,   'Levantamento de degradações — amostragem aleatória estratificada')
  log(24, 6,  '2026-01-23', 6,   'Análise de tráfego e definição de eixo de carga equivalente')
  log(24, 4,  '2026-02-06', 5,   'Triagem ambiental — critérios do Banco Africano de Desenvolvimento')
  log(24, 20, '2026-01-30', 4,   'Relatório de progresso Q1 2026 — cliente AfDB')

  // ── Project 26 — Beira Flood Defence ────────────────────────────────────────
  log(26, 3,  '2026-01-06', 8,   'Modelação hidráulica 2D — inundação urbana com TR 100 anos')
  log(26, 3,  '2026-01-20', 7.5, 'Calibração do modelo HEC-RAS — evento Idai 2019')
  log(26, 28, '2026-02-03', 7,   'Análise de frequência de cheias — estação de Buzi')
  log(26, 8,  '2026-01-13', 6,   'Projeto hidráulico dos diques — perfis e cotas de coroamento')
  log(26, 12, '2026-01-27', 5,   'Avaliação de impacte ambiental — ecossistemas ripícolas')
  log(26, 1,  '2026-02-10', 6,   'Reconhecimento geotécnico dos diques existentes — avaliação de estabilidade')

  // ── Project 29 — Lilongwe Urban Water ───────────────────────────────────────
  log(29, 14, '2026-01-05', 7,   'Modelação da rede de distribuição — EPANET — zonas Norte e Sul')
  log(29, 17, '2026-01-12', 6,   'Projeto hidráulico das condutas adutoras')
  log(29, 22, '2026-01-19', 5,   'Projeto de estação de tratamento — processo de coagulação-floculação')
  log(29, 28, '2026-02-02', 6,   'Avaliação de recursos hídricos subterrâneos — Kamuzu Reservoir')
  log(29, 5,  '2026-02-09', 4,   'Avaliação ambiental — captação no lago Malawi')
  log(29, 20, '2026-01-26', 5,   'Reunião de coordenação com Lilongwe Water Board')
})
