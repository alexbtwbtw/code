import { seedInsurers } from './insurers'
import { seedClaims } from './claims'
import { seedExperts } from './experts'
import { seedClaimExperts } from './claimExperts'
import { seedInspections } from './inspections'
import { seedLineItems } from './lineItems'
import { seedClaimComments } from './claimComments'
import { seedDocuments } from './documents'
import { seedInvoices } from './invoices'

export async function seed() {
  console.log('[dinaxis] Seeding database...')
  const insurerIds = seedInsurers()
  const { claimIds, claimNumbers } = seedClaims(insurerIds)
  const expertIds = seedExperts()
  seedClaimExperts(claimIds, expertIds)
  seedInspections(claimIds, expertIds)
  const { lineItemIdsByClaimIdx, billingItemIdsByClaimIdx } = seedLineItems(claimIds)
  seedClaimComments(claimIds)
  await seedDocuments(claimIds, claimNumbers)
  await seedInvoices(claimIds, lineItemIdsByClaimIdx, billingItemIdsByClaimIdx)
  console.log('[dinaxis] Seed complete.')
}
