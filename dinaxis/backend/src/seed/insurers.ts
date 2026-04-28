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
      address: 'Largo do Calhariz, 30, 1200-127 Lisboa',
    },
    {
      name: 'Tranquilidade Seguros',
      contact_name: 'Ana Rodrigues',
      email: 'ana.rodrigues@tranquilidade.pt',
      phone: '+351 213 100 002',
      address: 'Av. da Liberdade, 242, 1250-149 Lisboa',
    },
    {
      name: 'Allianz Portugal',
      contact_name: 'David Sousa',
      email: 'david.sousa@allianz.pt',
      phone: '+351 213 100 003',
      address: 'Rua Andrade Corvo, 32, 1050-009 Lisboa',
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
  insertContact.run({ insurer_id: fidelidadeId, name: 'Sofia Martins', title: 'Supervisora de Sinistros', email: 'sofia.martins@fidelidade.pt', phone: '+351 213 100 012', is_primary: 0 })
  insertContact.run({ insurer_id: fidelidadeId, name: 'Ricardo Pinto', title: 'Técnico de Regularização', email: 'ricardo.pinto@fidelidade.pt', phone: '+351 213 100 023', is_primary: 0 })
  insertContact.run({ insurer_id: fidelidadeId, name: 'Margarida Lopes', title: 'Diretora de Indemnizações', email: 'margarida.lopes@fidelidade.pt', phone: '+351 213 100 034', is_primary: 0 })

  // Tranquilidade contacts
  insertContact.run({ insurer_id: tranquilidadeId, name: 'Ana Rodrigues', title: 'Diretora de Operações', email: 'ana.rodrigues@tranquilidade.pt', phone: '+351 213 100 002', is_primary: 1 })
  insertContact.run({ insurer_id: tranquilidadeId, name: 'Pedro Carvalho', title: 'Coordenador de Sinistros', email: 'pedro.carvalho@tranquilidade.pt', phone: '+351 213 100 015', is_primary: 0 })
  insertContact.run({ insurer_id: tranquilidadeId, name: 'Inês Figueiredo', title: 'Gestora de Contratos', email: 'ines.figueiredo@tranquilidade.pt', phone: '+351 213 100 026', is_primary: 0 })
  insertContact.run({ insurer_id: tranquilidadeId, name: 'Nuno Azevedo', title: 'Jurídico — Sinistros Complexos', email: 'nuno.azevedo@tranquilidade.pt', phone: '+351 213 100 037', is_primary: 0 })

  // Allianz contacts
  insertContact.run({ insurer_id: allianzId, name: 'David Sousa', title: 'Coordenador de Sinistros', email: 'david.sousa@allianz.pt', phone: '+351 213 100 003', is_primary: 1 })
  insertContact.run({ insurer_id: allianzId, name: 'Ana Lima', title: 'Analista de Sinistros', email: 'ana.lima@allianz.pt', phone: '+351 213 100 014', is_primary: 0 })
  insertContact.run({ insurer_id: allianzId, name: 'Filipe Nascimento', title: 'Responsável de Clientes Empresariais', email: 'filipe.nascimento@allianz.pt', phone: '+351 213 100 025', is_primary: 0 })
  insertContact.run({ insurer_id: allianzId, name: 'Catarina Esteves', title: 'Técnica de Prevenção e Peritagem', email: 'catarina.esteves@allianz.pt', phone: '+351 213 100 036', is_primary: 0 })

  return ids
}
