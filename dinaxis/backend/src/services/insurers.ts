import { z } from 'zod'
import { db } from '../db'
import { logAudit } from '../lib/audit'
import { Insurer, RawInsurer, mapInsurer, InsurerContact, RawInsurerContact, mapInsurerContact } from '../types/insurers'
import { createInsurerSchema, updateInsurerSchema, createInsurerContactSchema, updateInsurerContactSchema } from '../schemas/insurers'

export function getContactsByInsurerId(insurerId: number): InsurerContact[] {
  const rows = db
    .prepare('SELECT * FROM insurer_contacts WHERE insurer_id = ? ORDER BY is_primary DESC, created_at ASC')
    .all(insurerId) as RawInsurerContact[]
  return rows.map(mapInsurerContact)
}

export function listInsurers(): Insurer[] {
  const rows = db.prepare('SELECT * FROM insurers ORDER BY name ASC').all() as RawInsurer[]
  const insurers = rows.map(mapInsurer)
  for (const ins of insurers) {
    ins.contacts = getContactsByInsurerId(ins.id)
  }
  return insurers
}

export function getInsurerById(id: number): Insurer | null {
  const row = db.prepare('SELECT * FROM insurers WHERE id = ?').get(id) as RawInsurer | undefined
  if (!row) return null
  const insurer = mapInsurer(row)
  insurer.contacts = getContactsByInsurerId(insurer.id)
  return insurer
}

export function createInsurer(input: z.infer<typeof createInsurerSchema>): Insurer {
  const result = db
    .prepare(
      `INSERT INTO insurers (name, contact_name, email, phone, address, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.name,
      input.contactName,
      input.email,
      input.phone,
      input.address,
      input.notes,
    )
  const row = db
    .prepare('SELECT * FROM insurers WHERE id = ?')
    .get(result.lastInsertRowid) as RawInsurer
  const insurer = mapInsurer(row)
  insurer.contacts = []
  logAudit('CREATE', 'insurer', insurer.id, { name: input.name })
  return insurer
}

export function updateInsurer(
  id: number,
  input: z.infer<typeof updateInsurerSchema>,
): Insurer | null {
  const fieldMap: Record<string, string> = {
    name: 'name',
    contactName: 'contact_name',
    email: 'email',
    phone: 'phone',
    address: 'address',
    notes: 'notes',
  }

  const setClauses: string[] = []
  const values: unknown[] = []

  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in input) {
      setClauses.push(`${col} = ?`)
      values.push(input[key as keyof typeof input])
    }
  }

  if (setClauses.length === 0) {
    return getInsurerById(id)
  }

  setClauses.push("updated_at = datetime('now')")
  values.push(id)

  db.prepare(
    `UPDATE insurers SET ${setClauses.join(', ')} WHERE id = ?`,
  ).run(...values)
  logAudit('UPDATE', 'insurer', id)

  return getInsurerById(id)
}

export function deleteInsurer(id: number): { deleted: boolean } {
  const result = db.prepare('DELETE FROM insurers WHERE id = ?').run(id)
  if (result.changes > 0) logAudit('DELETE', 'insurer', id)
  return { deleted: result.changes > 0 }
}

export function getInsurerClaimCount(id: number): number {
  const row = db
    .prepare('SELECT COUNT(*) as count FROM claims WHERE insurer_id = ?')
    .get(id) as { count: number }
  return row.count
}

export function addInsurerContact(input: z.infer<typeof createInsurerContactSchema>): InsurerContact {
  const result = db
    .prepare(
      `INSERT INTO insurer_contacts (insurer_id, name, title, email, phone, is_primary)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.insurerId,
      input.name,
      input.title,
      input.email,
      input.phone,
      input.isPrimary ? 1 : 0,
    )
  const row = db
    .prepare('SELECT * FROM insurer_contacts WHERE id = ?')
    .get(result.lastInsertRowid) as RawInsurerContact
  const contact = mapInsurerContact(row)
  logAudit('CREATE', 'insurerContact', contact.id, { insurerId: input.insurerId })
  return contact
}

export function updateInsurerContact(
  id: number,
  input: z.infer<typeof updateInsurerContactSchema>,
): InsurerContact | null {
  const fieldMap: Record<string, string> = {
    name: 'name',
    title: 'title',
    email: 'email',
    phone: 'phone',
    isPrimary: 'is_primary',
  }

  const setClauses: string[] = []
  const values: unknown[] = []

  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in input) {
      setClauses.push(`${col} = ?`)
      const val = input[key as keyof typeof input]
      values.push(key === 'isPrimary' ? (val ? 1 : 0) : val)
    }
  }

  if (setClauses.length === 0) {
    const row = db.prepare('SELECT * FROM insurer_contacts WHERE id = ?').get(id) as RawInsurerContact | undefined
    return row ? mapInsurerContact(row) : null
  }

  values.push(id)
  db.prepare(`UPDATE insurer_contacts SET ${setClauses.join(', ')} WHERE id = ?`).run(...values)
  logAudit('UPDATE', 'insurerContact', id)

  const row = db.prepare('SELECT * FROM insurer_contacts WHERE id = ?').get(id) as RawInsurerContact | undefined
  return row ? mapInsurerContact(row) : null
}

export function deleteInsurerContact(id: number): { deleted: boolean } {
  const result = db.prepare('DELETE FROM insurer_contacts WHERE id = ?').run(id)
  if (result.changes > 0) logAudit('DELETE', 'insurerContact', id)
  return { deleted: result.changes > 0 }
}

const setPrimaryTx = db.transaction((insurerId: number, contactId: number) => {
  db.prepare('UPDATE insurer_contacts SET is_primary = 0 WHERE insurer_id = ?').run(insurerId)
  db.prepare('UPDATE insurer_contacts SET is_primary = 1 WHERE id = ?').run(contactId)
})

export function setPrimaryContact(insurerId: number, contactId: number): void {
  setPrimaryTx(insurerId, contactId)
}
