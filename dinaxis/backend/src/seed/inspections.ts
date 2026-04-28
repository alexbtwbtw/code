import { db } from '../db'

export function seedInspections(claimIds: number[], expertIds: number[]): void {
  const insert = db.prepare(`
    INSERT INTO inspections (
      claim_id, scheduled_date, completed_date, findings, adjuster_notes, latitude, longitude, expert_id
    ) VALUES (
      @claim_id, @scheduled_date, @completed_date, @findings, @adjuster_notes, @latitude, @longitude, @expert_id
    )
  `)

  // expertIds: [0]=Ferreira (Civil), [1]=Mendonça (Incêndios), [2]=Rodrigues (Auto), [3]=Lopes (Patologia), [4]=Baptista (Inundações)
  const [ferreiraId, mendonçaId, rodriguesId, lopesId, baptistaId] = expertIds

  const inspections = [
    // Sinistro 0 — Danos Materiais / closed — 2 vistorias
    {
      claim_id: claimIds[0],
      scheduled_date: '2025-09-10',
      completed_date: '2025-09-10',
      findings: 'Vistoria à cobertura após queda de árvore. Identificadas três fiadas de telha cerâmica partida ou deslocada na vertente sul, numa área total aproximada de 18 m². O frechal de madeira apresenta deformação plástica num comprimento de 2,4 metros — substitição necessária. Mancha de humidade activa no tecto do quarto de casal com dimensão de 55 × 70 cm. Vedação de alvenaria destruída em 8 metros lineares. Sem danos nas asnas da cobertura.',
      adjuster_notes: 'Danos totalmente consistentes com a queda de árvore reportada em 2 de setembro de 2025. Relatório meteorológico do IPMA confirma vento com rajadas de 95 km/h na região de Setúbal. Recomendada substituição imediata das telhas e do frechal antes das próximas chuvas. Dois orçamentos solicitados a empreiteiros de coberturas certificados.',
      latitude: 38.5244,
      longitude: -8.8890,
      expert_id: ferreiraId,
    },
    {
      claim_id: claimIds[0],
      scheduled_date: '2025-10-15',
      completed_date: '2025-10-15',
      findings: 'Segunda vistoria após reparação da cobertura. Telhas e frechal substituídos pelo empreiteiro contratado. Inspeção visual confirma cobertura estanque — sem infiltrações activas. Mancha de humidade no tecto do quarto de casal seca e em processo de remediação. Vedação reconstruída em alvenaria de tijolo rebocado. Trabalhos de pintura do quarto a decorrer.',
      adjuster_notes: 'Segunda vistoria confirma trabalhos de reparação da cobertura e vedação concluídos conforme o orçamento aprovado. Recomendo aprovação do pagamento ao empreiteiro. Trabalhos de acabamento interior (pintura) a finalizar. Processo pode avançar para regularização.',
      latitude: 38.5244,
      longitude: -8.8890,
      expert_id: ferreiraId,
    },

    // Sinistro 1 — Incêndio / closed — 2 vistorias
    {
      claim_id: claimIds[1],
      scheduled_date: '2025-09-18',
      completed_date: '2025-09-18',
      findings: 'Arrecadação traseira completamente destruída pelo fogo — paredes e tecto com marcas de carbonização. Foco de incêndio identificado no quadro eléctrico de distribuição de baixa tensão na parede norte da arrecadação. Propagação para a zona de armazém através da porta de comunicação. Área de venda com danos extensos por fumo e fuligem — tecto, paredes e mobiliário afectados. Sistema de sprinklers activou e causou danos adicionais por água em 40% da área de venda.',
      adjuster_notes: 'Perita Dra. Carla Mendonça confirmou curto-circuito no quadro eléctrico de distribuição como causa do incêndio. Excluiu dolo. Relatório dos Bombeiros de Lisboa obtido e arquivado. Recomendo avaliação estrutural do tecto da arrecadação e do armazém antes de qualquer obra.',
      latitude: 38.7169,
      longitude: -9.1399,
      expert_id: mendonçaId,
    },
    {
      claim_id: claimIds[1],
      scheduled_date: '2025-10-22',
      completed_date: '2025-10-22',
      findings: 'Segunda vistoria com engenheiro de estruturas. Tectos da arrecadação e do armazém confirmados como estruturalmente comprometidos — demolição e reconstrução necessárias. Estrutura do edifício (laje e pilares) sem danos. Inventário de stock destruído concluído em conjunto com técnico de contabilidade da empresa. Área de venda: danos por fumo mais extensos do que o estimado — 3 peças de mobiliário de exposição de alto valor irrecuperáveis.',
      adjuster_notes: 'Segunda vistoria permite fechar o âmbito total dos danos. Orçamento de reconstrução integral aprovado após revisão com Tranquilidade. Inventário de conteúdos validado. Processo a avançar para submissão final.',
      latitude: 38.7169,
      longitude: -9.1399,
      expert_id: mendonçaId,
    },

    // Sinistro 2 — Responsabilidade Civil / closed — 1 vistoria
    {
      claim_id: claimIds[2],
      scheduled_date: '2025-09-26',
      completed_date: '2025-09-26',
      findings: 'Vistoria à zona de passagem entre balneários e piscina. Pavimento de mosaico cerâmico sem tratamento antiderrapante certificado na área de transição balneários–piscina (8 m²). Sistema de escoamento de água com grelha parcialmente entupida — acumulação de água visível. Câmeras de vigilância revisitadas: confirmam que na hora do acidente não havia tapete antiderrapante nem sinalização de piso molhado.',
      adjuster_notes: 'Responsabilidade do ginásio claramente demonstrada. Pavimento não conforme com a Norma NP EN 13845 para espaços molhados de uso público. Recomendo acordo extrajudicial. Relatório técnico da Arq. Sofia Lopes formaliza a não-conformidade.',
      latitude: 38.7297,
      longitude: -9.1393,
      expert_id: lopesId,
    },

    // Sinistro 3 — Auto / assigned — 1 vistoria
    {
      claim_id: claimIds[3],
      scheduled_date: '2025-10-10',
      completed_date: '2025-10-10',
      findings: 'Vistoria ao veículo Toyota Corolla na oficina autorizada Toyota de Cascais. Porta dianteira direita: deformação plástica no painel exterior e estrutura interna do reforço de porta comprometida — substituição necessária. Porta traseira direita: amolgadela com lascagem de pintura — reparação possível. Jante traseira direita rachada — substituição obrigatória. Pneu traseiro direito rebentado. Retrovisor exterior direito partido. Estrutura do tejadilho e do pilar B sem danos.',
      adjuster_notes: 'Perito Eng. Paulo Rodrigues confirmou que os danos são consistentes com colisão lateral de impacto moderado. Estimativa de reparação da oficina: €17.800. Dentro do esperado para os danos observados. Aguarda orçamento final para aprovação.',
      latitude: 38.6963,
      longitude: -9.4220,
      expert_id: rodriguesId,
    },

    // Sinistro 4 — Inundação / assigned — 1 vistoria
    {
      claim_id: claimIds[4],
      scheduled_date: '2025-10-28',
      completed_date: '2025-10-28',
      findings: 'Vistoria ao rés-do-chão da habitação após inundação. Linha de água visível a 35 cm em todas as paredes interiores do rés-do-chão — marcas de lodo confirmatórias. Pavimento de mosaico cerâmico: juntas abertas, placas soltas em 40% da área da sala. Paredes de reboco saturadas até à linha de água — início de destacamento. Tecto falso da cozinha com deformação por acumulação de água — risco de colapso. Tomadas eléctricas abaixo da linha de água a 35 cm requerem substituição por electricista certificado DGEG.',
      adjuster_notes: 'Eng. Rui Baptista confirmou danos totalmente consistentes com inundação por transbordo da Vala de Quiaios no evento de 14-15 de outubro. Relatório hidrológico do LNEC referente ao evento obtido. Recomendo substituição do tecto falso da cozinha com carácter urgente para evitar colapso.',
      latitude: 40.1511,
      longitude: -8.8599,
      expert_id: baptistaId,
    },

    // Sinistro 5 — Furto / inspection_scheduled — agendada
    {
      claim_id: claimIds[5],
      scheduled_date: '2025-11-12',
      completed_date: null,
      findings: '',
      adjuster_notes: 'Vistoria agendada com perito de joalharia para avaliação do local e determinação do stock furtado. PJ autorizou acesso ao local após conclusão da recolha de vestígios. Proprietário disponibilizará inventário de stock actualizado para confronto com o que foi furtado.',
      latitude: null,
      longitude: null,
      expert_id: lopesId,
    },

    // Sinistro 6 — property_damage hotel / inspection_scheduled — agendada
    {
      claim_id: claimIds[6],
      scheduled_date: '2025-11-25',
      completed_date: null,
      findings: '',
      adjuster_notes: 'Vistoria técnica agendada com Eng. António Ferreira para avaliação da cobertura de policarbonato destruída e das claraboias do spa. Prevista deslocação ao local com engenheiro especialista em coberturas comerciais. Hotel disponibilizará acesso às coberturas e documentação do projecto original.',
      latitude: null,
      longitude: null,
      expert_id: ferreiraId,
    },

    // Sinistro 7 — Incêndio / inspected — 1 vistoria
    {
      claim_id: claimIds[7],
      scheduled_date: '2025-12-05',
      completed_date: '2025-12-05',
      findings: 'Vistoria à garagem e arrumos após incêndio. Garagem com marcas de carbonização em todas as paredes até 1,8 m de altura. Automóvel sinistrado completamente destruído — carroçaria fundida e motor irrecuperável. Parede de separação garagem/corredor com danos estruturais: betão da laje com fissuração por choque térmico em área de 2,4 m². Arrumos: prateleiras metálicas deformadas, conteúdos destruídos. Hall de entrada: fuligem e fumo nas paredes e tecto. Sala adjacente: fumo superficial, sem danos profundos.',
      adjuster_notes: 'Dra. Carla Mendonça confirmou origem na extensão do carregador caseiro não certificado do veículo eléctrico. Danos estruturais na parede de separação requerem intervenção de engenheiro de estruturas antes das obras. Automóvel: perda total confirmada. Relatório de peritagem de incêndio entregue a 12 de dezembro de 2025.',
      latitude: 41.5518,
      longitude: -8.4267,
      expert_id: mendonçaId,
    },

    // Sinistro 8 — Responsabilidade Civil / inspected — 1 vistoria
    {
      claim_id: claimIds[8],
      scheduled_date: '2025-12-08',
      completed_date: '2025-12-08',
      findings: 'Vistoria ao local do acidente na entrada do supermercado. Desnível de 4 cm entre o pavimento exterior do passeio e o interior da loja, sem qualquer sinalização ou rampa de acesso. Incumprimento evidente do DL 163/2006 (acessibilidade) e das normas de segurança de espaços comerciais. Pavimento interior: cerâmica vidrada sem propriedades antiderrapantes na zona de transição exterior/interior. Câmera de vigilância da entrada analisada: confirma ausência de qualquer sinalização no momento do acidente.',
      adjuster_notes: 'Arq. Sofia Lopes confirmou não-conformidade grave com as normas de acessibilidade e segurança. Responsabilidade do estabelecimento inequívoca. Recomendo proposta de acordo extrajudicial imediata para minimizar exposição.',
      latitude: 38.7563,
      longitude: -9.2546,
      expert_id: lopesId,
    },

    // Sinistro 9 — Inundação industrial / inspected — 2 vistorias
    {
      claim_id: claimIds[9],
      scheduled_date: '2025-12-15',
      completed_date: '2025-12-15',
      findings: 'Vistoria inicial ao armazém industrial após inundação. Linha de água visível a 80 cm em toda a extensão do armazém (3.200 m²). Stock paletizado destruído em 70% das posições — mercadoria molhada e lodo depositado nas paletes. Sistema eléctrico completamente inutilizado: quadros de distribuição submersos, cablagem danificada, iluminação e tomadas industriais fora de serviço. Duas linhas de paletização automática com tapetes e motores avariados. Um empilhador eléctrico com motor e baterias submersos — irrecuperável. Escritórios do piso térreo: mobiliário, equipamento informático e arquivo destruídos. Estrutura metálica do armazém sem danos.',
      adjuster_notes: 'Eng. Rui Baptista confirmou correlação directa com o transbordo do Canal de São Roque no evento de 7-8 de Dezembro de 2025. Evento meteorológico excepcional confirmado pelo IPMA. Sinistro de grande escala — recomendo peritagem independente de cada categoria de dano antes da aprovação dos valores.',
      latitude: 40.6382,
      longitude: -8.6536,
      expert_id: baptistaId,
    },
    {
      claim_id: claimIds[9],
      scheduled_date: '2026-01-08',
      completed_date: '2026-01-08',
      findings: 'Segunda vistoria após secagem e avaliação estrutural. Engenheiro de estruturas confirmou ausência de danos na estrutura metálica e nas fundações. Pavimento de betão com fissuração superficial em 200 m² — reparação possível. Inventário de stock destruído validado com auditoria ao WMS da empresa: 1.240 SKUs destruídos. Orçamentos de dois empreiteiros industriais recebidos. Equipamento de paletização: relatório técnico do fabricante confirma substituição total necessária.',
      adjuster_notes: 'Segunda vistoria permite fechar o âmbito total dos danos. Todos os valores dentro do esperado. Processo pronto para submissão à Fidelidade Seguros. Recomendo aprovação do orçamento mais baixo para a remediação e reconstrução.',
      latitude: 40.6382,
      longitude: -8.6536,
      expert_id: ferreiraId,
    },

    // Sinistro 12 — Danos Materiais / submitted (clínica) — 1 vistoria
    {
      claim_id: claimIds[12],
      scheduled_date: '2026-01-17',
      completed_date: '2026-01-17',
      findings: 'Vistoria ao segundo andar da clínica após inundação por rebentamento de tubagem. Tecto falso do consultório de dermatologia completamente destruído em 55 m² — painéis de gesso saturados e colapsados. Paredes com infiltrações até 1,2 m de altura. Laborátorio de análises: bancadas e equipamento de laboratório completamente molhados. Corredor e recepção do piso 1: manchas de humidade no tecto, sem colapso de tecto falso. Pavimento vinílico do consultório e do laboratório com levantamento em 80% da área.',
      adjuster_notes: 'Eng. António Ferreira confirmou que não há danos estruturais — apenas danos de revestimento e equipamento. Arq. Sofia Lopes recomendou secagem completa do tecto do piso 1 antes de qualquer obra de reconstrução para evitar desenvolvimento de bolores. Orçamentos de dois empreiteiros de clínicas solicitados.',
      latitude: 38.7223,
      longitude: -9.1491,
      expert_id: ferreiraId,
    },

    // Sinistro 13 — Incêndio / submitted — 1 vistoria
    {
      claim_id: claimIds[13],
      scheduled_date: '2026-01-29',
      completed_date: '2026-01-29',
      findings: 'Vistoria ao apartamento do Porto após incêndio. Cozinha: móveis de cozinha completamente destruídos pelo fogo, pavimento de cerâmica com marcas de queimadura, tecto com fuligem intensa. Sala de jantar: tecto e paredes com fuligem profunda, dois painéis de parede com chamuscamento superficial. Corredor: fuligem moderada nas paredes e tecto. Quartos: fuligem superficial — limpeza profissional suficiente. Estrutura do apartamento (paredes e laje) sem danos.',
      adjuster_notes: 'Dra. Carla Mendonça confirmou vela acesa como causa de ignição e excluiu dolo ou incêndio intencional. Relatório dos Bombeiros Sapadores do Porto obtido e arquivado. Reconstrução da cozinha e remediação de fumo em todo o apartamento recomendadas. Processo submetido com documentação completa.',
      latitude: 41.1579,
      longitude: -8.6291,
      expert_id: mendonçaId,
    },

    // Sinistro 14 — Auto / submitted — 1 vistoria
    {
      claim_id: claimIds[14],
      scheduled_date: '2026-02-06',
      completed_date: '2026-02-06',
      findings: 'Vistoria ao camião Mercedes Actros na oficina de camiões em Alenquer. Frente completamente destruída: para-choques, grades e capô inutilizáveis. Pneus dianteiros rebentados. Travessia dianteira partida em dois pontos. Chassis com deformação plástica de 12 cm junto ao eixo dianteiro. Motor aparentemente sem danos directos mas a confirmar após remoção de componentes da frente. Cabine sem danos estruturais — portas funcionam e vidros intactos. Condição de dano total técnico confirmada.',
      adjuster_notes: 'Eng. Paulo Rodrigues avaliou os danos e confirmou dano total técnico: custo de reparação estimado em €38.000, superior ao valor venal do veículo (€41.000 com depreciação de 15%). Recomendo avaliação de dano total com proposta de indemnização pela diferença. Processo submetido à Allianz com relatório completo.',
      latitude: 39.0636,
      longitude: -9.0183,
      expert_id: rodriguesId,
    },

    // Sinistro 18 — Inundação / disputed — 1 vistoria
    {
      claim_id: claimIds[18],
      scheduled_date: '2026-02-05',
      completed_date: '2026-02-05',
      findings: 'Vistoria ao empreendimento de turismo rural no Alentejo Litoral após inundação. Oito unidades de alojamento com inundação de água e lamas entre 20 e 50 cm. Pavimentos, paredes, mobiliário e equipamentos de cozinha destruídos nas unidades afectadas. Pavilhão central inundado — piso de madeira irrecuperável em 180 m². Sistema de drenagem perimetral: valas com secção insuficiente para o caudal do evento de 25 de Janeiro. O perito da empresa (Eng. Baptista) e o perito da seguradora (Eng. Ferreira) apresentam interpretações divergentes sobre a causa principal da inundação.',
      adjuster_notes: 'Vistoria conjunta realizada com peritos das duas partes. Divergência técnica confirmada: Eng. Baptista (empresa) defende que o evento meteorológico foi excepcional e superior à capacidade de qualquer sistema de drenagem; Eng. Ferreira (seguradora) identificou subdimensionamento das valas em relação ao projecto aprovado. Processo em análise jurídica. Mediação agendada para maio de 2026.',
      latitude: 37.5986,
      longitude: -8.6536,
      expert_id: baptistaId,
    },
  ]

  for (const inspection of inspections) {
    insert.run(inspection)
  }
}
