import { seedInsurers } from './insurers'
import { seedClaims } from './claims'
import { seedInspections } from './inspections'
import { seedLineItems } from './lineItems'
import { seedClaimComments } from './claimComments'

export async function seed() {
  console.log('[dinaxis] Seeding database...')
  const insurerIds = seedInsurers()
  const claimIds = seedClaims(insurerIds)
  seedInspections(claimIds)
  seedLineItems(claimIds)
  seedClaimComments(claimIds)
  console.log('[dinaxis] Seed complete.')
}
