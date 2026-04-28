import { db } from '../db'

export function seedClaimComments(claimIds: number[]): void {
  const insert = db.prepare(`
    INSERT INTO claim_comments (id, claim_id, text, created_at)
    VALUES (@id, @claim_id, @text, @created_at)
  `)

  const comments = [
    // Claim 1 (closed)
    {
      id: crypto.randomUUID(),
      claim_id: claimIds[0],
      text: 'Initial contact made with claimant. Scheduled inspection for next Tuesday.',
      created_at: '2024-01-15T14:32:00',
    },
    {
      id: crypto.randomUUID(),
      claim_id: claimIds[0],
      text: 'Inspection complete. Roof damage consistent with reported hail storm.',
      created_at: '2024-01-22T16:45:00',
    },
    {
      id: crypto.randomUUID(),
      claim_id: claimIds[0],
      text: 'Settlement agreed. Closing file.',
      created_at: '2024-03-20T10:15:00',
    },

    // Claim 3 (disputed)
    {
      id: crypto.randomUUID(),
      claim_id: claimIds[2],
      text: 'Liability disputed by property owner — reviewing CCTV footage.',
      created_at: '2024-02-20T09:10:00',
    },
    {
      id: crypto.randomUUID(),
      claim_id: claimIds[2],
      text: 'Legal hold placed on file. Awaiting attorney correspondence.',
      created_at: '2024-03-05T11:30:00',
    },

    // Claim 4 (inspected)
    {
      id: crypto.randomUUID(),
      claim_id: claimIds[3],
      text: 'Flood damage extensive — water line visible at 18 inches on interior walls.',
      created_at: '2024-03-12T15:20:00',
    },
    {
      id: crypto.randomUUID(),
      claim_id: claimIds[3],
      text: 'Contractor estimates received. Two quotes within range.',
      created_at: '2024-03-25T13:55:00',
    },
  ]

  for (const comment of comments) {
    insert.run(comment)
  }
}
