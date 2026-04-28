import { db } from '../db'

export function seedClaimComments(claimIds: number[]): void {
  const insert = db.prepare(`
    INSERT INTO claim_comments (id, claim_id, text, created_at)
    VALUES (@id, @claim_id, @text, @created_at)
  `)

  const comments = [
    // Sinistro 1 (encerrado)
    {
      id: crypto.randomUUID(),
      claim_id: claimIds[0],
      text: 'Contacto inicial estabelecido com o sinistrado. Vistoria agendada para a próxima terça-feira.',
      created_at: '2024-01-15T14:32:00',
    },
    {
      id: crypto.randomUUID(),
      claim_id: claimIds[0],
      text: 'Vistoria concluída. Danos no telhado consistentes com a tempestade de granizo reportada.',
      created_at: '2024-01-22T16:45:00',
    },
    {
      id: crypto.randomUUID(),
      claim_id: claimIds[0],
      text: 'Indemnização acordada. Processo encerrado.',
      created_at: '2024-03-20T10:15:00',
    },

    // Sinistro 3 (em litígio)
    {
      id: crypto.randomUUID(),
      claim_id: claimIds[2],
      text: 'Responsabilidade contestada pelo proprietário do imóvel — a analisar imagens de videovigilância.',
      created_at: '2024-02-20T09:10:00',
    },
    {
      id: crypto.randomUUID(),
      claim_id: claimIds[2],
      text: 'Suspensão legal aplicada ao processo. Aguarda correspondência do advogado.',
      created_at: '2024-03-05T11:30:00',
    },

    // Sinistro 4 (vistoriado)
    {
      id: crypto.randomUUID(),
      claim_id: claimIds[3],
      text: 'Danos por inundação extensos — linha de água visível a 45 centímetros nas paredes interiores.',
      created_at: '2024-03-12T15:20:00',
    },
    {
      id: crypto.randomUUID(),
      claim_id: claimIds[3],
      text: 'Orçamentos de empreiteiro recebidos. Dois orçamentos dentro do intervalo esperado.',
      created_at: '2024-03-25T13:55:00',
    },
  ]

  for (const comment of comments) {
    insert.run(comment)
  }
}
