import { db } from '../db'

export function seedLineItems(claimIds: number[]): void {
  const insert = db.prepare(`
    INSERT INTO line_items (claim_id, description, category, estimated_cost, approved_cost, notes)
    VALUES (@claim_id, @description, @category, @estimated_cost, @approved_cost, @notes)
  `)

  const lineItems = [
    // Sinistro 1 — danos materiais (encerrado)
    {
      claim_id: claimIds[0],
      description: 'Reparação do telhado — substituição de telhas e remate de chaminé',
      category: 'structure',
      estimated_cost: 8500,
      approved_cost: 7800,
      notes: 'Empreiteiro de coberturas certificado. Inclui materiais e mão de obra.',
    },
    {
      claim_id: claimIds[0],
      description: 'Remediação de danos por água — teto do quarto principal',
      category: 'structure',
      estimated_cost: 7000,
      approved_cost: 6500,
      notes: 'Inclui secagem, inspeção de bolores e substituição do teto.',
    },
    {
      claim_id: claimIds[0],
      description: 'Reparação de pladur e pintura interiores',
      category: 'structure',
      estimated_cost: 3000,
      approved_cost: 1900,
      notes: 'Aprovação parcial — âmbito cosmético reduzido após nova vistoria.',
    },

    // Sinistro 2 — incêndio (submetido)
    {
      claim_id: claimIds[1],
      description: 'Reparação estrutural de danos por incêndio — cozinha e sala de jantar',
      category: 'structure',
      estimated_cost: 80000,
      approved_cost: null,
      notes: 'Inclui estrutura, revestimento e reconstrução da parede exterior.',
    },
    {
      claim_id: claimIds[1],
      description: 'Limpeza de fumo e fuligem em todo o rés-do-chão',
      category: 'contents',
      estimated_cost: 18000,
      approved_cost: null,
      notes: 'Empresa de remediação profissional necessária. Inclui limpeza de condutas de climatização.',
    },
    {
      claim_id: claimIds[1],
      description: 'Subsídio de alojamento temporário',
      category: 'other',
      estimated_cost: 26000,
      approved_cost: null,
      notes: 'Estimativa de 3 meses de deslocação a €8.667/mês.',
    },

    // Sinistro 4 — inundação (vistoriado)
    {
      claim_id: claimIds[3],
      description: 'Remediação de inundação — secagem, tratamento de bolores e remoção de pladur',
      category: 'structure',
      estimated_cost: 22000,
      approved_cost: null,
      notes: 'Remediação completa do rés-do-chão necessária antes da reconstrução.',
    },
    {
      claim_id: claimIds[3],
      description: 'Substituição de pavimento — rés-do-chão',
      category: 'structure',
      estimated_cost: 12000,
      approved_cost: null,
      notes: 'Soalho de madeira destruído. Substituição por material equivalente.',
    },
    {
      claim_id: claimIds[3],
      description: 'Inspeção elétrica e substituição de tomadas',
      category: 'structure',
      estimated_cost: 8000,
      approved_cost: null,
      notes: 'Todas as tomadas abaixo da linha de água de 45 cm a substituir. Eletricista certificado obrigatório.',
    },

    // Sinistro 9 — incêndio (encerrado)
    {
      claim_id: claimIds[8],
      description: 'Reconstrução do edifício — pisos 3 e 4',
      category: 'structure',
      estimated_cost: 220000,
      approved_cost: 210000,
      notes: 'Inclui reparações estruturais, instalações MEP e acabamentos interiores.',
    },
    {
      claim_id: claimIds[8],
      description: 'Substituição de conteúdos — sala de servidores e escritórios',
      category: 'contents',
      estimated_cost: 35000,
      approved_cost: 32000,
      notes: 'Equipamentos informáticos, mobiliário e instalações. Depreciação aplicada.',
    },
    {
      claim_id: claimIds[8],
      description: 'Perda por interrupção de atividade',
      category: 'other',
      estimated_cost: 20000,
      approved_cost: 18000,
      notes: 'Cobre o período de encerramento de 6 semanas. Verificado com base em registos financeiros.',
    },
  ]

  for (const item of lineItems) {
    insert.run(item)
  }
}
