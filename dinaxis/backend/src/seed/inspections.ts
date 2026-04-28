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
    // Sinistro 1 — Danos Materiais (encerrado) — 2 vistorias
    {
      claim_id: claimIds[0],
      scheduled_date: '2023-01-22',
      completed_date: '2023-01-22',
      findings: 'Vistoria ao telhado confirmou danos por granizo em aproximadamente 60% da superfície de telhas da vertente norte. Caleiras amassadas e com perfurações nas fachadas norte e este. Mancha de humidade ativa no teto do quarto principal com dimensão de 60 cm × 90 cm, consistente com infiltração por cima. Sem danos estruturais nas asnas ou no forro do telhado.',
      adjuster_notes: 'Danos totalmente consistentes com o evento de granizo de 2023-01-13 confirmado pelo IPMA. Registos meteorológicos arquivados. Recomendada substituição parcial de telhas e total das caleiras afetadas.',
      latitude: 38.5243,
      longitude: -8.8882,
    },
    {
      claim_id: claimIds[0],
      scheduled_date: '2023-02-10',
      completed_date: '2023-02-10',
      findings: 'Segunda vistoria após trabalhos de secagem. Mancha de humidade no teto do quarto principal reduzida — sem sinais de bolor ativo. Reparação de telhas concluída pelo empreiteiro, mas caleiras norte ainda aguardam substituição. Inspeção à estrutura da asna confirmou ausência de danos ocultos.',
      adjuster_notes: 'Segunda vistoria confirma progresso satisfatório nas reparações. Aprovação do orçamento final recomendada após conclusão das caleiras norte. Processo pode avançar para regularização.',
      latitude: 38.5243,
      longitude: -8.8882,
    },

    // Sinistro 2 — Incêndio (submetido) — 2 vistorias
    {
      claim_id: claimIds[1],
      scheduled_date: '2023-03-15',
      completed_date: '2023-03-15',
      findings: 'Cozinha e sala de jantar com danos graves por fogo e fumo. Parede exterior traseira com carbonização até ao revestimento estrutural em área de 4 m². Danos por fumo em todo o rés-do-chão — tetos, paredes e mobiliário com fuligem. Sistema de climatização contaminado. Pavimento de madeira na cozinha destruído. Caixilharia da janela traseira derretida.',
      adjuster_notes: 'Origem do incêndio confirmada no fogão elétrico — investigação preliminar exclui dolo. Propagação consistente com o relatório dos bombeiros. Recomendada avaliação urgente por engenheiro de estruturas para a parede traseira antes de qualquer obra.',
      latitude: 41.1579,
      longitude: -8.6291,
    },
    {
      claim_id: claimIds[1],
      scheduled_date: '2023-04-02',
      completed_date: '2023-04-02',
      findings: 'Segunda vistoria após relatório de engenheiro de estruturas. Parede traseira confirmada como estruturalmente comprometida — demolição e reconstrução necessárias. Danos por fumo mais extensos do que o inicialmente estimado: depósito de fuligem identificado também no primeiro andar através de condutas de ventilação. Necessária limpeza profissional das condutas em todo o imóvel.',
      adjuster_notes: 'Reavaliação do valor do sinistro necessária após extensão dos danos confirmada no segundo piso. Aprovação adicional de €22.000 para limpeza de condutas e reparações no primeiro andar a submeter à seguradora.',
      latitude: 41.1579,
      longitude: -8.6291,
    },

    // Sinistro 4 — Inundação Residencial (vistoriado) — 1 vistoria completa
    {
      claim_id: claimIds[3],
      scheduled_date: '2023-06-20',
      completed_date: '2023-06-20',
      findings: 'Linha de água visível a 45 centímetros em todas as paredes interiores do rés-do-chão — marcas de lodo consistentes. Soalho de madeira massiva completamente empenado e deformado em toda a área (aprox. 85 m²). Paredes em pladur saturadas até à linha de água — início de desenvolvimento de bolores no canto nordeste da sala e na casa de banho. Tomadas elétricas e cablagem abaixo da linha de água requerem substituição total. Unidade interior de climatização do rés-do-chão destruída. Frigorífico e máquina de lavar roupa inutilizados.',
      adjuster_notes: 'Danos totalmente consistentes com o evento de inundação de 2023-06-07. Remediação de bolores obrigatória antes de qualquer reconstrução. Recomendo envio de higienista para amostragem antes do início das obras.',
      latitude: 40.1507,
      longitude: -8.8597,
    },

    // Sinistro 6 — Café Aurora (vistoria agendada) — agendada, não concluída
    {
      claim_id: claimIds[5],
      scheduled_date: '2023-10-15',
      completed_date: null,
      findings: '',
      adjuster_notes: 'Vistoria reservada com perito comercial especializado em estabelecimentos de restauração. Proprietário do edifício disponibilizará acesso ao espaço técnico e documentação da instalação de canalização.',
      latitude: null,
      longitude: null,
    },

    // Sinistro 9 — Incêndio Comercial (encerrado) — 2 vistorias
    {
      claim_id: claimIds[8],
      scheduled_date: '2023-01-12',
      completed_date: '2023-01-12',
      findings: 'Pisos 3 e 4 com danos extensos por fogo. Sala de servidores no piso 3 completamente destruída — quadro elétrico principal carbonizado. Estrutura de betão dos pisos 3 e 4 aparentemente intacta, mas revestimentos, tectos falsos e instalações MEP completamente perdidas. Pisos 1 e 2 com danos por água dos sprinklers — alcatifas saturadas, tetos falsos colapsados em 40% da área.',
      adjuster_notes: 'Vistoria inicial confirma sinistro de grande escala. Recomendo avaliação de engenheiro de estruturas antes de qualquer acesso aos pisos 3 e 4. Coordenação com autoridades necessária — PSP mantém a zona interdita.',
      latitude: 41.1496,
      longitude: -8.6109,
    },
    {
      claim_id: claimIds[8],
      scheduled_date: '2023-02-05',
      completed_date: '2023-02-05',
      findings: 'Segunda vistoria após relatório estrutural e levantamento completo dos danos. Estrutura de betão dos pisos 3 e 4 confirmada como reutilizável após reparação de fissuras. Inventário completo de conteúdos perdidos (mobiliário, servidores, UPS) realizado com o gestor de instalações. Pisos 1 e 2 com remediação de água concluída — sem bolores identificados. Orçamentos de dois empreiteiros revistos no local.',
      adjuster_notes: 'Segunda vistoria permite avançar para aprovação dos orçamentos. Reconstrução total dos pisos 3 e 4 aprovada. Indemnização de conteúdos calculada com depreciação de equipamento informático. Processo pronto para submissão à seguradora para aprovação final.',
      latitude: 41.1496,
      longitude: -8.6109,
    },

    // Sinistro 11 — Responsabilidade Civil Supermercado (encerrado) — 1 vistoria
    {
      claim_id: claimIds[10],
      scheduled_date: '2023-05-22',
      completed_date: '2023-05-22',
      findings: 'Inspeção ao local da queda no corredor de laticínios. Pavimento de cerâmica sem textura antiderrapante — não cumpre as normas NP EN 13845 para locais comerciais de grande circulação. Câmera de vigilância do corredor analisada: confirma ausência de sinalização de piso molhado no momento da queda. Registos de limpeza mostram operação de lavagem concluída 12 minutos antes do acidente.',
      adjuster_notes: 'Responsabilidade do estabelecimento clara à luz da análise das imagens e dos registos de limpeza. Pavimento não conforme com normas de segurança. Recomendo acordo extrajudicial para evitar exposição adicional em tribunal.',
      latitude: 39.7476,
      longitude: -8.8077,
    },

    // Sinistro 13 — Inundação Hotel (vistoriado) — 2 vistorias
    {
      claim_id: claimIds[12],
      scheduled_date: '2024-02-28',
      completed_date: '2024-02-28',
      findings: 'Tubagem de cobre de abastecimento de água quente (DN 28) no corredor do piso 4 com rutura longitudinal de 8 cm. Quartos 401 a 412 com tetos e paredes completamente saturados — revestimentos destacados. Pisos 3 e 2 com infiltrações progressivas — alcatifas e rodapés afetados. Quartos 301 a 308 e 201 a 204 com danos moderados a severos nos tetos.',
      adjuster_notes: 'Causa da rutura: corrosão acelerada por água com pH baixo. Relatório de manutenção do hotel mostra última inspeção há 3 anos — possível contribuição por omissão de manutenção. A analisar implicações na cobertura.',
      latitude: 37.0853,
      longitude: -8.2589,
    },
    {
      claim_id: claimIds[12],
      scheduled_date: '2024-03-15',
      completed_date: '2024-03-15',
      findings: 'Segunda vistoria após secagem e avaliação estrutural. 26 quartos mapeados com danos confirmados — 14 com necessidade de renovação completa, 12 com reparação parcial. Sistema de canalização dos pisos 4, 3 e 2 requer inspeção e substituição preventiva. Nenhum dano estrutural identificado — apenas danos de acabamento e conteúdos.',
      adjuster_notes: 'Relatório de manutenção analisado: hotel cumpriu as suas obrigações contratuais. Cobertura total confirmada. Orçamentos dos dois empreiteiros hoteleiros dentro da estimativa inicial. Processo avança para regularização.',
      latitude: 37.0853,
      longitude: -8.2589,
    },

    // Sinistro 16 — Clínica Dentária (vistoria agendada)
    {
      claim_id: claimIds[15],
      scheduled_date: '2024-05-10',
      completed_date: null,
      findings: '',
      adjuster_notes: 'Vistoria agendada com engenheiro de estruturas especializado em danos por vibração. Prevista análise de fissurômetro e medição de assentamentos diferenciais. Fabricante do equipamento odontológico também convidado para avaliação técnica simultânea.',
      latitude: null,
      longitude: null,
    },

    // Sinistro 19 — Armazém Inundação (submetido) — 1 vistoria
    {
      claim_id: claimIds[18],
      scheduled_date: '2024-04-03',
      completed_date: '2024-04-03',
      findings: 'Armazém de 4.800 m² com marcas de água entre 120 e 180 cm em toda a área. Stock paletizado em 60% das localizações destruído. Sistema elétrico (quadros, cabos e tomadas industriais) completamente inutilizado. Três empilhadores elétricos e uma plataforma elevatória submersos — motor e baterias irrecuperáveis. Sistema de câmaras frigoríficas danificado: compressores e evaporadores afetados. Piso de betão aparentemente sem danos estruturais.',
      adjuster_notes: 'Sinistro de grande magnitude. Inventário de stock destruído fornecido pelo cliente — a validar com registos WMS. Recomendo peritagem independente dos equipamentos industriais antes de aprovação dos valores. Processo complexo com múltiplas categorias de dano.',
      latitude: 38.8081,
      longitude: -9.1005,
    },
  ]

  for (const inspection of inspections) {
    insert.run(inspection)
  }
}
