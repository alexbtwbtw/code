import { db } from '../db'
import { insertTask, insertTaskAssignment, insertTaskComment } from '../db/statements/tasks'

export const seedTasks = db.transaction(() => {
  // Helper to look up member id by name — returns null if not found
  function mid(name: string): number | null {
    const row = db.prepare(`SELECT id FROM team_members WHERE name = ?`).get(name) as { id: number } | undefined
    return row?.id ?? null
  }

  // Only assign when the member actually exists (avoids FK violations)
  function assign(taskId: bigint | number, memberName: string) {
    const memberId = mid(memberName)
    if (memberId !== null) {
      insertTaskAssignment.run({ task_id: taskId, team_member_id: memberId })
    }
  }

  // ── Project 1 — 4ème Rocade d'Alger (id=1) ───────────────────────────────

  insertTask.run({
    project_id: 1,
    title: "Arquivo e encerramento final do dossier",
    description: "Organizar e arquivar toda a documentação técnica do projeto. Garantir transferência dos relatórios finais para a entidade Algerian gov.",
    status: 'done',
    priority: 'low',
    state_summary: 'Dossier arquivado. Documentação final entregue ao cliente.',
    due_date: '2015-06-30',
  })

  insertTask.run({
    project_id: 1,
    title: "Formação de equipas locais — reprogramação",
    description: "Retomar a componente de formação das equipas locais de manutenção rodoviária que ficou por concluir após o fim dos estudos.",
    status: 'blocked',
    priority: 'low',
    state_summary: 'Aguarda decisão do cliente sobre financiamento da componente de formação.',
    due_date: null,
  })

  // ── Project 2 — EN222/A32 Serrinha (id=2) ────────────────────────────────

  insertTask.run({
    project_id: 2,
    title: "Revisão do projeto de execução — traçado em planta",
    description: "Rever o traçado em planta da ligação EN222/A32, validar os alinhamentos e verificar compatibilidade com expropriações.",
    status: 'in_progress',
    priority: 'medium',
    state_summary: 'Revisão de planta a 80%. Aguardam confirmação das parcelas de expropriação.',
    due_date: '2026-06-30',
  })

  insertTask.run({
    project_id: 2,
    title: "Elaboração do projeto de sinalização",
    description: "Elaborar o projeto de sinalização vertical e horizontal para a nova ligação. Coordenar com a equipa de segurança rodoviária.",
    status: 'todo',
    priority: 'medium',
    state_summary: '',
    due_date: '2026-09-30',
  })

  // ── Project 3 — AH Caculo Cabaça (id=3) ─────────────────────────────────

  insertTask.run({
    project_id: 3,
    title: "Supervisão mensal de construção — relatório de avanço",
    description: "Elaborar relatório mensal de avanço físico e financeiro da construção do AH Caculo Cabaça. Incluir fotografia e registo de não-conformidades.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Relatório de agosto submetido. Avanço físico em 62%. Deteção de problema de betonagem no pilar P3.',
    due_date: '2026-05-10',
  })

  insertTask.run({
    project_id: 3,
    title: "Revisão das especificações técnicas dos equipamentos eletromecânicos",
    description: "Rever as especificações técnicas dos grupos geradores e equipamentos hidromecânicos. Verificar conformidade com as normas IEC e os requisitos do dono de obra GAMEK.",
    status: 'review',
    priority: 'high',
    state_summary: 'Especificações revistas. Em aprovação pelo dono de obra.',
    due_date: '2026-05-20',
  })

  insertTask.run({
    project_id: 3,
    title: "Acompanhamento dos ensaios de betonagem da barragem",
    description: "Acompanhar e validar os ensaios de receção do betão da barragem. Verificar conformidade com traços aprovados e resistências mínimas.",
    status: 'in_progress',
    priority: 'medium',
    state_summary: 'Ensaios em curso. Resistência mínima atingida em 96% das amostras.',
    due_date: null,
  })

  // ── Project 4 — Barragem de Rarai (id=4) ─────────────────────────────────

  insertTask.run({
    project_id: 4,
    title: "Estudos hidrológicos — curvas IDF e caudais de cheia",
    description: "Atualizar os estudos hidrológicos da bacia de Rarai. Calcular curvas IDF com dados de pluviometria recente e determinar caudal de cheia para período de retorno de 10 000 anos.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Dados pluviométricos recolhidos. Análise estatística em curso.',
    due_date: '2026-06-15',
  })

  insertTask.run({
    project_id: 4,
    title: "Dimensionamento do descarregador de cheias",
    description: "Dimensionar o descarregador de cheias da barragem de Rarai. Modelação hidráulica com HEC-RAS para verificar capacidade de escoamento.",
    status: 'todo',
    priority: 'high',
    state_summary: '',
    due_date: '2026-08-30',
  })

  insertTask.run({
    project_id: 4,
    title: "Coordenação com parceiros do consórcio SCET/AHT",
    description: "Garantir a coordenação técnica entre os parceiros do consórcio COBA/SCET/AHT. Reuniões de acompanhamento e partilha de documentação.",
    status: 'in_progress',
    priority: 'medium',
    state_summary: 'Reunião mensal realizada a 15 de abril. Próxima reunião a 15 de maio.',
    due_date: null,
  })

  // ── Project 5 — IP3 Souselas-Viseu (id=5) ────────────────────────────────

  insertTask.run({
    project_id: 5,
    title: "Levantamento de condicionantes ao longo do corredor IP3",
    description: "Identificar e caracterizar as condicionantes ambientais, arqueológicas e fundiárias ao longo do corredor de requalificação do IP3.",
    status: 'done',
    priority: 'medium',
    state_summary: 'Levantamento concluído. Relatório de condicionantes aprovado.',
    due_date: '2025-12-31',
  })

  insertTask.run({
    project_id: 5,
    title: "Projeto de execução de obras de arte",
    description: "Elaborar o projeto de execução das obras de arte (passagens superiores, inferiores e viadutos) ao longo do IP3 Souselas-Viseu.",
    status: 'in_progress',
    priority: 'medium',
    state_summary: 'Projeto de 4 obras de arte concluído. 3 obras de arte por iniciar.',
    due_date: '2026-07-31',
  })

  // ── Project 6 — AH Saltinho (id=6) ──────────────────────────────────────

  insertTask.run({
    project_id: 6,
    title: "Fiscalização da escavação da fundação da barragem",
    description: "Acompanhar e validar a escavação da fundação da barragem de Saltinho. Verificar a qualidade do substrato rochoso e conformidade com o projeto.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Escavação a 70%. Substrato xistoso conforme o esperado. Nota de alteração emitida para cotas de fundação na margem esquerda.',
    due_date: '2026-06-30',
  })

  insertTask.run({
    project_id: 6,
    title: "Revisão do projeto dos grupos geradores",
    description: "Rever o projeto de instalação dos grupos geradores da central de Saltinho. Verificar espaçamento, fundações e acessos de manutenção.",
    status: 'todo',
    priority: 'medium',
    state_summary: '',
    due_date: '2026-08-31',
  })

  insertTask.run({
    project_id: 6,
    title: "Relatório de avanço trimestral ao MINEA",
    description: "Elaborar o relatório trimestral de avanço para o Ministério de Energia da Guiné-Bissau. Incluir indicadores físicos, financeiros e riscos.",
    status: 'review',
    priority: 'medium',
    state_summary: 'Relatório do 1.º trimestre 2026 concluído. Em aprovação interna.',
    due_date: '2026-04-30',
  })

  // ── Project 7 — EIA Saltinho (id=7) ──────────────────────────────────────

  insertTask.run({
    project_id: 7,
    title: "Relatório de impacte sobre a ictiofauna do Rio Corubal",
    description: "Elaborar o capítulo de impacte ambiental sobre a ictiofauna endémica do Rio Corubal. Consultar especialistas em biodiversidade aquática.",
    status: 'in_progress',
    priority: 'medium',
    state_summary: 'Dados de campo recolhidos. Análise de espécies endémicas em curso.',
    due_date: '2026-07-31',
  })

  insertTask.run({
    project_id: 7,
    title: "Consulta pública e participação das comunidades locais",
    description: "Organizar e documentar o processo de consulta pública e participação das comunidades locais afetadas pelo projeto de Saltinho.",
    status: 'todo',
    priority: 'medium',
    state_summary: '',
    due_date: '2026-09-30',
  })

  // ── Project 8 — STEP ONEE — Estudo de Viabilidade (id=8) ─────────────────

  insertTask.run({
    project_id: 8,
    title: "Inventário de locais candidatos a STEP em Marrocos",
    description: "Identificar e caracterizar os locais candidatos para centrais STEP em Marrocos. Análise de topografia, geologia e ligação à rede elétrica.",
    status: 'done',
    priority: 'medium',
    state_summary: 'Inventário de 8 locais candidatos concluído e aprovado pela ONEE.',
    due_date: '2025-12-31',
  })

  insertTask.run({
    project_id: 8,
    title: "Análise custo-benefício dos locais selecionados",
    description: "Elaborar análise custo-benefício para os 3 locais prioritários selecionados pela ONEE. Incluir análise de sensibilidade de preços de energia.",
    status: 'in_progress',
    priority: 'medium',
    state_summary: 'Análise dos locais A e B concluída. Local C em preparação.',
    due_date: '2026-06-30',
  })

  // ── Project 9 — Metro Lisboa Lote 2 (id=9) ───────────────────────────────

  insertTask.run({
    project_id: 9,
    title: "Revisão do projeto de revestimento do túnel",
    description: "Rever o projeto de revestimento do túnel escavado por TBM. Verificar armadura, espessura de betão e sistemas de impermeabilização.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Revisão em curso. Identificada necessidade de reforço de armadura nas zonas de interface com as estações.',
    due_date: '2026-05-31',
  })

  insertTask.run({
    project_id: 9,
    title: "Acompanhamento da escavação da estação subterrânea",
    description: "Fiscalizar a escavação e contenção da estação subterrânea. Monitorizar deslocamentos e convergências. Verificar conformidade com o plano de instrumentação.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Escavação a 45%. Deslocamentos dentro dos limites de alerta. Leitura semanal dos inclinómetros em dia.',
    due_date: null,
  })

  insertTask.run({
    project_id: 9,
    title: "Projeto de via férrea e instalações fixas",
    description: "Elaborar o projeto de via férrea em laje de betão e instalações fixas (catenária, sinalização, telecomunicações) para o Lote 2.",
    status: 'todo',
    priority: 'medium',
    state_summary: '',
    due_date: '2026-10-31',
  })

  // ── Project 10 — STEP El Menzel (id=10) ──────────────────────────────────

  insertTask.run({
    project_id: 10,
    title: "Projeto de execução da caverna da central",
    description: "Elaborar o projeto de execução da caverna subterrânea da central STEP El Menzel. Inclui dimensionamento do suporte, betão projetado e ancoragens.",
    status: 'in_progress',
    priority: 'very_high',
    state_summary: 'Projeto da secção transversal concluído. Dimensionamento das ancoragens em revisão.',
    due_date: '2026-06-30',
  })

  insertTask.run({
    project_id: 10,
    title: "Estudos geomecânicos do maciço rochoso",
    description: "Realizar e interpretar os estudos geomecânicos do maciço rochoso para suporte ao projeto da caverna. Classificação RMR e Q-system.",
    status: 'done',
    priority: 'high',
    state_summary: 'Classificação RMR concluída. Maciço classificado como Classe II (RMR 68-75). Relatório aprovado.',
    due_date: '2026-03-31',
  })

  insertTask.run({
    project_id: 10,
    title: "Coordenação com o fornecedor dos grupos reversíveis",
    description: "Coordenar com o fornecedor dos grupos reversíveis as interfaces mecânicas, elétricas e civis da central de El Menzel.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Reunião de kickoff realizada. Pendente receção dos desenhos de interface do fabricante.',
    due_date: '2026-07-15',
  })

  // ── Project 11 — Dessalinização Algarve (id=11) ──────────────────────────

  insertTask.run({
    project_id: 11,
    title: "Projeto de execução da captação de água do mar",
    description: "Elaborar o projeto de execução da captação submarina de água do mar para a estação de dessalinização. Incluir difusores de concentrado.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Modelação hidráulica da captação concluída. Projeto de execução em preparação.',
    due_date: '2026-07-31',
  })

  insertTask.run({
    project_id: 11,
    title: "Revisão do projeto estrutural dos depósitos de água dessalinizada",
    description: "Rever o projeto estrutural dos depósitos de armazenamento de água tratada. Verificar impermeabilização e resistência à pressão hidrostática.",
    status: 'todo',
    priority: 'medium',
    state_summary: '',
    due_date: '2026-09-30',
  })

  // ── Project 12 — Linha Norte Alverca-Castanheira do Ribatejo (id=12) ──────

  insertTask.run({
    project_id: 12,
    title: "Projeto do sistema de informação de tráfego ferroviário (SIT)",
    description: "Elaborar o projeto do Sistema de Informação de Tráfego para o troço Alverca-Castanheira. Inclui painéis de informação dinâmica e integração SCADA.",
    status: 'in_progress',
    priority: 'very_high',
    state_summary: 'Arquitetura do sistema definida. Projeto de execução dos quadros elétricos em curso.',
    due_date: '2026-08-31',
  })

  insertTask.run({
    project_id: 12,
    title: "Revisão do projeto de via e drenagem",
    description: "Rever o projeto de via e sistemas de drenagem superficial ao longo do troço Alverca-Castanheira. Verificar compatibilidade com interfaces existentes.",
    status: 'review',
    priority: 'high',
    state_summary: 'Projeto de via revisto. Comentários submetidos à IP. Aguardar resposta.',
    due_date: '2026-05-15',
  })

  // ── Project 13 — Barragem Calucuve (id=13) ───────────────────────────────

  insertTask.run({
    project_id: 13,
    title: "Campanha de prospeção geotécnica",
    description: "Planear e executar a campanha de prospeção geotécnica para a barragem de Calucuve. Inclui sondagens mecânicas, CPTs e ensaios laboratoriais.",
    status: 'in_progress',
    priority: 'high',
    state_summary: '6 de 10 sondagens executadas. Aguardar resultados laboratoriais para continuar o projeto.',
    due_date: '2026-06-30',
  })

  insertTask.run({
    project_id: 13,
    title: "Dimensionamento hidráulico da descarga de fundo",
    description: "Dimensionar a descarga de fundo e a galeria de desvio do rio para a fase de construção da barragem de Calucuve.",
    status: 'todo',
    priority: 'medium',
    state_summary: '',
    due_date: '2026-09-30',
  })

  // ── Project 14 — Fábrica Baterias CALB Sines — EIA (id=14) ───────────────

  insertTask.run({
    project_id: 14,
    title: "Estudo de impacte sobre qualidade do ar",
    description: "Elaborar o capítulo do EIA sobre impactes na qualidade do ar durante as fases de construção e operação da gigafactory de baterias.",
    status: 'in_progress',
    priority: 'medium',
    state_summary: 'Modelação de dispersão de poluentes em curso com dados meteorológicos do IPMA.',
    due_date: '2026-06-30',
  })

  insertTask.run({
    project_id: 14,
    title: "Estudo de tráfego e acessibilidades",
    description: "Elaborar o estudo de tráfego para a fase de operação da fábrica. Analisar capacidade das vias de acesso e propor medidas de mitigação.",
    status: 'todo',
    priority: 'medium',
    state_summary: '',
    due_date: '2026-07-31',
  })

  insertTask.run({
    project_id: 14,
    title: "Consulta às entidades da REN e PDM Sines",
    description: "Solicitar e acompanhar as consultas às entidades (REN, APA, PDM Sines) para o processo de EIA da fábrica CALB.",
    status: 'done',
    priority: 'medium',
    state_summary: 'Consultas submetidas. Respostas recebidas de 4 das 6 entidades consultadas.',
    due_date: '2026-04-15',
  })

  // ── Project 15 — ETA de Bita (id=15) ─────────────────────────────────────

  insertTask.run({
    project_id: 15,
    title: "Fiscalização da construção dos decantadores laminares",
    description: "Fiscalizar a execução dos decantadores laminares da ETA de Bita. Verificar cofragens, armaduras e betonagem dos tanques de tratamento.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Decantadores 1 a 4 betonados. Decantadores 5 a 8 em curso. Qualidade do betão conforme.',
    due_date: '2026-07-31',
  })

  insertTask.run({
    project_id: 15,
    title: "Revisão do projeto de implantação dos filtros rápidos",
    description: "Rever o projeto de execução dos filtros rápidos de areia e antracite. Verificar caudais de filtração e sistemas de retrolavagem.",
    status: 'review',
    priority: 'high',
    state_summary: 'Revisão do dimensionamento dos filtros concluída. Aguardar aprovação do MINEA.',
    due_date: '2026-05-31',
  })

  insertTask.run({
    project_id: 15,
    title: "Elaboração do plano de comissionamento da ETA",
    description: "Elaborar o plano detalhado de comissionamento e arranque da ETA de Bita com capacidade de 260 000 m³/dia. Definir sequência de testes e aceitação.",
    status: 'todo',
    priority: 'medium',
    state_summary: '',
    due_date: '2027-01-31',
  })

  // ── Project 16 — Infraestruturas Bairro Encarnação (id=16) ───────────────

  insertTask.run({
    project_id: 16,
    title: "Projeto de redes de infraestruturas urbanas",
    description: "Elaborar o projeto de redes de abastecimento de água, saneamento, gás e telecomunicações para o Bairro da Encarnação.",
    status: 'in_progress',
    priority: 'low',
    state_summary: 'Redes de abastecimento de água e saneamento concluídas. Gás e telecom em curso.',
    due_date: '2026-08-31',
  })

  insertTask.run({
    project_id: 16,
    title: "Coordenação com a CML para aprovação do projeto",
    description: "Submeter e acompanhar o processo de aprovação do projeto de infraestruturas junto da CML.",
    status: 'todo',
    priority: 'low',
    state_summary: '',
    due_date: '2026-10-31',
  })

  // ── Project 17 — 4ª Fase Passeio Marítimo de Caxias (id=17) ─────────────

  insertTask.run({
    project_id: 17,
    title: "Projeto das estruturas de contenção e suporte",
    description: "Elaborar o projeto das estruturas geotécnicas de suporte para a extensão do Passeio Marítimo de Caxias. Verificar estabilidade da frente marítima.",
    status: 'in_progress',
    priority: 'low',
    state_summary: 'Análise de estabilidade concluída. Projeto de muros de suporte em preparação.',
    due_date: '2026-07-31',
  })

  insertTask.run({
    project_id: 17,
    title: "Estudo de agitação marítima e perfil de praia",
    description: "Realizar o estudo de agitação marítima para avaliar o impacte da extensão do passeio na dinâmica costeira local.",
    status: 'done',
    priority: 'low',
    state_summary: 'Estudo concluído. Sem impactes adversos esperados na dinâmica sedimentar.',
    due_date: '2026-03-31',
  })

  // ── Project 18 — Barragem N'Dée (id=18) ──────────────────────────────────

  insertTask.run({
    project_id: 18,
    title: "Estudos hidrológicos da bacia do Rio N'Dée",
    description: "Realizar os estudos hidrológicos da bacia do Rio N'Dée. Calcular caudais de dimensionamento do descarregador de cheias para TR 10 000 anos.",
    status: 'done',
    priority: 'high',
    state_summary: 'Estudos hidrológicos concluídos e aprovados pelo cliente MINEA.',
    due_date: '2025-12-31',
  })

  insertTask.run({
    project_id: 18,
    title: "Projeto de execução do corpo da barragem",
    description: "Elaborar o projeto de execução do corpo da barragem de aterro, incluindo núcleo argiloso, filtros e enrocamento. Verificar estabilidade de taludes.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Análise de estabilidade de taludes concluída. Projeto do núcleo argiloso em revisão.',
    due_date: '2026-08-31',
  })

  insertTask.run({
    project_id: 18,
    title: "Projeto de desvio do rio e ensecadeiras",
    description: "Elaborar o projeto das ensecadeiras e da galeria de desvio do rio durante a fase de construção da barragem de N'Dée.",
    status: 'todo',
    priority: 'medium',
    state_summary: '',
    due_date: '2026-09-30',
  })

  // ── Project 19 — Barragem Cova do Leão (id=19) ───────────────────────────

  insertTask.run({
    project_id: 19,
    title: "Fiscalização da construção da barragem de terra",
    description: "Fiscalizar a construção do corpo da barragem de terra. Verificar compactação, teor em água e conformidade com o projeto.",
    status: 'in_progress',
    priority: 'very_high',
    state_summary: 'Aterro do corpo da barragem a 35%. Resultados de compactação conformes. Núcleo argiloso em execução.',
    due_date: '2027-06-30',
  })

  insertTask.run({
    project_id: 19,
    title: "Projeto de execução do descarregador de cheias lateral",
    description: "Elaborar o projeto de execução do descarregador de cheias lateral em canal escavado em rocha com dissipador de energia.",
    status: 'review',
    priority: 'high',
    state_summary: 'Projeto de execução concluído. Em revisão pelo dono de obra MINEA.',
    due_date: '2026-05-31',
  })

  insertTask.run({
    project_id: 19,
    title: "Instrumentação e monitorização durante a construção",
    description: "Instalar e acompanhar a instrumentação geotécnica da barragem durante a construção: piezómetros, células de pressão e marcos de assentamento.",
    status: 'in_progress',
    priority: 'high',
    state_summary: '12 piezómetros instalados. Leituras semanais em dia. Sistema de alerta operacional.',
    due_date: null,
  })

  // ── Project 20 — Central Hidroelétrica Mohamed V — Reforço (id=20) ────────

  insertTask.run({
    project_id: 20,
    title: "Levantamento das condições da central existente",
    description: "Realizar o levantamento das condições técnicas e estado de conservação da central hidroelétrica existente de Mohamed V.",
    status: 'done',
    priority: 'medium',
    state_summary: 'Levantamento concluído. Relatório de estado entregue à ONEE.',
    due_date: '2025-12-31',
  })

  insertTask.run({
    project_id: 20,
    title: "Estudo de viabilidade para novos grupos geradores",
    description: "Elaborar o estudo de viabilidade técnica e económica para a instalação de novos grupos geradores de maior potência na central Mohamed V.",
    status: 'in_progress',
    priority: 'medium',
    state_summary: 'Análise técnica concluída. Estudo económico em curso.',
    due_date: '2026-07-31',
  })

  // ── Project 21 — LAV Lote A — Aveiro-Porto (id=21) ───────────────────────

  insertTask.run({
    project_id: 21,
    title: "Projeto de execução dos viadutos em zona de terrenos moles",
    description: "Elaborar o projeto de execução dos viadutos da LAV Lote A sobre os terrenos moles da planície de Aveiro. Inclui projeto de fundações por estacas CFA.",
    status: 'in_progress',
    priority: 'critical',
    state_summary: 'Projeto do viaduto V1 e V2 concluído. V3 a V6 em curso. Fundações por estacas CFA de 600 mm.',
    due_date: '2026-08-31',
  })

  insertTask.run({
    project_id: 21,
    title: "Projeto do sistema de sinalização e telecomunicações ERTMS",
    description: "Elaborar o projeto do sistema de sinalização ERTMS/ETCS Nível 2 e telecomunicações GSM-R para o Lote A da LAV.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Arquitetura do sistema aprovada. Projeto de execução do subsistema de controlo em curso.',
    due_date: '2026-10-31',
  })

  insertTask.run({
    project_id: 21,
    title: "Revisão do traçado ferroviário — curvas de transição",
    description: "Rever o traçado ferroviário do Lote A, verificando as curvas de transição e perfis de velocidade para velocidades até 300 km/h.",
    status: 'review',
    priority: 'high',
    state_summary: 'Revisão do traçado concluída. Comentários submetidos à IP. Aguardar aprovação.',
    due_date: '2026-05-31',
  })

  // ── Project 22 — LAV Lote B — Coimbra-Aveiro (id=22) ─────────────────────

  insertTask.run({
    project_id: 22,
    title: "Levantamento e caracterização geotécnica do corredor LAV Lote B",
    description: "Planear e executar a campanha de prospeção geotécnica para o corredor LAV entre Coimbra e Aveiro. Sondagens e ensaios geofísicos.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Fase 1 de prospeção concluída (20 sondagens). Fase 2 em programação.',
    due_date: '2026-09-30',
  })

  insertTask.run({
    project_id: 22,
    title: "Projeto das obras de arte correntes — passagens hidráulicas",
    description: "Elaborar o projeto das passagens hidráulicas e obras de arte correntes no Lote B da LAV. Dimensionamento para eventos de cheia.",
    status: 'todo',
    priority: 'medium',
    state_summary: '',
    due_date: '2026-12-31',
  })

  // ── Project 23 — Oficinas Medway Entroncamento (id=23) ───────────────────

  insertTask.run({
    project_id: 23,
    title: "Projeto estrutural dos edifícios das oficinas",
    description: "Elaborar o projeto de estruturas dos edifícios das oficinas de manutenção ferroviária Medway. Inclui pontes-rolantes e fundações especiais.",
    status: 'in_progress',
    priority: 'very_high',
    state_summary: 'Projeto de fundações aprovado. Estrutura dos edifícios principais em curso.',
    due_date: '2026-07-31',
  })

  insertTask.run({
    project_id: 23,
    title: "Projeto de via e plataformas de manutenção",
    description: "Elaborar o projeto de via férrea e plataformas de manutenção das oficinas Medway. Verificar interfaces com a rede da Infraestruturas de Portugal.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Projeto de via concluído para 60% da área. Coordenação com IP em curso.',
    due_date: '2026-08-31',
  })

  insertTask.run({
    project_id: 23,
    title: "Licenciamento junto da ANSR e REFER/IP",
    description: "Acompanhar o processo de licenciamento das oficinas Medway junto das entidades reguladoras ferroviárias.",
    status: 'blocked',
    priority: 'high',
    state_summary: 'Pedido de informação prévia submetido à IP. Aguarda despacho há 3 meses.',
    due_date: null,
  })

  // ── Project 24 — Linha Vermelha Lisboa Metro (id=24) ─────────────────────

  insertTask.run({
    project_id: 24,
    title: "Projeto geotécnico das estações subterrâneas",
    description: "Elaborar o projeto geotécnico das novas estações da Linha Vermelha. Inclui contenção periférica, rebaixamento do nível freático e monitorização.",
    status: 'in_progress',
    priority: 'critical',
    state_summary: 'Projeto de contenção da Estação A aprovado. Estações B e C em curso. Rebaixamento por wellpoints planeado.',
    due_date: '2026-07-31',
  })

  insertTask.run({
    project_id: 24,
    title: "Revisão do projeto de estruturas especiais dos túneis NATM",
    description: "Rever o projeto de estruturas especiais dos troços de túnel NATM na Linha Vermelha. Verificar betão projetado, ancoragens e suporte primário.",
    status: 'review',
    priority: 'high',
    state_summary: 'Revisão de 3 dos 5 troços NATM concluída. Troços 4 e 5 em revisão.',
    due_date: '2026-06-15',
  })

  insertTask.run({
    project_id: 24,
    title: "Plano de monitorização estrutural e geotécnica durante a construção",
    description: "Elaborar e implementar o plano de monitorização estrutural e geotécnica para acompanhamento da construção da extensão da Linha Vermelha.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Plano de monitorização aprovado. 28 piezómetros e 15 inclinómetros instalados.',
    due_date: null,
  })

  // ── Project 25 — Hospital Lisboa Oriental (id=25) ────────────────────────

  const t25a = insertTask.run({
    project_id: 25,
    title: "Análise e revisão do sistema de isolamento sísmico",
    description: "Rever o projeto do sistema de isolamento sísmico de base do Hospital Lisboa Oriental. Verificar o dimensionamento dos isoladores elastoméricos e dissipadores de energia.",
    status: 'in_progress',
    priority: 'very_high',
    state_summary: 'Análise modal concluída. Identificado subdimensionamento dos dissipadores de energia em 3 eixos estruturais. A aguardar resposta do projetista de estruturas.',
    due_date: '2026-05-31',
  })
  insertTaskComment.run({ task_id: t25a.lastInsertRowid, author_name: 'Direção Técnica', content: 'Confirmada a necessidade de revisão dos dissipadores. Projetista notificado para reforço em D-11, D-15 e D-22.' })

  const t25b = insertTask.run({
    project_id: 25,
    title: "Revisão dos desenhos de parcela — Bloco de Internamento",
    description: "Rever os desenhos de pormenor do Bloco de Internamento do HLO. Verificar compatibilidade entre estruturas, arquitectura e especialidades MEP.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Revisão do Bloco A concluída (150 desenhos). Bloco B em curso. Identificadas 12 incompatibilidades entre estrutura e AVAC.',
    due_date: '2026-06-30',
  })
  insertTaskComment.run({ task_id: t25b.lastInsertRowid, author_name: 'Coordenação BIM', content: 'Clash detection BIM identificou 12 conflitos no piso 4 e 5 entre vigas e condutas de AVAC. Partilhados com o projetista de estruturas.' })

  insertTask.run({
    project_id: 25,
    title: "Revisão das redes de saneamento e drenagem pluvial",
    description: "Rever o projeto das redes prediais de saneamento e drenagem pluvial do HLO. Verificar dimensionamento hidráulico e conformidade com RGSPPDADAR.",
    status: 'todo',
    priority: 'medium',
    state_summary: '',
    due_date: '2026-08-31',
  })

  // ── Project 26 — PSP Ilha de Santiago (id=26) ─────────────────────────────

  const t26a = insertTask.run({
    project_id: 26,
    title: "Revisão dos estudos hidráulicos das adutoras principais",
    description: "Rever e atualizar os estudos hidráulicos das condutas adutoras principais do sistema de abastecimento da Ilha de Santiago. Verificar pressões, caudais e proteção anti-golpe de aríete.",
    status: 'in_progress',
    priority: 'very_high',
    state_summary: 'Modelo hidráulico EPANET atualizado com 3 novos reservatórios. Análise de golpe de aríete em curso.',
    due_date: '2026-06-30',
  })
  insertTaskComment.run({ task_id: t26a.lastInsertRowid, author_name: 'Equipa Hidráulica', content: 'Cenários de rotura de conduta analisados. Recomendada instalação de 4 válvulas anti-choque adicionais na zona Norte da ilha.' })

  insertTask.run({
    project_id: 26,
    title: "Elaboração dos documentos de concurso BEI (procurement)",
    description: "Elaborar os documentos de concurso para adjudicação das empreitadas do PSP conforme os procedimentos do Banco Europeu de Investimento (BEI).",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Caderno de encargos do Lote 1 (adução) concluído. Lotes 2 e 3 em preparação.',
    due_date: '2026-08-31',
  })

  insertTask.run({
    project_id: 26,
    title: "Projeto de saneamento básico — redes de esgotos",
    description: "Elaborar o projeto de execução das redes de esgotos domésticos para as principais localidades da Ilha de Santiago.",
    status: 'todo',
    priority: 'medium',
    state_summary: '',
    due_date: '2026-10-31',
  })

  // ── Project 27 — Plano Diretor EPAL e Oeste (id=27) ──────────────────────

  insertTask.run({
    project_id: 27,
    title: "Diagnóstico do sistema de abastecimento existente",
    description: "Elaborar o diagnóstico do estado atual da rede de abastecimento de água da EPAL e da região Oeste. Auditorias hidráulicas e cadastro.",
    status: 'done',
    priority: 'medium',
    state_summary: 'Relatório de diagnóstico entregue e aprovado pela EPAL.',
    due_date: '2025-12-31',
  })

  insertTask.run({
    project_id: 27,
    title: "Modelação hidráulica e cenários de planeamento",
    description: "Construir o modelo hidráulico de simulação da rede EPAL e elaborar cenários de planeamento para o horizonte 2050.",
    status: 'in_progress',
    priority: 'medium',
    state_summary: 'Modelo EPANET calibrado com dados de 2024. Cenário tendencial concluído. Cenários alternativos em preparação.',
    due_date: '2026-09-30',
  })

  // ── Project 28 — Diques de Proteção contra Cheias — Moçambique (id=28) ────

  const t28a = insertTask.run({
    project_id: 28,
    title: "Projeto de execução do Dique Chókwè Sul",
    description: "Elaborar o projeto de execução do dique de proteção contra cheias de Chókwè Sul na bacia do Limpopo, incluindo fundações e impermeabilização.",
    status: 'in_progress',
    priority: 'critical',
    state_summary: 'Perfil longitudinal definido. Projeto de fundações em revisão. Identificada necessidade de jet-grouting em 2 km de troço instável.',
    due_date: '2026-06-30',
  })
  insertTaskComment.run({ task_id: t28a.lastInsertRowid, author_name: 'Equipa Geotécnica', content: 'Ensaios de permeabilidade confirmam jet-grouting necessário entre km 8+200 e km 10+350.' })

  insertTask.run({
    project_id: 28,
    title: "Projeto de execução do Dique Chókwè Norte",
    description: "Elaborar o projeto de execução do dique de Chókwè Norte. Incluir análise de estabilidade de taludes e sistemas de drenagem interna.",
    status: 'in_progress',
    priority: 'critical',
    state_summary: 'Projeto em desenvolvimento. Análise de estabilidade 50% concluída.',
    due_date: '2026-07-31',
  })

  insertTask.run({
    project_id: 28,
    title: "Projeto de execução do Dique do Búzi",
    description: "Elaborar o projeto de execução do dique de proteção contra cheias do Rio Búzi. Estudos topográficos e batimétricos concluídos.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Levantamento topográfico e batimétrico concluído. Projeto de dique em fase inicial.',
    due_date: '2026-09-30',
  })

  insertTask.run({
    project_id: 28,
    title: "Projeto de execução do Dique de Nante (Rio Save)",
    description: "Elaborar o projeto de execução do dique de proteção contra cheias de Nante na bacia do Rio Save.",
    status: 'todo',
    priority: 'high',
    state_summary: '',
    due_date: '2026-11-30',
  })

  // ── Project 29 — Barragem da Corumana (id=29) ────────────────────────────

  const t29a = insertTask.run({
    project_id: 29,
    title: "Relatório hidrológico — caudais de dimensionamento do descarregador",
    description: "Atualizar o relatório hidrológico da bacia da Corumana com dados recentes. Calcular o caudal de dimensionamento do descarregador auxiliar para PMF e TR 10 000 anos.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Dados hidrométricos de 2000-2024 obtidos do DNGRH. Análise estatística em curso. Resultados preliminares indicam aumento de 15% no caudal de ponta.',
    due_date: '2026-05-31',
  })
  insertTaskComment.run({ task_id: t29a.lastInsertRowid, author_name: 'Equipa Hidrologia', content: 'Verificar consistência dos dados da estação Pequenos Libombos. Possível lacuna de dados entre 2008 e 2011.' })

  insertTask.run({
    project_id: 29,
    title: "Elaboração dos documentos de concurso para obras",
    description: "Elaborar os documentos de concurso para a empreitada do descarregador auxiliar e nova tomada de água. Conforme procedimentos do Banco Mundial.",
    status: 'todo',
    priority: 'high',
    state_summary: '',
    due_date: '2026-10-31',
  })

  insertTask.run({
    project_id: 29,
    title: "Campanha de prospeção geotécnica adicional",
    description: "Executar a campanha de prospeção geotécnica adicional nas ombreiras para suporte ao projeto do descarregador auxiliar da Corumana.",
    status: 'in_progress',
    priority: 'medium',
    state_summary: 'Mobilização da equipa de prospeção realizada. 3 sondagens executadas de 8 programadas.',
    due_date: '2026-06-15',
  })

  // ── Project 30 — Reabilitação Grande Canal de Laaroussia (id=30) ──────────

  const t30a = insertTask.run({
    project_id: 30,
    title: "Revisão do DAO (Dossier d'Appel d'Offres) do Canal Laaroussia",
    description: "Rever e atualizar o Dossier d'Appel d'Offres para as obras de reabilitação do Grande Canal de Laaroussia. Verificar conformidade com os procedimentos KfW.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Revisão do DAO em curso. Incorporação dos comentários do KfW de março 2026.',
    due_date: '2026-06-30',
  })
  insertTaskComment.run({ task_id: t30a.lastInsertRowid, author_name: 'Gestor de Projeto', content: 'KfW solicitou revisão das cláusulas ambientais e sociais do DAO. Prazo para submissão: 30 junho 2026.' })

  insertTask.run({
    project_id: 30,
    title: "Apoio à missão de supervisão KfW",
    description: "Preparar e apoiar a missão de supervisão do KfW ao projeto de reabilitação do Canal de Laaroussia. Preparar relatório de progresso e apresentações.",
    status: 'todo',
    priority: 'medium',
    state_summary: '',
    due_date: '2026-09-30',
  })

  insertTask.run({
    project_id: 30,
    title: "Projeto de execução de revestimento do canal",
    description: "Elaborar o projeto de execução do revestimento do canal em betão projetado. Inclui projeto de drenagem subsuperficial e juntas de dilatação.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Projeto de 40 km dos 85 km do canal concluído. Restante em curso.',
    due_date: '2026-08-31',
  })

  // ── Project 31 — Sistema Bombagem Centrais Hidroelétricas ONEE (id=31) ────

  insertTask.run({
    project_id: 31,
    title: "Avaliação técnica das 6 centrais candidatas",
    description: "Realizar a avaliação técnica das 6 centrais hidroelétricas da ONEE candidatas à instalação de sistema de bombagem. Verificar compatibilidade hidráulica e civil.",
    status: 'in_progress',
    priority: 'medium',
    state_summary: '4 centrais avaliadas. Centrais Al Wahda e Bin El Ouidane a aguardar visita.',
    due_date: '2026-06-30',
  })

  insertTask.run({
    project_id: 31,
    title: "Análise económica e de rentabilidade dos sistemas STEP",
    description: "Elaborar a análise económica e de rentabilidade para a introdução dos sistemas de bombagem nas centrais selecionadas. Incluir análise do mercado energético marroquino.",
    status: 'todo',
    priority: 'medium',
    state_summary: '',
    due_date: '2026-09-30',
  })

  // ── Project 32 — Barragem do Nhene + Rede Lubango (id=32) ────────────────

  insertTask.run({
    project_id: 32,
    title: "Kick-off e mobilização da equipa de projeto",
    description: "Organizar a reunião de kick-off com o cliente MINEA e mobilizar a equipa técnica para o projeto da Barragem do Nhene e rede de Lubango.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Reunião de kick-off agendada para outubro 2025. Equipa de projeto identificada e mobilizada.',
    due_date: '2025-11-30',
  })

  insertTask.run({
    project_id: 32,
    title: "Plano de trabalhos e programa de prospeção geotécnica",
    description: "Elaborar o plano detalhado de trabalhos e o programa de prospeção geotécnica para a Barragem do Nhene. Prazo contratual de 12 meses.",
    status: 'todo',
    priority: 'high',
    state_summary: '',
    due_date: '2025-12-31',
  })

  insertTask.run({
    project_id: 32,
    title: "Levantamento de campo da rede de distribuição de Lubango",
    description: "Realizar o levantamento de campo da rede de distribuição de água existente em Lubango para diagnóstico e base do projeto de reabilitação.",
    status: 'todo',
    priority: 'medium',
    state_summary: '',
    due_date: '2026-02-28',
  })

  // ── Project 33 — Barragem N'Ompombo (id=33) ──────────────────────────────

  insertTask.run({
    project_id: 33,
    title: "Kick-off e mobilização da equipa N'Ompombo",
    description: "Organizar a reunião de kick-off com o MINEA e mobilizar a equipa técnica para o projeto da Barragem de N'Ompombo.",
    status: 'in_progress',
    priority: 'high',
    state_summary: "Contrato assinado em setembro 2025. Equipa mobilizada. Kick-off agendado.",
    due_date: '2025-11-30',
  })

  insertTask.run({
    project_id: 33,
    title: "Reconhecimento de campo e levantamento cartográfico",
    description: "Realizar o reconhecimento de campo do local da barragem de N'Ompombo. Levantamento topográfico e recolha de amostras geológicas de superfície.",
    status: 'todo',
    priority: 'high',
    state_summary: '',
    due_date: '2026-01-31',
  })

  insertTask.run({
    project_id: 33,
    title: "Estudo hidrológico preliminar da bacia de N'Ompombo",
    description: "Elaborar o estudo hidrológico preliminar para determinação dos caudais de dimensionamento da barragem de N'Ompombo.",
    status: 'todo',
    priority: 'medium',
    state_summary: '',
    due_date: '2026-03-31',
  })

  // ── Project 34 — Aeroporto Humberto Delgado — EIA Expansão (id=34) ────────

  insertTask.run({
    project_id: 34,
    title: "Scoping e definição do âmbito do EIA",
    description: "Elaborar o documento de definição de âmbito do EIA para a expansão do Aeroporto Humberto Delgado. Submeter à APA para consulta pública prévia.",
    status: 'in_progress',
    priority: 'high',
    state_summary: 'Documento de scoping em preparação. Reunião com APA agendada para novembro 2025.',
    due_date: '2025-12-15',
  })

  insertTask.run({
    project_id: 34,
    title: "Estudo de ruído aeronáutico",
    description: "Elaborar o estudo de impacte de ruído aeronáutico para a expansão do aeroporto. Modelação com INM/AEDT e mapas de ruído.",
    status: 'todo',
    priority: 'high',
    state_summary: '',
    due_date: '2026-04-30',
  })

  insertTask.run({
    project_id: 34,
    title: "Estudo de impacte sobre o sistema de transporte e acessos",
    description: "Avaliar o impacte da expansão do Aeroporto Humberto Delgado sobre os sistemas de transporte e vias de acesso. Propor medidas de mitigação.",
    status: 'todo',
    priority: 'medium',
    state_summary: '',
    due_date: '2026-05-31',
  })

})
