import { db } from '../db'

export function seedExperts(): number[] {
  const insert = db.prepare(`
    INSERT INTO experts (name, specialty, email, phone, notes)
    VALUES (@name, @specialty, @email, @phone, @notes)
  `)

  const experts = [
    {
      name: 'Eng. António Ferreira',
      specialty: 'Engenharia Civil e Estruturas',
      email: 'a.ferreira@peritos.pt',
      phone: '+351 912 345 678',
      notes: 'Especialista em danos estruturais e fundações. Certificado pelo OE. Vasta experiência em avaliação de danos por vento, granizo e assentamento diferencial.',
    },
    {
      name: 'Dra. Carla Mendonça',
      specialty: 'Avaliação de Incêndios',
      email: 'c.mendonca@expertfire.pt',
      phone: '+351 916 234 567',
      notes: 'Perita em incêndios e explosões. Colabora com a ANPC. Formação em investigação de causas e origens de incêndio pela NAFI. Mais de 200 peritagens realizadas.',
    },
    {
      name: 'Eng. Paulo Rodrigues',
      specialty: 'Peritagem Automóvel',
      email: 'p.rodrigues@autoperitos.pt',
      phone: '+351 934 567 890',
      notes: 'Perito automóvel credenciado pelo IMT. Experiência em acidentes de viação, avaliação de dano total e detecção de fraudes em sinistros automóvel. Certificado DEKRA.',
    },
    {
      name: 'Arq. Sofia Lopes',
      specialty: 'Patologia da Construção',
      email: 's.lopes@patologiaconstrucao.pt',
      phone: '+351 921 456 789',
      notes: 'Arquitecta especializada em reabilitação e patologias de edifícios. Membro da OA. Perita em danos por humidade, vibração e deficiências construtivas. Colabora regularmente com tribunais arbitrais.',
    },
    {
      name: 'Eng. Rui Baptista',
      specialty: 'Inundações e Hidrologia',
      email: 'r.baptista@hidro.pt',
      phone: '+351 963 789 012',
      notes: 'Engenheiro hidráulico especializado em avaliação de danos por cheia, inundação e humidade ascensional. Membro da Ordem dos Engenheiros — especialização em Hidráulica e Recursos Hídricos.',
    },
  ]

  const ids: number[] = []
  for (const e of experts) {
    const result = insert.run(e)
    ids.push(Number(result.lastInsertRowid))
  }
  return ids
}
