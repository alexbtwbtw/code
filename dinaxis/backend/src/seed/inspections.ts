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
    // Sinistro 1 (encerrado) — vistoria concluída
    {
      claim_id: claimIds[0],
      scheduled_date: '2024-01-22',
      completed_date: '2024-01-22',
      findings: 'Vistoria ao telhado confirmou danos por granizo em aproximadamente 60% da superfície de telhas. Caleiras amassadas nas fachadas norte e este. Mancha de humidade no teto do quarto principal com dimensão de 60 cm x 90 cm, consistente com infiltração ativa por cima. Sem danos estruturais nas asnas ou no forro.',
      adjuster_notes: 'Danos consistentes com o evento de tempestade reportado. Registos meteorológicos confirmam granizo em 2024-01-13.',
      latitude: null,
      longitude: null,
    },
    // Sinistro 2 (submetido) — vistoria concluída
    {
      claim_id: claimIds[1],
      scheduled_date: '2024-02-10',
      completed_date: '2024-02-10',
      findings: 'A cozinha e a sala de jantar sofreram danos graves por fogo e fumo. A parede exterior traseira apresenta carbonização até ao revestimento estrutural. Danos por fumo em todo o rés-do-chão. Sistema de climatização contaminado com resíduos de fumo.',
      adjuster_notes: 'Origem do incêndio confirmada no fogão. Propagação consistente com o relatório. Recomendada avaliação por engenheiro de estruturas para a parede traseira.',
      latitude: null,
      longitude: null,
    },
    // Sinistro 4 (vistoriado) — vistoria concluída com GPS
    {
      claim_id: claimIds[3],
      scheduled_date: '2024-03-12',
      completed_date: '2024-03-12',
      findings: 'Linha de água visível a 45 centímetros em todas as paredes interiores do rés-do-chão. Soalho de madeira empenado e deformado por toda a área. Paredes em pladur saturadas até à linha de água — início de desenvolvimento de bolores no canto nordeste. Tomadas elétricas abaixo da linha de água requerem substituição total. Unidade de tratamento de ar do rés-do-chão destruída.',
      adjuster_notes: 'Danos consistentes com a profundidade de inundação reportada. Recomenda-se remediação de bolores antes do início de qualquer reconstrução.',
      latitude: 38.7169,
      longitude: -9.1399,
    },
    // Sinistro 6 (vistoria agendada) — agendada, ainda não concluída
    {
      claim_id: claimIds[5],
      scheduled_date: '2024-05-05',
      completed_date: null,
      findings: '',
      adjuster_notes: 'Vistoria reservada com perito comercial. O proprietário disponibilizará acesso.',
      latitude: null,
      longitude: null,
    },
  ]

  for (const inspection of inspections) {
    insert.run(inspection)
  }
}
