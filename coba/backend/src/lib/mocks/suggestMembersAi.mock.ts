import type { MemberSnapshot, AiSuggestion } from '../suggestMembersAi'

export function mockSuggestMembersAi(
  members: MemberSnapshot[],
  topN: number,
): AiSuggestion[] {
  const rationales = [
    'Apresenta experiência direta em projetos da mesma categoria e região geográfica do projeto em análise, com historial comprovado em estruturas de tipologia semelhante.',
    'O perfil técnico e os projetos anteriores demonstram sólida competência nas disciplinas mais relevantes para este projeto, incluindo experiência em contextos geológicos equivalentes.',
    'Revela familiaridade com os requisitos regulamentares e metodologias de trabalho aplicáveis, tendo participado em obras de complexidade e escala comparáveis.',
    'A trajetória profissional inclui colaborações em projetos internacionais com condicionantes geotécnicas similares, tornando-o/a um recurso valioso para a equipa.',
    'Combina experiência de campo com capacidades de coordenação técnica, correspondendo ao perfil de especialidade necessário nesta fase do projeto.',
  ]

  return members.slice(0, topN).map((member, index) => {
    const bioExcerpt = member.bio.length > 0
      ? member.bio.slice(0, 120).trimEnd() + (member.bio.length > 120 ? '…' : '')
      : ''
    const firstHistory = member.history[0]
    const historyRef = firstHistory
      ? `${firstHistory.projectName}${firstHistory.notes ? ` — ${firstHistory.notes.slice(0, 80).trimEnd()}${firstHistory.notes.length > 80 ? '…' : ''}` : ''}`
      : ''
    const evidence = [bioExcerpt, historyRef].filter(Boolean).join(' | ')
    return {
      memberId: member.id,
      rationale: rationales[index % rationales.length],
      evidence,
      cvPageRef: firstHistory ? 2 : 1,
    }
  })
}
