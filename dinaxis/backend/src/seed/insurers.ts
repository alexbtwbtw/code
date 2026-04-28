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
      name: 'Fidelidade Seguros',
      contact_name: 'João Ferreira',
      email: 'joao.ferreira@fidelidade.pt',
      phone: '+351 213 100 001',
      address: 'Largo do Calhariz, 30, Lisboa',
    },
    {
      name: 'Tranquilidade Seguros',
      contact_name: 'Ana Rodrigues',
      email: 'ana.rodrigues@tranquilidade.pt',
      phone: '+351 213 100 002',
      address: 'Av. da Liberdade, 242, Lisboa',
    },
    {
      name: 'Allianz Portugal',
      contact_name: 'David Sousa',
      email: 'david.sousa@allianz.pt',
      phone: '+351 213 100 003',
      address: 'Rua Andrade Corvo, 32, Lisboa',
    },
  ]

  const ids: number[] = []
  for (const insurer of insurers) {
    const result = insertInsurer.run(insurer)
    ids.push(result.lastInsertRowid as number)
  }

  const [fidelidadeId, tranquilidadeId, allianzId] = ids

  // Fidelidade contacts
  insertContact.run({ insurer_id: fidelidadeId, name: 'João Ferreira', title: 'Gerente de Sinistros', email: 'joao.ferreira@fidelidade.pt', phone: '+351 213 100 001', is_primary: 1 })
  insertContact.run({ insurer_id: fidelidadeId, name: 'Sofia Martins', title: 'Supervisora', email: 'sofia.martins@fidelidade.pt', phone: '+351 213 100 002', is_primary: 0 })

  // Tranquilidade contacts
  insertContact.run({ insurer_id: tranquilidadeId, name: 'Ana Rodrigues', title: 'Diretora de Operações', email: 'ana.rodrigues@tranquilidade.pt', phone: '+351 213 100 002', is_primary: 1 })

  // Allianz contacts
  insertContact.run({ insurer_id: allianzId, name: 'David Sousa', title: 'Coordenador de Sinistros', email: 'david.sousa@allianz.pt', phone: '+351 213 100 003', is_primary: 1 })
  insertContact.run({ insurer_id: allianzId, name: 'Ana Lima', title: 'Analista', email: 'ana.lima@allianz.pt', phone: '+351 213 100 004', is_primary: 0 })

  return ids
}
