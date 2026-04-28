import { db } from '../db'

export function seedInspections(claimIds: number[]): void {
  const insert = db.prepare(`
    INSERT INTO inspections (
      claim_id, scheduled_date, completed_date, findings, adjuster_notes, latitude, longitude
    ) VALUES (
      @claim_id, @scheduled_date, @completed_date, @findings, @adjuster_notes, @latitude, @longitude
    )
  `)

  const inspections = [
    // Claim 1 (closed) — completed inspection
    {
      claim_id: claimIds[0],
      scheduled_date: '2024-01-22',
      completed_date: '2024-01-22',
      findings: 'Roof inspection confirmed hail damage across approximately 60% of shingle surface. Gutters dented along north and east elevations. Interior ceiling stain in master bedroom measured 2ft x 3ft, consistent with active leak above. No structural damage to rafters or decking.',
      adjuster_notes: 'Damage consistent with reported storm event. Weather records confirm hail on 2024-01-13.',
      latitude: null,
      longitude: null,
    },
    // Claim 2 (submitted) — completed inspection
    {
      claim_id: claimIds[1],
      scheduled_date: '2024-02-10',
      completed_date: '2024-02-10',
      findings: 'Kitchen and dining area sustained heavy fire and smoke damage. Rear exterior wall charred through to sheathing. First floor smoke damage throughout. HVAC system contaminated with smoke residue.',
      adjuster_notes: 'Fire origin confirmed at range. Spread consistent with report. Structural engineer assessment recommended for rear wall.',
      latitude: null,
      longitude: null,
    },
    // Claim 4 (inspected) — completed inspection with GPS
    {
      claim_id: claimIds[3],
      scheduled_date: '2024-03-12',
      completed_date: '2024-03-12',
      findings: 'Water line visible at 18 inches on all interior ground-floor walls. Hardwood flooring buckled and warped throughout. Drywall saturated up to waterline — mold growth beginning in northeast corner. Electrical outlets below water line require full replacement. HVAC air handler on ground floor destroyed.',
      adjuster_notes: 'Damage consistent with reported flood depth. Recommend mold remediation before any rebuild begins.',
      latitude: 29.9511,
      longitude: -90.0715,
    },
    // Claim 6 (inspection_scheduled) — scheduled, not yet completed
    {
      claim_id: claimIds[5],
      scheduled_date: '2024-05-05',
      completed_date: null,
      findings: '',
      adjuster_notes: 'Inspection booked with commercial assessor. Owner will provide access.',
      latitude: null,
      longitude: null,
    },
  ]

  for (const inspection of inspections) {
    insert.run(inspection)
  }
}
