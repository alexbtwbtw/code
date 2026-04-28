import { db } from '../db'

export function seedLineItems(claimIds: number[]): void {
  const insert = db.prepare(`
    INSERT INTO line_items (claim_id, description, category, estimated_cost, approved_cost, notes)
    VALUES (@claim_id, @description, @category, @estimated_cost, @approved_cost, @notes)
  `)

  const lineItems = [
    // Claim 1 — property damage (closed)
    {
      claim_id: claimIds[0],
      description: 'Roof repair — shingle replacement and flashing',
      category: 'structure',
      estimated_cost: 8500,
      approved_cost: 7800,
      notes: 'Licensed roofing contractor. Includes materials and labor.',
    },
    {
      claim_id: claimIds[0],
      description: 'Water damage remediation — master bedroom ceiling',
      category: 'structure',
      estimated_cost: 7000,
      approved_cost: 6500,
      notes: 'Includes drying, mold inspection, and ceiling replacement.',
    },
    {
      claim_id: claimIds[0],
      description: 'Interior drywall and paint repair',
      category: 'structure',
      estimated_cost: 3000,
      approved_cost: 1900,
      notes: 'Partial approval — cosmetic scope reduced after re-inspection.',
    },

    // Claim 2 — fire (submitted)
    {
      claim_id: claimIds[1],
      description: 'Structural fire damage repair — kitchen and dining',
      category: 'structure',
      estimated_cost: 80000,
      approved_cost: null,
      notes: 'Includes framing, sheathing, and exterior wall rebuild.',
    },
    {
      claim_id: claimIds[1],
      description: 'Smoke and soot cleanup throughout first floor',
      category: 'contents',
      estimated_cost: 18000,
      approved_cost: null,
      notes: 'Professional remediation company required. HVAC duct cleaning included.',
    },
    {
      claim_id: claimIds[1],
      description: 'Temporary housing allowance',
      category: 'other',
      estimated_cost: 26000,
      approved_cost: null,
      notes: 'Estimated 3-month displacement at $8,667/month.',
    },

    // Claim 4 — flood (inspected)
    {
      claim_id: claimIds[3],
      description: 'Flood remediation — drying, mold treatment, drywall removal',
      category: 'structure',
      estimated_cost: 22000,
      approved_cost: null,
      notes: 'Full ground-floor remediation required before rebuild.',
    },
    {
      claim_id: claimIds[3],
      description: 'Flooring replacement — ground floor',
      category: 'structure',
      estimated_cost: 12000,
      approved_cost: null,
      notes: 'Hardwood floor destroyed. Replacement with equivalent material.',
    },
    {
      claim_id: claimIds[3],
      description: 'Electrical inspection and outlet replacement',
      category: 'structure',
      estimated_cost: 8000,
      approved_cost: null,
      notes: 'All outlets below 18-inch waterline to be replaced. Licensed electrician required.',
    },

    // Claim 9 — fire (closed)
    {
      claim_id: claimIds[8],
      description: 'Building reconstruction — floors 3 and 4',
      category: 'structure',
      estimated_cost: 220000,
      approved_cost: 210000,
      notes: 'Includes structural repairs, MEP systems, and interior finishes.',
    },
    {
      claim_id: claimIds[8],
      description: 'Contents replacement — server room and offices',
      category: 'contents',
      estimated_cost: 35000,
      approved_cost: 32000,
      notes: 'IT equipment, furniture, and fixtures. Depreciation applied.',
    },
    {
      claim_id: claimIds[8],
      description: 'Business interruption loss',
      category: 'other',
      estimated_cost: 20000,
      approved_cost: 18000,
      notes: 'Covers 6-week closure period. Verified against financial records.',
    },
  ]

  for (const item of lineItems) {
    insert.run(item)
  }
}
