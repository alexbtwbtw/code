import { db } from '../db'

export function seedLineItems(claimIds: number[]): void {
  const insert = db.prepare(`
    INSERT INTO line_items (claim_id, description, category, estimated_cost, approved_cost, notes)
    VALUES (@claim_id, @description, @category, @estimated_cost, @approved_cost, @notes)
  `)

  const lineItems = [
    // Sinistro 1 — Danos Materiais (encerrado)
    { claim_id: claimIds[0], description: 'Substituição de telhas e remate de chaminé', category: 'structure', estimated_cost: 8500, approved_cost: 7800, notes: 'Empreiteiro de coberturas certificado. 60% de área de telha substituída na vertente norte. Materiais e mão de obra incluídos.' },
    { claim_id: claimIds[0], description: 'Remediação de humidade e substituição do teto do quarto principal', category: 'structure', estimated_cost: 7000, approved_cost: 6500, notes: 'Inclui secagem, inspeção de bolores, substituição do teto em gesso cartonado e pintura.' },
    { claim_id: claimIds[0], description: 'Substituição e reparação de caleiras e rufos', category: 'structure', estimated_cost: 4200, approved_cost: 3800, notes: 'Caleiras de zinco nas fachadas norte e este completamente substituídas.' },
    { claim_id: claimIds[0], description: 'Reparação de pladur e pintura interior — quarto principal e corredor', category: 'structure', estimated_cost: 3000, approved_cost: 1900, notes: 'Aprovação parcial — âmbito cosmético reduzido após nova vistoria.' },

    // Sinistro 2 — Incêndio Residencial (submetido)
    { claim_id: claimIds[1], description: 'Reparação estrutural — cozinha, sala de jantar e parede exterior traseira', category: 'structure', estimated_cost: 80000, approved_cost: null, notes: 'Inclui demolição parcial da parede exterior, reconstrução estrutural, revestimento e acabamentos.' },
    { claim_id: claimIds[1], description: 'Limpeza profissional de fumo e fuligem — rés-do-chão e condutas', category: 'contents', estimated_cost: 18000, approved_cost: null, notes: 'Empresa especializada de remediação. Inclui limpeza de condutas de climatização e tratamento de superfícies.' },
    { claim_id: claimIds[1], description: 'Substituição de pavimento de madeira na cozinha', category: 'structure', estimated_cost: 6500, approved_cost: null, notes: 'Soalho de madeira de carvalho equivalente ao original.' },
    { claim_id: claimIds[1], description: 'Substituição de eletrodomésticos e mobiliário de cozinha', category: 'contents', estimated_cost: 12000, approved_cost: null, notes: 'Fogão, exaustor, móveis de cozinha e bancadas destruídos pelo fogo.' },
    { claim_id: claimIds[1], description: 'Subsídio de alojamento temporário — estimativa de 4 meses', category: 'other', estimated_cost: 8000, approved_cost: null, notes: 'Arrendamento temporário durante período de obras. Valor mensal de €2.000 estimado.' },

    // Sinistro 3 — Responsabilidade Civil (disputado)
    { claim_id: claimIds[2], description: 'Despesas médicas — cirurgia ao punho e tratamento do joelho', category: 'other', estimated_cost: 18000, approved_cost: null, notes: 'Inclui cirurgia, internamento, fisioterapia e consultas de seguimento.' },
    { claim_id: claimIds[2], description: 'Incapacidade temporária — baixa médica de 90 dias', category: 'other', estimated_cost: 12000, approved_cost: null, notes: 'Calculado com base no salário mensal declarado. Em litígio.' },
    { claim_id: claimIds[2], description: 'Danos morais e perda de qualidade de vida', category: 'other', estimated_cost: 55000, approved_cost: null, notes: 'Valor reclamado pelo advogado da sinistrada. Contestado.' },

    // Sinistro 4 — Inundação Residencial (vistoriado)
    { claim_id: claimIds[3], description: 'Remediação de inundação — secagem, tratamento de bolores e remoção de pladur', category: 'structure', estimated_cost: 22000, approved_cost: null, notes: 'Remediação completa do rés-do-chão necessária antes da reconstrução. Inclui amostragem microbiológica.' },
    { claim_id: claimIds[3], description: 'Substituição de soalho de madeira massiva — rés-do-chão (85 m²)', category: 'structure', estimated_cost: 12000, approved_cost: null, notes: 'Material equivalente ao original (carvalho 20 mm). Preço inclui materiais e assentamento.' },
    { claim_id: claimIds[3], description: 'Inspeção elétrica e substituição de tomadas e cabos', category: 'structure', estimated_cost: 8000, approved_cost: null, notes: 'Todas as tomadas abaixo da linha de água de 45 cm a substituir. Eletricista certificado DGEG obrigatório.' },
    { claim_id: claimIds[3], description: 'Substituição de unidade de climatização do rés-do-chão', category: 'contents', estimated_cost: 5500, approved_cost: null, notes: 'Unidade interior e exterior de sistema split 12.000 BTU destruídas.' },
    { claim_id: claimIds[3], description: 'Substituição de eletrodomésticos destruídos (frigorífico e máquina de lavar)', category: 'contents', estimated_cost: 2800, approved_cost: null, notes: 'Equipamentos com mais de 5 anos — depreciação aplicada.' },

    // Sinistro 5 — Furto (report_pending)
    { claim_id: claimIds[4], description: 'Televisão 65" Samsung QLED', category: 'contents', estimated_cost: 1200, approved_cost: null, notes: 'Adquirida há 18 meses. Comprovativo de compra apresentado.' },
    { claim_id: claimIds[4], description: 'Portátil gaming ASUS ROG', category: 'contents', estimated_cost: 2400, approved_cost: null, notes: 'Comprado há 8 meses. Fatura apresentada.' },
    { claim_id: claimIds[4], description: 'Câmara fotográfica DSLR Canon + objetivas', category: 'contents', estimated_cost: 1800, approved_cost: null, notes: 'Câmara e três objetivas. Depreciação a calcular.' },
    { claim_id: claimIds[4], description: 'Joalharia diversa', category: 'contents', estimated_cost: 3200, approved_cost: null, notes: 'Avaliação de joalheiro independente obtida. Lista detalhada arquivada.' },
    { claim_id: claimIds[4], description: 'Reparação de janela arrombada', category: 'structure', estimated_cost: 480, approved_cost: null, notes: 'Caixilharia de alumínio e vidro duplo.' },

    // Sinistro 6 — Café Aurora (inspection_scheduled)
    { claim_id: claimIds[5], description: 'Substituição de pavimento de madeira da sala (60 m²)', category: 'structure', estimated_cost: 12000, approved_cost: null, notes: 'Soalho de madeira empenado em 80% da área. Substituição total necessária.' },
    { claim_id: claimIds[5], description: 'Reparação e substituição de tetos falsos', category: 'structure', estimated_cost: 8500, approved_cost: null, notes: 'Três zonas de colapso. Inclui estrutura metálica e painéis acústicos.' },
    { claim_id: claimIds[5], description: 'Reparação de canalização e substituição de tubagem avariada', category: 'structure', estimated_cost: 4200, approved_cost: null, notes: 'Substituição de troço de tubagem de água quente no teto falso.' },
    { claim_id: claimIds[5], description: 'Perda de receita durante encerramento (estimativa 3 semanas)', category: 'other', estimated_cost: 6300, approved_cost: null, notes: 'Faturação média de €2.100/semana verificada com declaração de IRS.' },

    // Sinistro 7 — Auto (assigned)
    { claim_id: claimIds[6], description: 'Substituição de para-brisas', category: 'structure', estimated_cost: 1800, approved_cost: null, notes: 'Para-brisas original BMW com camada de aquecimento. Peça original recomendada.' },
    { claim_id: claimIds[6], description: 'Reparação de capô e tejadilho', category: 'structure', estimated_cost: 7200, approved_cost: null, notes: 'Capô: amolgadelas extensas — substituição. Tejadilho: reparação possível segundo oficina.' },
    { claim_id: claimIds[6], description: 'Pintura exterior (capô, tejadilho e montantes)', category: 'structure', estimated_cost: 2400, approved_cost: null, notes: 'Pintura com laca original BMW. Inclui preparação de superfície.' },
    { claim_id: claimIds[6], description: 'Viatura de substituição durante período de reparação', category: 'other', estimated_cost: 950, approved_cost: null, notes: 'Estimativa de 10 dias × €95/dia.' },

    // Sinistro 9 — Incêndio Comercial (encerrado)
    { claim_id: claimIds[8], description: 'Reconstrução do edifício — pisos 3 e 4 (estrutura, MEP e acabamentos)', category: 'structure', estimated_cost: 220000, approved_cost: 210000, notes: 'Inclui reparações estruturais de betão, instalações de AVAC, eletricidade, canalização e acabamentos interiores.' },
    { claim_id: claimIds[8], description: 'Substituição de conteúdos — sala de servidores e equipamento informático', category: 'contents', estimated_cost: 35000, approved_cost: 32000, notes: 'Servidores, UPS, switches e cablagem. Depreciação de 30% aplicada ao equipamento informático.' },
    { claim_id: claimIds[8], description: 'Substituição de mobiliário de escritório — pisos 3 e 4', category: 'contents', estimated_cost: 18000, approved_cost: 16000, notes: 'Secretárias, cadeiras, armários e mobiliário de reunião. Depreciação média de 15% aplicada.' },
    { claim_id: claimIds[8], description: 'Remediação de água — pisos 1 e 2 (sprinklers)', category: 'structure', estimated_cost: 12000, approved_cost: 12000, notes: 'Secagem, substituição de alcatifas e reparação de tetos falsos afetados pelos sprinklers.' },
    { claim_id: claimIds[8], description: 'Perda por interrupção de atividade — 6 semanas', category: 'other', estimated_cost: 20000, approved_cost: 18000, notes: 'Cobre o período de encerramento parcial verificado com base nos registos financeiros.' },

    // Sinistro 11 — Responsabilidade Civil Supermercado (encerrado)
    { claim_id: claimIds[10], description: 'Despesas médicas — tratamento de ombro e tornozelo', category: 'other', estimated_cost: 6500, approved_cost: 6500, notes: 'Inclui urgência, consultas e fisioterapia de 8 semanas. Faturas verificadas.' },
    { claim_id: claimIds[10], description: 'Incapacidade temporária — 3 semanas de baixa médica', category: 'other', estimated_cost: 1800, approved_cost: 1800, notes: 'Calculado com base no salário declarado.' },
    { claim_id: claimIds[10], description: 'Danos morais', category: 'other', estimated_cost: 5000, approved_cost: 4500, notes: 'Acordo extrajudicial. Valor reduzido por negociação.' },
    { claim_id: claimIds[10], description: 'Honorários de advogado — acordo extrajudicial', category: 'other', estimated_cost: 2000, approved_cost: 2000, notes: 'Honorários acordados para serviços de mediação e negociação.' },

    // Sinistro 12 — Furto Joalharia (submitted)
    { claim_id: claimIds[11], description: 'Joias em ouro e diamantes furtadas — conteúdo de montra 1', category: 'contents', estimated_cost: 82000, approved_cost: null, notes: 'Inventário detalhado com avaliações independentes arquivado. 23 peças.' },
    { claim_id: claimIds[11], description: 'Relógios de marca furtados (Rolex, Omega, TAG Heuer)', category: 'contents', estimated_cost: 54000, approved_cost: null, notes: '8 relógios. Certificados de autenticidade e faturas de compra apresentados.' },
    { claim_id: claimIds[11], description: 'Colares e pulseiras em ouro — montra 2', category: 'contents', estimated_cost: 38000, approved_cost: null, notes: '31 peças. Avaliação por perito joalheiro independente obtida.' },
    { claim_id: claimIds[11], description: 'Dinheiro em cofre furtado', category: 'contents', estimated_cost: 4200, approved_cost: null, notes: 'Fundo de caixa semanal. Confirmado por registos contabilísticos.' },
    { claim_id: claimIds[11], description: 'Reparação de cofre e sistema de segurança', category: 'structure', estimated_cost: 7800, approved_cost: null, notes: 'Cofre arrombado. Sistema de alarme e câmeras danificados.' },

    // Sinistro 13 — Inundação Hotel (vistoriado)
    { claim_id: claimIds[12], description: 'Substituição de revestimentos e tetos — quartos 401-412 (renovação total)', category: 'structure', estimated_cost: 48000, approved_cost: null, notes: '14 quartos com dano total nos acabamentos. €3.428/quarto.' },
    { claim_id: claimIds[12], description: 'Reparação parcial de acabamentos — quartos 301-308 e 201-204', category: 'structure', estimated_cost: 22000, approved_cost: null, notes: '12 quartos com reparação parcial de teto e paredes.' },
    { claim_id: claimIds[12], description: 'Substituição de canalização — pisos 2, 3 e 4', category: 'structure', estimated_cost: 15000, approved_cost: null, notes: 'Substituição preventiva de toda a rede de água quente nos pisos afetados.' },
    { claim_id: claimIds[12], description: 'Substituição de mobiliário de quartos destruído', category: 'contents', estimated_cost: 8500, approved_cost: null, notes: 'Camas, mesas de cabeceira e cadeiras em 6 quartos com dano total no mobiliário.' },
    { claim_id: claimIds[12], description: 'Perda de receita hoteleira — capacidade reduzida 2 semanas', category: 'other', estimated_cost: 14000, approved_cost: null, notes: 'Calculado com base na taxa de ocupação média de 78% e tarifa média de €120/quarto/noite.' },

    // Sinistro 14 — Auto (report_pending)
    { claim_id: claimIds[13], description: 'Reparação de traseira do veículo — para-choques, mala e estrutura', category: 'structure', estimated_cost: 14500, approved_cost: null, notes: 'Orçamento da oficina autorizada Renault. Inclui peças originais e pintura.' },
    { claim_id: claimIds[13], description: 'Tratamento médico — lesões cervicais e lombares', category: 'other', estimated_cost: 8000, approved_cost: null, notes: 'Consultas, TAC, fisioterapia e eventual cirurgia. Relatório médico pendente.' },
    { claim_id: claimIds[13], description: 'Viatura de substituição durante reparação', category: 'other', estimated_cost: 1200, approved_cost: null, notes: 'Estimativa de 15 dias × €80/dia.' },

    // Sinistro 16 — Clínica Dentária (inspection_scheduled)
    { claim_id: claimIds[15], description: 'Reparação de fissuras em paredes e pavimento', category: 'structure', estimated_cost: 5500, approved_cost: null, notes: 'Fissuras em 3 divisões. Tratamento com injeção de resina e reboco.' },
    { claim_id: claimIds[15], description: 'Reabilitação de equipamento odontológico — recalibração e reparação', category: 'contents', estimated_cost: 6200, approved_cost: null, notes: 'Equipamento de imagiologia (OPG e sensor intraoral) a reparar e recalibrar.' },
    { claim_id: claimIds[15], description: 'Substituição de pavimento de porcelana — sala de tratamentos', category: 'structure', estimated_cost: 3800, approved_cost: null, notes: 'Pavimento de precisão desalinhado em 22 m². Substituição total necessária.' },

    // Sinistro 17 — Danos Materiais Residencial (assigned)
    { claim_id: claimIds[16], description: 'Reparação do telhado — substituição de telhas marselha danificadas', category: 'structure', estimated_cost: 5200, approved_cost: null, notes: 'Cerca de 30% da superfície com telhas partidas ou deslocadas. Inclui material e mão de obra.' },
    { claim_id: claimIds[16], description: 'Substituição de caleiras e rufos deformados', category: 'structure', estimated_cost: 2100, approved_cost: null, notes: 'Caleiras de zinco da fachada principal e lateral.' },
    { claim_id: claimIds[16], description: 'Substituição de janela de mansarda (vidro duplo)', category: 'structure', estimated_cost: 1400, approved_cost: null, notes: 'Vidro duplo 4-16-4 partida. Caixilharia de alumínio em bom estado — apenas substituição do vidro.' },

    // Sinistro 18 — Furto Residencial (encerrado)
    { claim_id: claimIds[17], description: 'Portátil Lenovo ThinkPad (não recuperado)', category: 'contents', estimated_cost: 1400, approved_cost: 1150, notes: 'Depreciação de 18% aplicada. Fatura de compra apresentada.' },
    { claim_id: claimIds[17], description: 'Tablet Apple iPad Pro (não recuperado)', category: 'contents', estimated_cost: 900, approved_cost: 780, notes: 'Depreciação de 13% aplicada.' },
    { claim_id: claimIds[17], description: 'Joalharia não recuperada', category: 'contents', estimated_cost: 2200, approved_cost: 2200, notes: 'Avaliação por joalheiro. Recuperação parcial já abatida ao valor.' },
    { claim_id: claimIds[17], description: 'Reparação de janela arrombada', category: 'structure', estimated_cost: 520, approved_cost: 520, notes: 'Substituição de caixilharia e vidro duplo.' },

    // Sinistro 19 — Inundação Armazém (submitted)
    { claim_id: claimIds[18], description: 'Remediação de inundação industrial — secagem e desinfeção (4.800 m²)', category: 'structure', estimated_cost: 45000, approved_cost: null, notes: 'Empresa especializada. Inclui secagem com desumidificadores industriais, desinfeção e remoção de lodo.' },
    { claim_id: claimIds[18], description: 'Substituição de sistema elétrico industrial completo', category: 'structure', estimated_cost: 62000, approved_cost: null, notes: 'Quadros elétricos, cablagem, iluminação e tomadas industriais — instalação completa.' },
    { claim_id: claimIds[18], description: 'Substituição de 3 empilhadores elétricos e plataforma elevatória', category: 'contents', estimated_cost: 78000, approved_cost: null, notes: 'Empilhadores Toyota 1,5T (3 unidades) e plataforma elevatória Jungheinrich. Peritagem independente a confirmar.' },
    { claim_id: claimIds[18], description: 'Reparação de sistema de câmaras frigoríficas', category: 'contents', estimated_cost: 24000, approved_cost: null, notes: 'Compressores, evaporadores e quadro de controlo de 2 câmaras frigoríficas.' },
    { claim_id: claimIds[18], description: 'Stock destruído — mercadoria diversa', category: 'contents', estimated_cost: 180000, approved_cost: null, notes: 'Inventário de 847 SKUs validado por auditoria interna. A confirmar com perito de stocks.' },
    { claim_id: claimIds[18], description: 'Perda de receita — interrupção de atividade logística (4 semanas)', category: 'other', estimated_cost: 38000, approved_cost: null, notes: 'Faturação média semanal de €9.500 verificada. Clientes redirecionados para armazém alternativo.' },
  ]

  for (const item of lineItems) {
    insert.run(item)
  }
}
