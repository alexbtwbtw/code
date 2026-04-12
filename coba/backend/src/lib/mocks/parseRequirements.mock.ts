import type { RequirementsOutput } from '../parseRequirements'

export function mockParseRequirements(): RequirementsOutput {
  return {
    bookTitle:       'Requisitos de Pessoal — Reforço da Barragem de Odivelas',
    bookCategory:    'water',
    bookDescription: 'Caderno de encargos para a constituição da equipa técnica de apoio à empreitada de reforço e reabilitação da Barragem de Odivelas, incluindo prospeção geotécnica complementar e projeto de estruturas hidráulicas auxiliares. Os perfis exigidos cobrem as especialidades de geotecnia, estruturas, ambiente e hidráulica.',
    requirements: [
      {
        title:           'Engenheiro Geotécnico Sénior',
        description:     'Responsável pela direção técnica das campanhas de prospeção geotécnica (sondagens, ensaios SPT e pressiométricos), interpretação de resultados e elaboração dos relatórios de caracterização geotécnica da fundação e dos encontros da barragem.',
        discipline:      'geotechnical',
        level:           'senior',
        yearsExperience: 10,
        certifications:  'Membro Sénior da OE; Especialização em Mecânica dos Solos (LNEC ou equivalente)',
        notes:           'Experiência comprovada em barragens ou obras geotécnicas de grande envergadura. Preferência por candidatos com experiência em contextos geológicos de xistos e granitos.',
        sourceEvidence:  '«Engenheiro Geotécnico Sénior com mínimo de 10 anos de experiência comprovada em prospeção e caracterização geotécnica de barragens»',
      },
      {
        title:           'Engenheiro de Estruturas — Estruturas Hidráulicas',
        description:     'Elaboração e verificação do projeto de execução das estruturas de betão armado associadas ao reforço do descarregador de cheias e das comportas de fundo, incluindo dimensionamento hidráulico e estrutural.',
        discipline:      'structural',
        level:           'senior',
        yearsExperience: 8,
        certifications:  'Membro da OE; formação em engenharia de barragens reconhecida pela CNPGB',
        notes:           'Familiaridade com normas europeias (EN 1990–1998) e com os regulamentos nacionais de segurança de barragens (RSB).',
        sourceEvidence:  '«Especialista em estruturas hidráulicas com experiência em descarregadores e comportas, habilitado para assinar projetos de execução»',
      },
      {
        title:           'Técnico Ambiental — Monitorização e Relatórios',
        description:     'Acompanhamento ambiental da obra em fase de construção, elaboração de relatórios de monitorização ambiental (RMA) trimestrais e coordenação com a autoridade de AIA. Inclui monitorização de qualidade da água, ruído e fauna aquática.',
        discipline:      'environmental',
        level:           'mid',
        yearsExperience: 4,
        certifications:  'Licenciatura em Engenharia do Ambiente ou Biologia; registo na APA como técnico de monitorização ambiental de obras (MAO)',
        notes:           'Disponibilidade para deslocações regulares ao local da obra (Alentejo).',
        sourceEvidence:  '«Técnico de monitorização ambiental registado na APA, com experiência mínima de 4 anos em acompanhamento ambiental de obras hídricas»',
      },
      {
        title:           'Coordenador de Segurança em Obra (CSO)',
        description:     'Coordenação da segurança e saúde durante a fase de construção, nos termos do Decreto-Lei n.º 273/2003. Elaboração e atualização do Plano de Segurança e Saúde (PSS) e gestão da compilação técnica da obra.',
        discipline:      'other',
        level:           'lead',
        yearsExperience: 6,
        certifications:  'Certificação de Coordenador de Segurança em Obras de Construção (nível II ou superior); membro da ACT',
        notes:           'Experiência em obras de barragens ou infraestruturas hidráulicas de grande dimensão é valorizada.',
        sourceEvidence:  '«Coordenador de Segurança certificado (nível II), com no mínimo 6 anos de experiência em obras de construção civil de grande envergadura»',
      },
    ],
  }
}
