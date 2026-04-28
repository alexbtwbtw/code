import { db } from '../db'

export function seedClaimExperts(claimIds: number[], expertIds: number[]): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO claim_experts (claim_id, expert_id, role, work_summary)
    VALUES (@claim_id, @expert_id, @role, @work_summary)
  `)

  // expertIds: [0]=Ferreira (Civil), [1]=Mendonça (Incêndios), [2]=Rodrigues (Auto), [3]=Lopes (Patologia), [4]=Baptista (Inundações)
  const [ferreiraId, mendonçaId, rodriguesId, lopesId, baptistaId] = expertIds

  const assignments = [
    // Sinistro 0 — property_damage/closed — Ferreira (estruturas) + Lopes (patologia)
    { claim_id: claimIds[0], expert_id: ferreiraId, role: 'Perito de Estruturas', work_summary: 'Avaliação dos danos estruturais na cobertura e inspecção ao frechal de madeira após queda de árvore. Emitiu relatório técnico que sustentou a aprovação do orçamento de reparação.' },
    { claim_id: claimIds[0], expert_id: lopesId, role: 'Perita de Patologia Construtiva', work_summary: 'Avaliou os danos por humidade na parede e tecto do quarto de casal, confirmando ausência de patologia pré-existente. Recomendou tratamento preventivo anti-humidade no reboco.' },

    // Sinistro 1 — fire/closed — Mendonça (incêndios) + Ferreira (estruturas)
    { claim_id: claimIds[1], expert_id: mendonçaId, role: 'Perita de Incêndios', work_summary: 'Investigou a origem e causa do incêndio na arrecadação traseira. Confirmou curto-circuito no quadro eléctrico como causa provável e excluiu dolo. Elaborou relatório de peritagem de incêndio para instrução do processo judicial.' },
    { claim_id: claimIds[1], expert_id: ferreiraId, role: 'Perito de Estruturas', work_summary: 'Avaliou os danos estruturais nas paredes e tecto da arrecadação. Confirmou que a estrutura do edifício não foi comprometida e que os danos eram limitados ao compartimento de origem.' },

    // Sinistro 2 — liability/closed — Lopes (patologia construtiva — vistoria ao local)
    { claim_id: claimIds[2], expert_id: lopesId, role: 'Perita de Local', work_summary: 'Vistoriou a zona de passagem entre balneários e piscina para avaliar a conformidade do pavimento. Confirmou ausência de tratamento antiderrapante certificado e identificou deficiência no sistema de escoamento de água.' },

    // Sinistro 3 — auto/assigned — Rodrigues (automóvel)
    { claim_id: claimIds[3], expert_id: rodriguesId, role: 'Perito Automóvel', work_summary: 'Avaliou os danos na lateral direita do veículo Toyota Corolla após colisão. Elaborou relatório fotográfico e orçamento de referência para negociação com oficina autorizada.' },

    // Sinistro 4 — flood/assigned — Baptista (inundações)
    { claim_id: claimIds[4], expert_id: baptistaId, role: 'Perito de Inundações', work_summary: 'Avaliou os danos por inundação no rés-do-chão da habitação. Confirmou consistência dos danos com o evento hidrológico de 14-15 de outubro de 2025. Identificou a linha de água a 35 cm nas paredes da cozinha.' },

    // Sinistro 5 — theft/inspection_scheduled — Lopes (avaliação de local de crime)
    { claim_id: claimIds[5], expert_id: lopesId, role: 'Perita de Local', work_summary: 'Convocada para vistoria ao estabelecimento de ourivesaria para avaliar os danos no cofre-forte e sistema de segurança após o assalto. Vistoria agendada.' },

    // Sinistro 6 — property_damage/inspection_scheduled — Ferreira (estruturas) + Lopes (patologia)
    { claim_id: claimIds[6], expert_id: ferreiraId, role: 'Perito de Estruturas', work_summary: 'Convocado para avaliação da cobertura de policarbonato destruída e das claraboias do spa após temporal. Vistoria agendada para semana de 25 de novembro.' },
    { claim_id: claimIds[6], expert_id: lopesId, role: 'Perita de Patologia Construtiva', work_summary: 'Apoio na avaliação técnica das claraboias danificadas e eventual comprometimento da impermeabilização do tecto do spa.' },

    // Sinistro 7 — fire/inspected — Mendonça (incêndios)
    { claim_id: claimIds[7], expert_id: mendonçaId, role: 'Perita de Incêndios', work_summary: 'Realizou vistoria ao local do incêndio na garagem. Confirmou sobrecarga no carregador caseiro do veículo eléctrico como causa. Identificou a extensão exacta dos danos por fogo e fumo. Relatório de peritagem entregue a 12 de dezembro de 2025.' },

    // Sinistro 8 — liability/inspected — Lopes (patologia)
    { claim_id: claimIds[8], expert_id: lopesId, role: 'Perita de Local', work_summary: 'Avaliou o desnível não sinalizado na entrada do supermercado. Confirmou incumprimento da norma de acessibilidade DL 163/2006. Elaborou relatório técnico com evidências fotográficas para instruir o processo de responsabilidade civil.' },

    // Sinistro 9 — flood/inspected — Baptista (inundações) + Ferreira (estruturas)
    { claim_id: claimIds[9], expert_id: baptistaId, role: 'Perito de Inundações', work_summary: 'Vistoriou o armazém industrial após inundação por transbordo do Canal de São Roque. Mapeou a linha de água em todos os sectores do armazém e identificou os equipamentos afectados. Relatório completo com avaliação de danos entregue a 18 de dezembro.' },
    { claim_id: claimIds[9], expert_id: ferreiraId, role: 'Perito de Estruturas', work_summary: 'Avaliou o estado estrutural do armazém após a inundação, confirmando a ausência de danos nas fundações e na estrutura metálica principal. Identificou necessidade de substituição do revestimento de pavimento em 800 m².' },

    // Sinistro 10 — auto/report_pending — Rodrigues (automóvel)
    { claim_id: claimIds[10], expert_id: rodriguesId, role: 'Perito Automóvel', work_summary: 'Avaliou os danos no Peugeot 308 após colisão frontal. Confirmou danos graves na estrutura frontal com possível comprometimento da longarina. Emitiu relatório provisório recomendando avaliação de dano total.' },

    // Sinistro 12 — property_damage/submitted — Ferreira + Lopes
    { claim_id: claimIds[12], expert_id: ferreiraId, role: 'Perito de Estruturas', work_summary: 'Avaliou os danos estruturais causados pela inundação no segundo andar da clínica. Confirmou ausência de comprometimento estrutural e circunscreveu os danos aos revestimentos e equipamentos.' },
    { claim_id: claimIds[12], expert_id: lopesId, role: 'Perita de Patologia Construtiva', work_summary: 'Avaliou os danos no tecto falso, paredes e pavimento dos espaços inundados. Identificou necessidade de remediação de humidade antes da reconstrução dos tectos.' },

    // Sinistro 13 — fire/submitted — Mendonça (incêndios)
    { claim_id: claimIds[13], expert_id: mendonçaId, role: 'Perita de Incêndios', work_summary: 'Realizou vistoria ao apartamento incendiado no Porto. Confirmou vela acesa como causa de ignição e excluiu dolo ou negligência grave. Relatório técnico entregue e incluído na documentação submetida à Tranquilidade.' },

    // Sinistro 14 — auto/submitted — Rodrigues (automóvel)
    { claim_id: claimIds[14], expert_id: rodriguesId, role: 'Perito Automóvel', work_summary: 'Peritou o camião Mercedes Actros danificado na A1. Avaliou os danos na frente, travessia e chassis. Emitiu relatório de avaliação de dano total com valor de referência para negociação com a seguradora.' },

    // Sinistro 18 — flood/disputed — Baptista + Ferreira
    { claim_id: claimIds[18], expert_id: baptistaId, role: 'Perito de Inundações e Hidrologia', work_summary: 'Perito nomeado pela empresa para avaliar a correlação entre o evento meteorológico de 25 de Janeiro de 2026 e a inundação do empreendimento. Elaborou relatório hidrológico que sustenta a posição da empresa segurada.' },
    { claim_id: claimIds[18], expert_id: ferreiraId, role: 'Perito de Estruturas — Contraditório', work_summary: 'Perito nomeado pela seguradora para avaliação independente do sistema de drenagem do empreendimento. Identificou deficiências no dimensionamento das valas de drenagem perimetral em relação ao projecto aprovado.' },
  ]

  for (const a of assignments) {
    insert.run(a)
  }
}
