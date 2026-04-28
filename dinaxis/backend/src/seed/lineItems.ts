import { db } from '../db'

export function seedLineItems(claimIds: number[]): {
  lineItemIdsByClaimIdx: Record<number, number[]>
  billingItemIdsByClaimIdx: Record<number, number[]>
} {
  const insertLine = db.prepare(`
    INSERT INTO line_items (claim_id, description, category, estimated_cost, approved_cost, notes)
    VALUES (@claim_id, @description, @category, @estimated_cost, @approved_cost, @notes)
  `)

  const insertBilling = db.prepare(`
    INSERT INTO billing_items (claim_id, description, category, amount, notes)
    VALUES (@claim_id, @description, @category, @amount, @notes)
  `)

  const lineItemIdsByClaimIdx: Record<number, number[]> = {}
  const billingItemIdsByClaimIdx: Record<number, number[]> = {}

  function addLine(claimIdx: number, item: { description: string; category: string; estimated_cost: number; approved_cost: number | null; notes: string }) {
    const r = insertLine.run({ claim_id: claimIds[claimIdx], ...item })
    const id = Number(r.lastInsertRowid)
    if (!lineItemIdsByClaimIdx[claimIdx]) lineItemIdsByClaimIdx[claimIdx] = []
    lineItemIdsByClaimIdx[claimIdx].push(id)
    return id
  }

  function addBilling(claimIdx: number, item: { description: string; category: string; amount: number; notes: string }) {
    const r = insertBilling.run({ claim_id: claimIds[claimIdx], ...item })
    const id = Number(r.lastInsertRowid)
    if (!billingItemIdsByClaimIdx[claimIdx]) billingItemIdsByClaimIdx[claimIdx] = []
    billingItemIdsByClaimIdx[claimIdx].push(id)
    return id
  }

  // ── Sinistro 0 — Danos Materiais / closed ──────────────────────────────────
  addLine(0, { description: 'Substituição de telhas cerâmicas — vertente sul (18 m²)', category: 'structure', estimated_cost: 4200, approved_cost: 3900, notes: 'Telhas cerâmicas tipo Marselha de cor vermelha. Material e assentamento incluídos. Empreiteiro certificado.' })
  addLine(0, { description: 'Substituição de frechal de madeira danificado (2,4 m linear)', category: 'structure', estimated_cost: 1800, approved_cost: 1650, notes: 'Frechal de madeira maciça de pinho tratado. Inclui remoção do elemento danificado e colocação de novo.' })
  addLine(0, { description: 'Substituição de caleiras e rufos de zinco — fachada sul', category: 'structure', estimated_cost: 2100, approved_cost: 1950, notes: 'Caleiras de zinco 0,65 mm. Inclui fixações e teste de estanqueidade.' })
  addLine(0, { description: 'Reparação e pintura de tecto e parede — quarto de casal', category: 'structure', estimated_cost: 2800, approved_cost: 2400, notes: 'Inclui secagem por desumidificação, substituição de placa de pladur no tecto (4 m²), reboco e duas demãos de tinta interior.' })
  addLine(0, { description: 'Reconstrução de vedação de alvenaria (8 m lineares)', category: 'structure', estimated_cost: 3200, approved_cost: 3100, notes: 'Tijolo cerâmico furado, reboco e capeamento. Inclui remoção dos restos da vedação antiga.' })
  addBilling(0, { description: 'Honorários de peritagem — Eng. António Ferreira (2 vistorias)', category: 'fees', amount: 980, notes: 'Duas vistorias ao local incluídas. Relatório técnico final emitido.' })
  addBilling(0, { description: 'Custos administrativos e gestão do processo', category: 'fees', amount: 350, notes: 'Coordenação com empreiteiro, comunicação com seguradora e arquivo de documentação.' })

  // ── Sinistro 1 — Incêndio Comercial / closed ───────────────────────────────
  addLine(1, { description: 'Demolição e reconstrução da arrecadação traseira', category: 'structure', estimated_cost: 38000, approved_cost: 36500, notes: 'Inclui demolição da cobertura e paredes interiores carbonizadas, reconstrução estrutural, reboco e acabamentos.' })
  addLine(1, { description: 'Reparação do armazém — tectos, paredes e pinturas', category: 'structure', estimated_cost: 22000, approved_cost: 21000, notes: 'Substituição de tecto falso em 120 m², reboco das paredes afectadas e pintura em toda a área do armazém.' })
  addLine(1, { description: 'Limpeza profissional de fumo e fuligem — área de venda (180 m²)', category: 'contents', estimated_cost: 12000, approved_cost: 11500, notes: 'Empresa especializada de remediação. Inclui limpeza de tectos, paredes, pavimento e mobiliário de exposição.' })
  addLine(1, { description: 'Substituição de mobiliário de exposição danificado', category: 'contents', estimated_cost: 15000, approved_cost: 14000, notes: 'Três peças de mobiliário de exposição de alto valor irrecuperáveis. Substituição por equivalente conforme inventário.' })
  addLine(1, { description: 'Substituição do quadro eléctrico e instalação de nova quadro de distribuição', category: 'structure', estimated_cost: 8500, approved_cost: 8500, notes: 'Quadro de distribuição BT novo, conforme RTIEBT, com disjuntor diferencial. Inclui certificação DGEG.' })
  addLine(1, { description: 'Stock de produto destruído pela água dos sprinklers', category: 'contents', estimated_cost: 12000, approved_cost: 11000, notes: 'Stock de artigos de decoração afectado pela activação dos sprinklers. Inventário validado com contabilidade.' })
  addBilling(1, { description: 'Honorários de peritagem — Dra. Carla Mendonça (2 vistorias)', category: 'fees', amount: 1200, notes: 'Duas vistorias ao local, investigação de causa e relatório técnico de incêndio.' })
  addBilling(1, { description: 'Honorários de peritagem — Eng. António Ferreira (avaliação estrutural)', category: 'fees', amount: 750, notes: 'Avaliação estrutural da arrecadação e armazém após incêndio.' })

  // ── Sinistro 2 — Responsabilidade Civil / closed ───────────────────────────
  addLine(2, { description: 'Despesas médicas — fractura do tornozelo e cirurgia', category: 'other', estimated_cost: 9500, approved_cost: 9500, notes: 'Urgência, cirurgia de fixação interna, internamento de 2 dias, consultas de ortopedia e fisioterapia de 8 semanas.' })
  addLine(2, { description: 'Incapacidade temporária — baixa médica de 6 semanas', category: 'other', estimated_cost: 3200, approved_cost: 3200, notes: 'Calculado com base no salário declarado de €1.400/mês. 6 semanas = €1.960 + complemento de RC.' })
  addLine(2, { description: 'Danos morais — acordo extrajudicial', category: 'other', estimated_cost: 8000, approved_cost: 7000, notes: 'Valor negociado com advogado da lesada após relatório médico documentar sequelas moderadas.' })
  addLine(2, { description: 'Honorários de advogado da lesada', category: 'other', estimated_cost: 2500, approved_cost: 2500, notes: 'Honorários acordados com o advogado da sinistrada para negociação extrajudicial.' })
  addBilling(2, { description: 'Honorários de peritagem — Arq. Sofia Lopes', category: 'fees', amount: 650, notes: 'Vistoria ao local, avaliação de conformidade do pavimento e relatório técnico.' })
  addBilling(2, { description: 'Honorários de advogado da seguradora', category: 'fees', amount: 1800, notes: 'Acompanhamento jurídico do processo de responsabilidade civil e negociação do acordo.' })

  // ── Sinistro 3 — Auto / assigned ───────────────────────────────────────────
  addLine(3, { description: 'Substituição de porta dianteira direita', category: 'structure', estimated_cost: 4200, approved_cost: null, notes: 'Porta original Toyota Corolla (peça nova). Inclui remoção, colocação, pintura e ajustes.' })
  addLine(3, { description: 'Reparação de porta traseira direita', category: 'structure', estimated_cost: 1800, approved_cost: null, notes: 'Reparação de amolgadela e lascagem de pintura. Pintura com laca original Toyota.' })
  addLine(3, { description: 'Substituição de jante traseira direita', category: 'structure', estimated_cost: 650, approved_cost: null, notes: 'Jante de liga leve original Toyota (17"). Jante actual rachada — substituição obrigatória.' })
  addLine(3, { description: 'Substituição de pneu traseiro direito', category: 'structure', estimated_cost: 280, approved_cost: null, notes: 'Pneu Michelin Primacy 225/55R17. Montagem e equilíbrio incluídos.' })
  addLine(3, { description: 'Substituição de retrovisor exterior direito', category: 'structure', estimated_cost: 420, approved_cost: null, notes: 'Retrovisor com regulação eléctrica e desembaciador. Peça original Toyota.' })
  addLine(3, { description: 'Viatura de substituição durante período de reparação', category: 'other', estimated_cost: 800, approved_cost: null, notes: 'Estimativa de 10 dias × €80/dia.' })
  addBilling(3, { description: 'Honorários de peritagem automóvel — Eng. Paulo Rodrigues', category: 'fees', amount: 420, notes: 'Vistoria ao veículo, relatório fotográfico e orçamento de referência.' })

  // ── Sinistro 4 — Inundação Residencial / assigned ──────────────────────────
  addLine(4, { description: 'Secagem profissional e desumidificação — rés-do-chão', category: 'structure', estimated_cost: 3800, approved_cost: null, notes: 'Aluguer de 4 desumidificadores industriais por 5 dias, monitorização de humidade e secagem de paredes.' })
  addLine(4, { description: 'Substituição de tecto falso da cozinha (25 m²)', category: 'structure', estimated_cost: 2800, approved_cost: null, notes: 'Remoção do tecto falso saturado, substituição por pladur hidrófugo e pintura.' })
  addLine(4, { description: 'Reparação de pavimento de mosaico — sala e corredor (42 m²)', category: 'structure', estimated_cost: 4500, approved_cost: null, notes: 'Levantamento de placas soltas (40% da área), limpeza do leito, recolagem e rejuntamento.' })
  addLine(4, { description: 'Reboco e pintura de paredes — sala, cozinha e corredor', category: 'structure', estimated_cost: 6200, approved_cost: null, notes: 'Paredes saturadas até 35 cm requerem remoção do reboco, novo reboco e pintura em toda a divisão.' })
  addLine(4, { description: 'Substituição de tomadas eléctricas (8 unidades) e quadro parcial', category: 'structure', estimated_cost: 1800, approved_cost: null, notes: 'Electricista certificado DGEG. Substituição de 8 tomadas abaixo da linha de água e verificação do quadro.' })
  addBilling(4, { description: 'Honorários de peritagem — Eng. Rui Baptista', category: 'fees', amount: 580, notes: 'Vistoria ao local, confirmação de origem da inundação e relatório técnico.' })

  // ── Sinistro 5 — Furto Joalharia / inspection_scheduled ────────────────────
  addLine(5, { description: 'Joias em ouro e diamantes furtadas', category: 'contents', estimated_cost: 68000, approved_cost: null, notes: 'Anéis, colares e brincos em ouro 18K e ouro branco com diamantes. Inventário em preparação com avaliador independente.' })
  addLine(5, { description: 'Relógios de marca furtados', category: 'contents', estimated_cost: 32000, approved_cost: null, notes: 'Cinco relógios de marca (Omega, TAG Heuer e outros). Certificados de autenticidade a recuperar com fornecedores.' })
  addLine(5, { description: 'Numerário furtado do cofre-forte', category: 'contents', estimated_cost: 25000, approved_cost: null, notes: 'Numerário do fundo de reserva. Confirmado por registos contabilísticos e declaração do gerente.' })
  addLine(5, { description: 'Reparação/substituição do cofre-forte perfurado', category: 'structure', estimated_cost: 8500, approved_cost: null, notes: 'Cofre-forte de grau 4 perfurado com rebarbadora. Substituição por novo cofre certificado EN 1143-1.' })
  addLine(5, { description: 'Substituição do sistema de alarme e câmeras de vigilância', category: 'structure', estimated_cost: 12000, approved_cost: null, notes: 'Sistema de alarme foi neutralizado pelos assaltantes. Substituição por sistema com certificação grau 3.' })
  addBilling(5, { description: 'Honorários de peritagem — Arq. Sofia Lopes', category: 'fees', amount: 480, notes: 'Vistoria ao local pós-assalto, avaliação de danos e relatório técnico.' })

  // ── Sinistro 6 — Danos Materiais Hotel / inspection_scheduled ──────────────
  addLine(6, { description: 'Substituição de cobertura de policarbonato da piscina exterior (280 m²)', category: 'structure', estimated_cost: 38000, approved_cost: null, notes: 'Policarbonato alveolar 16 mm, UV protegido. Inclui estrutura de alumínio de suporte e impermeabilização perimetral.' })
  addLine(6, { description: 'Substituição de 4 claraboias do spa', category: 'structure', estimated_cost: 18000, approved_cost: null, notes: 'Claraboias de vidro temperado 10+10 com vedação EPDM. Inclui remoção, colocação e impermeabilização.' })
  addLine(6, { description: 'Reparação de caleiras e rufos — edifício principal', category: 'structure', estimated_cost: 6500, approved_cost: null, notes: 'Caleiras de zinco com deformação em 40 m lineares. Inclui reparação e reposicionamento.' })
  addLine(6, { description: 'Perda de receita — piscina e spa encerrados (4 semanas)', category: 'other', estimated_cost: 28000, approved_cost: null, notes: 'Calculado com base na receita média das instalações afectadas por semana, verificada em declaração de IVA.' })
  addBilling(6, { description: 'Honorários de peritagem — Eng. António Ferreira + Arq. Sofia Lopes', category: 'fees', amount: 1200, notes: 'Vistoria conjunta à cobertura, claraboias e estrutura. Relatório técnico conjunto.' })

  // ── Sinistro 7 — Incêndio Residencial / inspected ──────────────────────────
  addLine(7, { description: 'Demolição e reconstrução de parede de separação garagem/corredor', category: 'structure', estimated_cost: 12000, approved_cost: null, notes: 'Parede de betão com fissuração por choque térmico. Demolição e reconstrução em tijolo de 11 cm com reboco.' })
  addLine(7, { description: 'Remediação e pintura da garagem — limpeza de fuligem e tratamento', category: 'structure', estimated_cost: 4500, approved_cost: null, notes: 'Limpeza profissional de fuligem, primer anti-mancha e tinta de betão nas paredes e pavimento.' })
  addLine(7, { description: 'Reparação de hall de entrada e corredor — fuligem e pintura', category: 'structure', estimated_cost: 3200, approved_cost: null, notes: 'Limpeza de fuligem superficial, primer e duas demãos de tinta branca mate interior.' })
  addLine(7, { description: 'Substituição de automóvel — perda total', category: 'contents', estimated_cost: 18000, approved_cost: null, notes: 'Veículo completamente destruído (perda total). Indemnização pelo valor de mercado do veículo à data do sinistro.' })
  addLine(7, { description: 'Substituição de conteúdos do arrumos destruídos', category: 'contents', estimated_cost: 3500, approved_cost: null, notes: 'Ferramentas, equipamento de jardim e material de bricolage. Lista apresentada pelo sinistrado com depreciação aplicada.' })
  addBilling(7, { description: 'Honorários de peritagem — Dra. Carla Mendonça', category: 'fees', amount: 780, notes: 'Vistoria ao local, investigação de causa, relatório técnico de incêndio.' })

  // ── Sinistro 8 — Responsabilidade Civil Supermercado / inspected ────────────
  addLine(8, { description: 'Despesas médicas — fractura do rádio e fisioterapia', category: 'other', estimated_cost: 6800, approved_cost: null, notes: 'Urgência, imobilização ortopédica, consultas de ortopedia e fisioterapia de 4 semanas.' })
  addLine(8, { description: 'Incapacidade temporária — 4 semanas de baixa', category: 'other', estimated_cost: 2200, approved_cost: null, notes: 'Calculado com base em declaração de rendimentos. Baixa médica de 4 semanas confirmada.' })
  addLine(8, { description: 'Danos morais', category: 'other', estimated_cost: 5500, approved_cost: null, notes: 'Estimativa inicial. Sujeito a negociação com advogado do lesado.' })
  addBilling(8, { description: 'Honorários de peritagem — Arq. Sofia Lopes', category: 'fees', amount: 520, notes: 'Vistoria ao local do acidente e relatório de conformidade.' })

  // ── Sinistro 9 — Inundação Industrial / inspected ──────────────────────────
  addLine(9, { description: 'Remediação de inundação industrial — secagem e desinfeção (3.200 m²)', category: 'structure', estimated_cost: 42000, approved_cost: null, notes: 'Empresa especializada. Secagem com 12 desumidificadores industriais, desinfeção e remoção de lodo.' })
  addLine(9, { description: 'Substituição do sistema eléctrico completo do armazém', category: 'structure', estimated_cost: 58000, approved_cost: null, notes: 'Quadros de distribuição, cablagem, iluminação industrial LED e tomadas de força. Certificação DGEG.' })
  addLine(9, { description: 'Substituição de 2 linhas de paletização automática', category: 'contents', estimated_cost: 95000, approved_cost: null, notes: 'Duas linhas de tapetes transportadores e quadros de controlo. Relatório do fabricante confirma irrecuperabilidade.' })
  addLine(9, { description: 'Substituição de empilhador eléctrico Toyota', category: 'contents', estimated_cost: 28000, approved_cost: null, notes: 'Empilhador eléctrico Toyota 1,5T — motor e baterias irrecuperáveis após imersão prolongada.' })
  addLine(9, { description: 'Stock destruído — 1.240 SKUs', category: 'contents', estimated_cost: 215000, approved_cost: null, notes: 'Inventário validado com auditoria ao WMS. Inclui mercadoria paletizada de diversas categorias.' })
  addLine(9, { description: 'Reparação do pavimento de betão — fissuração superficial (200 m²)', category: 'structure', estimated_cost: 8000, approved_cost: null, notes: 'Injecção de resina epóxi nas fissuras e aplicação de primário de consolidação.' })
  addLine(9, { description: 'Perda de receita — interrupção de actividade (6 semanas)', category: 'other', estimated_cost: 72000, approved_cost: null, notes: 'Faturação semanal média de €12.000 verificada. Clientes redirecionados para armazém alternativo.' })
  addBilling(9, { description: 'Honorários de peritagem — Eng. Rui Baptista (2 vistorias)', category: 'fees', amount: 1400, notes: 'Duas vistorias ao local, mapeamento de danos e relatório hidrológico.' })
  addBilling(9, { description: 'Honorários de peritagem — Eng. António Ferreira (estruturas)', category: 'fees', amount: 850, notes: 'Avaliação estrutural do armazém após inundação.' })

  // ── Sinistro 10 — Auto / report_pending ─────────────────────────────────────
  addLine(10, { description: 'Reparação de frente do veículo — capô, para-choques e estrutura', category: 'structure', estimated_cost: 16500, approved_cost: null, notes: 'Orçamento da oficina autorizada Peugeot: capô substituição, para-choques substituição, reparação da longarina.' })
  addLine(10, { description: 'Tratamento médico — lesões cervicais e lombares', category: 'other', estimated_cost: 9500, approved_cost: null, notes: 'Consultas, TAC cervical e lombar, fisioterapia. Relatório médico de ortopedista pendente.' })
  addLine(10, { description: 'Viatura de substituição durante reparação', category: 'other', estimated_cost: 1200, approved_cost: null, notes: 'Estimativa de 15 dias × €80/dia.' })
  addBilling(10, { description: 'Honorários de peritagem automóvel — Eng. Paulo Rodrigues', category: 'fees', amount: 480, notes: 'Vistoria ao veículo, relatório de dano provisório e orçamento de referência.' })

  // ── Sinistro 11 — Furto Residencial / report_pending ──────────────────────
  addLine(11, { description: 'Portátil Dell de trabalho (não recuperado)', category: 'contents', estimated_cost: 1800, approved_cost: null, notes: 'Dell Latitude 5520, adquirido há 14 meses. Fatura de compra apresentada. Depreciação a calcular.' })
  addLine(11, { description: 'Câmara Sony mirrorless + 2 objetivas (não recuperada)', category: 'contents', estimated_cost: 3200, approved_cost: null, notes: 'Sony A7 IV + 28-70mm + 85mm prime. Adquirida há 8 meses. Avaliação independente obtida.' })
  addLine(11, { description: 'Joalharia de família (não recuperada)', category: 'contents', estimated_cost: 4500, approved_cost: null, notes: 'Avaliação por joalheiro independente solicitada. Lista detalhada fornecida pela sinistrada.' })
  addLine(11, { description: 'Numerário furtado', category: 'contents', estimated_cost: 800, approved_cost: null, notes: 'Fundo de emergência em casa. Valor confirmado pelo sinistrado.' })
  addLine(11, { description: 'Reparação de caixilharia arrombada — janela da cozinha', category: 'structure', estimated_cost: 680, approved_cost: null, notes: 'Caixilharia de alumínio com vidro duplo. Substituição completa do vão.' })

  // ── Sinistro 12 — Danos Materiais Clínica / submitted ─────────────────────
  addLine(12, { description: 'Reconstrução de tecto falso — consultório de dermatologia (55 m²)', category: 'structure', estimated_cost: 14000, approved_cost: null, notes: 'Painéis de gesso hidrófugo, estrutura de alumínio e pintura. Inclui remoção dos painéis destruídos.' })
  addLine(12, { description: 'Reconstrução de tecto falso — laboratório de análises (30 m²)', category: 'structure', estimated_cost: 8500, approved_cost: null, notes: 'Painéis de gesso com certificação bacteriológica para laboratório. Inclui iluminação embutida.' })
  addLine(12, { description: 'Reparação de paredes — piso 2 (consultório + laboratório)', category: 'structure', estimated_cost: 6200, approved_cost: null, notes: 'Remoção de reboco até 1,2 m de altura, secagem, novo reboco hidrófugo e pintura lavável.' })
  addLine(12, { description: 'Substituição de pavimento vinílico — consultório e laboratório (85 m²)', category: 'structure', estimated_cost: 7800, approved_cost: null, notes: 'Pavimento vinílico hospitalar antisséptico tipo Tarkett. Inclui remoção do existente.' })
  addLine(12, { description: 'Substituição de equipamento de laboratório destruído', category: 'contents', estimated_cost: 18000, approved_cost: null, notes: 'Centrífuga, estufa de esterilização e microscópio binocular. Facturas de compra apresentadas.' })
  addLine(12, { description: 'Reparação do corredor e recepção do piso 1 (humidade)', category: 'structure', estimated_cost: 5500, approved_cost: null, notes: 'Secagem, tratamento anti-humidade, repintura do tecto e paredes do corredor do piso 1.' })
  addBilling(12, { description: 'Honorários de peritagem — Eng. António Ferreira + Arq. Sofia Lopes', category: 'fees', amount: 1100, notes: 'Vistoria conjunta ao segundo andar e avaliação dos danos.' })

  // ── Sinistro 13 — Incêndio Residencial Porto / submitted ──────────────────
  addLine(13, { description: 'Substituição de cozinha completa — móveis e electros', category: 'structure', estimated_cost: 22000, approved_cost: null, notes: 'Módulos de cozinha, bancada em quartzo, arca frigorífica, fogão e placa. Móveis destruídos pelo fogo.' })
  addLine(13, { description: 'Limpeza profissional de fumo e fuligem — apartamento inteiro', category: 'contents', estimated_cost: 8500, approved_cost: null, notes: 'Empresa especializada. Limpeza de tectos, paredes, pavimentos e todas as superfícies do apartamento.' })
  addLine(13, { description: 'Pintura e acabamentos — sala de jantar e corredor', category: 'structure', estimated_cost: 3800, approved_cost: null, notes: 'Repintura após limpeza de fuligem. Duas demãos de tinta vinílica branca mate.' })
  addLine(13, { description: 'Substituição de cortinados e têxteis destruídos', category: 'contents', estimated_cost: 2400, approved_cost: null, notes: 'Cortinados, tapetes e têxteis na zona de origem do incêndio e sala adjacente.' })
  addLine(13, { description: 'Alojamento temporário durante obras (estimativa 2 meses)', category: 'other', estimated_cost: 2800, approved_cost: null, notes: 'Arrendamento temporário a €1.400/mês. A confirmar com duração real das obras.' })
  addBilling(13, { description: 'Honorários de peritagem — Dra. Carla Mendonça', category: 'fees', amount: 680, notes: 'Vistoria ao apartamento, investigação de causa e relatório técnico de incêndio.' })

  // ── Sinistro 14 — Auto Pesado / submitted ──────────────────────────────────
  addLine(14, { description: 'Avaliação de dano total — camião Mercedes Actros', category: 'structure', estimated_cost: 43000, approved_cost: null, notes: 'Valor de mercado do camião com depreciação de 15%: €41.000. Custo de reparação estimado: €38.000. Dano total técnico confirmado.' })
  addLine(14, { description: 'Carga parcialmente danificada — material de construção', category: 'contents', estimated_cost: 4800, approved_cost: null, notes: 'Parte da carga (cerâmica e materiais de acabamento) danificada no acidente. Inventário do cliente fornecido.' })
  addLine(14, { description: 'Veículo de substituição para frota durante avaliação', category: 'other', estimated_cost: 3500, approved_cost: null, notes: 'Aluguer de camião equivalente por 2 semanas durante processo de decisão.' })
  addBilling(14, { description: 'Honorários de peritagem automóvel — Eng. Paulo Rodrigues', category: 'fees', amount: 850, notes: 'Vistoria ao camião, relatório de avaliação de dano total e documentação para seguradora.' })

  // ── Sinistro 15 — Danos Materiais Residencial / new ─────────────────────────
  addLine(15, { description: 'Reparação de calçada portuguesa do pátio (12 m²)', category: 'structure', estimated_cost: 2800, approved_cost: null, notes: 'Remoção e reposição de calçada portuguesa. Inclui saibro de assentamento e rejuntamento.' })
  addLine(15, { description: 'Reparação de tubagem de rega danificada', category: 'structure', estimated_cost: 380, approved_cost: null, notes: 'Substituição de troço de tubagem de polietileno e acessórios.' })
  addLine(15, { description: 'Substituição de vidros da estufa de jardim', category: 'structure', estimated_cost: 1200, approved_cost: null, notes: 'Vidros simples 4 mm da estufa em 6 painéis. Inclui perfis de vedação.' })
  addLine(15, { description: 'Tratamento de fissura em parede junto à janela da cozinha', category: 'structure', estimated_cost: 1800, approved_cost: null, notes: 'Abertura de fissura, injecção de resina, reboco e pintura. Peritagem estrutural preventiva recomendada.' })

  // ── Sinistro 16 — Furto Farmácia / new ───────────────────────────────────────
  addLine(16, { description: 'Medicamentos controlados furtados (psicotrópicos e estupefacientes)', category: 'contents', estimated_cost: 8500, approved_cost: null, notes: 'Lista fornecida ao INFARMED. Valor calculado pelo PVP dos produtos. Sujeito a aprovação do INFARMED.' })
  addLine(16, { description: 'Produtos de dermofarmácia de alto valor furtados', category: 'contents', estimated_cost: 9200, approved_cost: null, notes: 'Produtos das marcas La Roche-Posay, Avène e Vichy de valor unitário elevado. Lista detalhada com faturas de custo.' })
  addLine(16, { description: 'Numerário furtado do caixa', category: 'contents', estimated_cost: 1200, approved_cost: null, notes: 'Fundo de caixa de fim-de-dia. Confirmado por registo de caixa do dia anterior.' })
  addLine(16, { description: 'Substituição de porta principal arrombada', category: 'structure', estimated_cost: 3800, approved_cost: null, notes: 'Porta de segurança RC3 com vidro laminado anti-intrusão. Inclui caixilho e fechadura de alta segurança.' })

  // ── Sinistro 17 — Outros / new ────────────────────────────────────────────
  addLine(17, { description: 'Reconstrução de tecto falso — sala de aula (40 m²)', category: 'structure', estimated_cost: 9500, approved_cost: null, notes: 'Painéis de gesso com tratamento hidrófugo, estrutura de alumínio e pintura.' })
  addLine(17, { description: 'Substituição de pavimento de linóleo — sala de aula (40 m²)', category: 'structure', estimated_cost: 4200, approved_cost: null, notes: 'Linóleo de grau comercial educativo. Inclui remoção do existente e nivelamento do suporte.' })
  addLine(17, { description: 'Substituição de 20 mesas e 20 cadeiras escolares', category: 'contents', estimated_cost: 6000, approved_cost: null, notes: 'Mobiliário escolar ergonómico para sala de 20 alunos. Cotação de fornecedor aprovado pelo MEC.' })
  addLine(17, { description: 'Substituição de projector de tecto', category: 'contents', estimated_cost: 2800, approved_cost: null, notes: 'Projector Epson de 3.800 lúmens com suporte de tecto. Fatura de compra do original apresentada.' })
  addLine(17, { description: 'Reparação e substituição de caleira entupida', category: 'structure', estimated_cost: 1800, approved_cost: null, notes: 'Limpeza geral de caleiras do edifício + substituição do troço entupido que causou o sinistro.' })

  // ── Sinistro 18 — Inundação / disputed ───────────────────────────────────────
  addLine(18, { description: 'Remediação e limpeza de 8 unidades de alojamento', category: 'structure', estimated_cost: 48000, approved_cost: null, notes: 'Limpeza de lamas, secagem, desinfecção e remoção de materiais irrecuperáveis das 8 unidades afectadas.' })
  addLine(18, { description: 'Substituição de pavimento de madeira — pavilhão central (180 m²)', category: 'structure', estimated_cost: 38000, approved_cost: null, notes: 'Soalho de madeira maciça de carvalho irrecuperável. Substituição total com nova madeira de qualidade equivalente.' })
  addLine(18, { description: 'Reconstrução de paredes e acabamentos das unidades afectadas', category: 'structure', estimated_cost: 65000, approved_cost: null, notes: 'Substituição de reboco, pavimento, sanitários e mobiliário das 8 unidades de alojamento.' })
  addLine(18, { description: 'Perda de receita — encerramento do empreendimento (3 meses)', category: 'other', estimated_cost: 120000, approved_cost: null, notes: 'Receita média mensal verificada em IRS e IVA: €40.000/mês. 3 meses de encerramento estimados.' })
  addBilling(18, { description: 'Honorários de peritagem — Eng. Rui Baptista (relatório hidrológico)', category: 'fees', amount: 2200, notes: 'Peritagem hidrológica, relatório técnico e comparência em mediação.' })
  addBilling(18, { description: 'Honorários de advogado em processo disputado', category: 'fees', amount: 3500, notes: 'Honorários de advogado para acompanhamento da disputa com a seguradora.' })

  // ── Sinistro 19 — Danos Materiais Residencial / new ─────────────────────────
  addLine(19, { description: 'Reparação do telhado — substituição de telhas lusalite (25%)', category: 'structure', estimated_cost: 3200, approved_cost: null, notes: 'Aproximadamente 25% das telhas lusalite da vertente norte arrancadas ou partidas.' })
  addLine(19, { description: 'Substituição de calha de zinco — fachada principal', category: 'structure', estimated_cost: 1400, approved_cost: null, notes: 'Calha de zinco 0,7 mm deformada em toda a extensão da fachada principal (12 m lineares).' })
  addLine(19, { description: 'Reparação do portão automático da garagem', category: 'contents', estimated_cost: 2800, approved_cost: null, notes: 'Portão de seccionamento automático empenado. Motor e automatismo a verificar — possível substituição.' })
  addLine(19, { description: 'Tratamento de humidade e repintura do tecto do quarto de criança', category: 'structure', estimated_cost: 1800, approved_cost: null, notes: 'Remoção da humidade, tratamento anti-bolor, reboco e pintura do tecto.' })

  return { lineItemIdsByClaimIdx, billingItemIdsByClaimIdx }
}
