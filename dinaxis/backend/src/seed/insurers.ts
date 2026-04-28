import { db } from '../db'

export function seedInsurers(): number[] {
  const insertInsurer = db.prepare(`
    INSERT INTO insurers (name, contact_name, email, phone, address)
    VALUES (@name, @contact_name, @email, @phone, @address)
  `)

  const insertContact = db.prepare(`
    INSERT INTO insurer_contacts (insurer_id, name, title, email, phone, is_primary)
    VALUES (@insurer_id, @name, @title, @email, @phone, @is_primary)
  `)

  const insurers = [
    {
      name: 'State Farm Insurance',
      contact_name: 'John Miller',
      email: 'john.miller@statefarm.com',
      phone: '(555) 123-4001',
      address: '1 State Farm Plaza, Bloomington IL',
    },
    {
      name: 'Allstate Insurance',
      contact_name: 'Sarah Chen',
      email: 'sarah.chen@allstate.com',
      phone: '(555) 123-4002',
      address: '2775 Sanders Rd, Northbrook IL',
    },
    {
      name: 'Liberty Mutual',
      contact_name: 'David Torres',
      email: 'david.torres@libertymutual.com',
      phone: '(555) 123-4003',
      address: '175 Berkeley St, Boston MA',
    },
  ]

  const ids: number[] = []
  for (const insurer of insurers) {
    const result = insertInsurer.run(insurer)
    ids.push(result.lastInsertRowid as number)
  }

  const [stateFarmId, allstateId, libertyId] = ids

  // State Farm contacts
  insertContact.run({ insurer_id: stateFarmId, name: 'John Miller', title: 'Gerente de Sinistros', email: 'john.miller@statefarm.com', phone: '(555) 123-4001', is_primary: 1 })
  insertContact.run({ insurer_id: stateFarmId, name: 'Sarah Johnson', title: 'Supervisora', email: 'sarah.johnson@statefarm.com', phone: '(555) 123-4002', is_primary: 0 })

  // Allstate contacts
  insertContact.run({ insurer_id: allstateId, name: 'Sarah Chen', title: 'Diretora de Operações', email: 'sarah.chen@allstate.com', phone: '(555) 123-4002', is_primary: 1 })

  // Liberty Mutual contacts
  insertContact.run({ insurer_id: libertyId, name: 'David Torres', title: 'Coordenador de Sinistros', email: 'david.torres@libertymutual.com', phone: '(555) 123-4003', is_primary: 1 })
  insertContact.run({ insurer_id: libertyId, name: 'Ana Lima', title: 'Analista', email: 'ana.lima@libertymutual.com', phone: '(555) 123-4004', is_primary: 0 })

  return ids
}
