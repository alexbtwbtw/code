import { db } from '../db'

export function seedClaimComments(claimIds: number[]): void {
  const insert = db.prepare(`
    INSERT INTO claim_comments (id, claim_id, text, created_at)
    VALUES (@id, @claim_id, @text, @created_at)
  `)

  const comments = [
    // Sinistro 1 — Danos Materiais (encerrado)
    { id: crypto.randomUUID(), claim_id: claimIds[0], text: 'Contacto inicial estabelecido com o sinistrado. Evento reportado como granizo em 2023-01-13. Vistoria agendada para a próxima terça-feira (22/01). Sinistrado informado dos documentos necessários: relatório meteorológico, fotos dos danos e orçamentos.', created_at: '2023-01-15T14:32:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[0], text: 'Primeira vistoria concluída. Danos no telhado totalmente consistentes com a tempestade de granizo reportada. Relatório meteorológico do IPMA obtido e arquivado. Dois orçamentos de empreiteiros de coberturas solicitados.', created_at: '2023-01-22T16:45:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[0], text: 'Orçamentos recebidos: empreiteiro A — €19.200; empreiteiro B — €17.800. Ambos dentro do intervalo esperado. Segunda vistoria realizada para confirmar progresso das obras de secagem.', created_at: '2023-02-10T11:20:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[0], text: 'Orçamento do empreiteiro B aprovado com ajuste de €1.100 no âmbito cosmético. Autorização de obra enviada ao sinistrado. Reparações previstas para iniciar na próxima semana.', created_at: '2023-02-18T09:30:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[0], text: 'Reparações concluídas e inspecionadas. Telhado e caleiras em perfeitas condições. Teto do quarto principal reparado sem evidências de humidade. Indemnização de €16.200 acordada e processada. Processo encerrado com acordo do sinistrado.', created_at: '2023-04-20T10:15:00' },

    // Sinistro 2 — Incêndio Residencial (submetido)
    { id: crypto.randomUUID(), claim_id: claimIds[1], text: 'Sinistro reportado 3 dias após o incêndio. Contacto telefónico com sinistrado — família alojada em casa de familiares. Bombeiros Voluntários do Porto acionados no dia do evento (2023-03-02). Relatório dos bombeiros solicitado.', created_at: '2023-03-05T09:15:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[1], text: 'Primeira vistoria realizada. Danos extensos por fogo e fumo confirmados — cozinha e sala de jantar em estado crítico. Relatório dos bombeiros obtido: causa — fogão elétrico esquecido ligado. Engenheiro de estruturas contratado para avaliação da parede traseira.', created_at: '2023-03-15T15:30:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[1], text: 'Relatório do engenheiro de estruturas recebido: parede traseira estruturalmente comprometida, requer demolição parcial e reconstrução. Custo adicional de €22.000 identificado para danos no primeiro andar por condutas de ventilação. Valor do sinistro revisto em alta.', created_at: '2023-04-02T14:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[1], text: 'Segunda vistoria realizada após relatório estrutural. Âmbito dos danos completamente mapeado. Orçamento global de três empreiteiros solicitado. Família a necessitar de alojamento temporário — subsídio a calcular com base no período estimado de obras (4 meses).', created_at: '2023-04-10T11:45:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[1], text: 'Processo em fase final de preparação para submissão à Tranquilidade Seguros. Toda a documentação arquivada: relatório dos bombeiros, relatório estrutural, orçamentos, inventário de conteúdos. Aguarda assinatura do sinistrado na declaração final.', created_at: '2023-05-20T16:00:00' },

    // Sinistro 3 — Responsabilidade Civil (disputado)
    { id: crypto.randomUUID(), claim_id: claimIds[2], text: 'Queda reportada pela sinistrada (funcionária visitante). Empresa TechLda contestou imediatamente a responsabilidade, alegando que a empresa de facilities management subcontratada é responsável pela limpeza. Imagens de videovigilância solicitadas com caráter de urgência.', created_at: '2023-04-18T10:30:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[2], text: 'Imagens de videovigilância analisadas com advogado da seguradora. Confirmada ausência total de sinalização de piso molhado no momento da queda. Lavagem do corredor concluída 12 minutos antes. A empresa de facilities management e a TechLda têm responsabilidade partilhada — a determinar em tribunal.', created_at: '2023-04-25T09:10:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[2], text: 'Suspensão legal aplicada ao processo. Sinistrada constituiu advogado e apresentou providência cautelar. Aguarda correspondência formal do tribunal. Advogado da Allianz Portugal informado e acompanha o processo.', created_at: '2023-05-08T11:30:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[2], text: 'Reunião com advogado da seguradora e representante da TechLda. Proposta de acordo extrajudicial de €42.000 recusada pela sinistrada. Processo judicial prossegue. Próxima diligência: audiência preliminar agendada para setembro.', created_at: '2023-06-14T14:20:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[2], text: 'Perícia médica judicial realizada. Médico perito confirmou lesões permanentes no punho (IPP de 8%). Valor do processo aumentou. Advogado recomenda aguardar sentença em primeira instância antes de nova proposta de acordo.', created_at: '2023-09-22T16:00:00' },

    // Sinistro 4 — Inundação Residencial (vistoriado)
    { id: crypto.randomUUID(), claim_id: claimIds[3], text: 'Sinistro reportado 3 dias após a inundação. Evento confirmado pelo IPMA — precipitação extrema na região da Figueira da Foz em 2023-06-07. Vistoria urgente agendada para a semana seguinte.', created_at: '2023-06-10T09:45:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[3], text: 'Vistoria realizada. Danos por inundação extensos confirmados — linha de água a 45 cm. Soalho de madeira massiva irrecuperável. Início de desenvolvimento de bolores no canto nordeste. Remediação urgente de bolores recomendada antes de qualquer obra. Higienista contactado.', created_at: '2023-06-20T15:20:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[3], text: 'Relatório de higienista recebido: bolores do tipo Cladosporium e Penicillium identificados. Remediação profissional obrigatória. Três orçamentos de empreiteiros solicitados para a remediação e reconstrução.', created_at: '2023-07-04T11:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[3], text: 'Dois orçamentos recebidos dentro do intervalo esperado. Terceiro empreiteiro não respondeu. Valor global estimado confirmado. Processo a avançar para aprovação e regularização — aguarda apenas parecer jurídico sobre cobertura de conteúdos.', created_at: '2023-07-18T13:55:00' },

    // Sinistro 5 — Furto (report_pending)
    { id: crypto.randomUUID(), claim_id: claimIds[4], text: 'Furto reportado. Participação policial apresentada na PSP de Coimbra (processo PSP-2023-07-8812). Sinistrado forneceu inventário preliminar dos bens furtados. Relatório de peritagem solicitado para avaliação dos bens.', created_at: '2023-07-20T16:30:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[4], text: 'PSP informou que parte dos bens furtados foi localizada numa operação policial. Aguarda devolução e avaliação do estado dos bens recuperados para deduzir do valor da indemnização. Perito de conteúdos a aguardar resultado da PSP.', created_at: '2023-08-05T10:15:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[4], text: 'Relatório de peritagem dos bens não recuperados em preparação. Faturas de compra e avaliações apresentadas para a maioria dos artigos. Janela arrombada orçamentada em €480. Processo aguarda relatório final do perito para submissão à seguradora.', created_at: '2023-09-12T14:40:00' },

    // Sinistro 6 — Café Aurora (inspection_scheduled)
    { id: crypto.randomUUID(), claim_id: claimIds[5], text: 'Sinistro comunicado pelo gerente do Café Aurora. Rebentamento de canalização causou inundação por água quente na sala e cozinha. Estabelecimento encerrado de emergência. Vistoria agendada com perito comercial.', created_at: '2023-09-12T10:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[5], text: 'Vistoria técnica agendada para 15 de outubro. Proprietário do edifício contatado para permitir acesso ao espaço técnico de canalização. Empreiteiro de reparações urgentes autorizado a iniciar trabalhos de secagem preventiva para limitar os danos.', created_at: '2023-09-28T15:30:00' },

    // Sinistro 7 — Auto (assigned)
    { id: crypto.randomUUID(), claim_id: claimIds[6], text: 'Viatura BMW avariada por queda de ramo de árvore durante tempestade de 2023-09-30. Veículo rebocado para oficina autorizada BMW em Cascais. Processo atribuído ao perito de automóvel. Relatório fotográfico recebido e arquivado.', created_at: '2023-10-03T11:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[6], text: 'Relatório de avaliação da oficina BMW recebido. Capô requer substituição total — amolgadelas extensas e estrutura comprometida. Tejadilho: reparação possível segundo técnico especialista. Para-brisas com aquecimento: substituição obrigatória (peça original). Orçamento de €12.400 em linha com o estimado.', created_at: '2023-10-15T14:00:00' },

    // Sinistro 8 — Danos Materiais (new)
    { id: crypto.randomUUID(), claim_id: claimIds[7], text: 'Processo recém-aberto. Danos causados por queda de árvore do vizinho durante trovoada. Documentação inicial solicitada: fotos dos danos, relatório policial/bombeiros e informação sobre a árvore (pertence a quem?). Contacto com sinistrado agendado.', created_at: '2023-11-15T09:30:00' },

    // Sinistro 9 — Incêndio Comercial (encerrado)
    { id: crypto.randomUUID(), claim_id: claimIds[8], text: 'Sinistro de grande escala comunicado. Incêndio elétrico na sala de servidores do piso 3. PSP interdita o acesso aos pisos 3 e 4 por razões de segurança. Primeira vistoria realizada no mesmo dia com coordenação policial.', created_at: '2023-01-05T16:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[8], text: 'Relatório dos Bombeiros Sapadores obtido: causa determinada — curto-circuito no quadro de distribuição secundário sem proteção diferencial adequada. Engenheiro de estruturas contratado. Empresa de inventário de conteúdos acionada para os pisos 3 e 4.', created_at: '2023-01-12T14:30:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[8], text: 'Segunda vistoria realizada após relatório estrutural. Estrutura de betão aprovada para reutilização. Inventário completo de conteúdos perdidos concluído. Dois orçamentos de construtoras recebidos — diferença de €28.000 entre os dois. A analisar com a seguradora.', created_at: '2023-02-05T11:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[8], text: 'Reunião com Allianz Portugal e gestão da Propriedades do Norte. Orçamento mais baixo aprovado com ajuste de 5% para contingências. Autorização de obra emitida. Subsídio de interrupção de atividade aprovado para 6 semanas.', created_at: '2023-02-20T15:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[8], text: 'Obras de reconstrução concluídas. Vistoria final de aceitação realizada com engenheiro de fiscalização. Edifício re-aberto em pleno. Indemnização final de €260.000 processada. Processo encerrado com acordo.', created_at: '2023-04-30T10:00:00' },

    // Sinistro 10 — Inundação (new, muito antigo)
    { id: crypto.randomUUID(), claim_id: claimIds[9], text: 'Processo aberto após cheia repentina em Aveiro. Família realojada. Tentativa de contacto inicial — sem resposta. Segunda tentativa agendada para amanhã.', created_at: '2023-02-01T10:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[9], text: 'Contacto estabelecido após segunda tentativa. Família a aguardar resposta da câmara municipal sobre o estado do imóvel. Vistoria não pode ser agendada até autorização de acesso. Processo em espera.', created_at: '2023-02-03T14:00:00' },

    // Sinistro 11 — Responsabilidade Civil Supermercado (encerrado)
    { id: crypto.randomUUID(), claim_id: claimIds[10], text: 'Queda comunicada pelo departamento jurídico do supermercado. Imagens de videovigilância solicitadas com urgência. Sinistrado (cliente) assistido no local pelo responsável de turno.', created_at: '2023-05-10T11:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[10], text: 'Vistoria ao local realizada. Imagens de vigilância confirmam ausência de sinalética. Pavimento analisado — não conforme com normas de segurança NP EN 13845. Relatório técnico preparado. Responsabilidade clara.', created_at: '2023-05-22T15:30:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[10], text: 'Proposta de acordo extrajudicial de €19.500 apresentada ao advogado da sinistrada. Inclui despesas médicas verificadas (€6.500), incapacidade temporária (€1.800), danos morais (€4.500) e honorários de advogado (€2.000). Aguarda resposta em 10 dias úteis.', created_at: '2023-07-12T10:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[10], text: 'Acordo extrajudicial aceite pela sinistrada. Indemnização de €19.500 processada. Processo encerrado. Supermercado comprometeu-se a instalar sinalética adequada e a atualizar o protocolo de limpeza.', created_at: '2023-09-14T14:00:00' },

    // Sinistro 12 — Furto Joalharia (submitted)
    { id: crypto.randomUUID(), claim_id: claimIds[11], text: 'Assalto à mão armada reportado. PJ e PSP presentes no local. Vídeo de vigilância entregue às autoridades. Inventário urgente de artigos furtados iniciado em colaboração com o gerente e o contador da joalharia.', created_at: '2024-01-08T16:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[11], text: 'Inventário completo de artigos furtados concluído — 62 peças avaliadas em €186.000. Avaliação por perito joalheiro independente realizada. Documentação de suporte arquivada: certificados de autenticidade, faturas de compra e avaliações independentes.', created_at: '2024-01-22T11:30:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[11], text: 'Processo submetido à Allianz Portugal com toda a documentação. Relatório de peritagem, inventário, avaliações e participação da PJ incluídos. Aguarda aprovação da seguradora. Joalharia a operar com stock reduzido.', created_at: '2024-02-10T14:00:00' },

    // Sinistro 13 — Inundação Hotel (vistoriado)
    { id: crypto.randomUUID(), claim_id: claimIds[12], text: 'Rutura de canalização reportada pelo diretor de manutenção. 26 quartos afetados em três pisos. Hotel reduziu capacidade em 40%. Vistoria técnica agendada com urgência.', created_at: '2024-02-20T08:30:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[12], text: 'Primeira vistoria realizada. Causa identificada: corrosão de tubagem de cobre por água com pH baixo. Manutenção do hotel verificada — última inspeção há 3 anos dentro das obrigações contratuais. Cobertura confirmada. Segunda vistoria agendada após secagem.', created_at: '2024-02-28T16:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[12], text: 'Segunda vistoria realizada. Mapeamento completo de danos por quarto concluído: 14 com renovação total, 12 com reparação parcial. Orçamentos de dois empreiteiros hoteleiros especializados recebidos. Valores dentro da estimativa. A avançar para aprovação da seguradora.', created_at: '2024-03-15T11:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[12], text: 'Relatório de vistoria completo enviado à Fidelidade Seguros. Orçamento preferencial (empreiteiro A) recomendado. Solicitada autorização para início de obras. Diretor do hotel informado do prazo estimado de 6 semanas para conclusão das reparações.', created_at: '2024-03-28T14:30:00' },

    // Sinistro 14 — Auto (report_pending)
    { id: crypto.randomUUID(), claim_id: claimIds[13], text: 'Colisão traseira reportada. Boletim de acidente amigável preenchido no local. Veículo rebocado para oficina autorizada Renault em Almada. Sinistrada queixa-se de dores cervicais — aconselhada a consultar médico com urgência.', created_at: '2024-03-14T09:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[13], text: 'Orçamento da oficina Renault recebido: €14.500 para reparação da traseira. Dentro do esperado. Aguarda relatório médico do traumatologista para completar o processo. Viatura de substituição autorizada enquanto o veículo está na oficina.', created_at: '2024-03-25T11:00:00' },

    // Sinistro 15 — Incêndio Residencial (new)
    { id: crypto.randomUUID(), claim_id: claimIds[14], text: 'Sinistro recentemente aberto. Incêndio na cave com origem elétrica confirmada pelos bombeiros de Sintra. Família a residir temporariamente em casa de familiares. Contacto inicial realizado — documentação solicitada.', created_at: '2024-04-05T10:30:00' },

    // Sinistro 16 — Clínica Dentária (inspection_scheduled)
    { id: crypto.randomUUID(), claim_id: claimIds[15], text: 'Danos por vibração reportados após 2 meses de obras no edifício adjacente. Clínica documenta fissuras progressivas e erros de calibração do equipamento. Perito de estruturas contactado — vistoria agendada para 10 de maio.', created_at: '2024-04-22T14:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[15], text: 'Vistoria agendada confirmada para 10/05/2024 com engenheiro de estruturas. Fabricante do equipamento odontológico também confirmou presença para avaliação simultânea do equipamento de imagiologia.', created_at: '2024-05-02T09:00:00' },

    // Sinistro 17 — Danos Materiais Residencial (assigned)
    { id: crypto.randomUUID(), claim_id: claimIds[16], text: 'Processo atribuído. Danos por granizo e vento em Alcochete confirmados pelo IPMA para 02/05/2024. Vistoria a agendar para a semana de 13/05. Sinistrado informado e disponível a partir de terça-feira.', created_at: '2024-05-03T11:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[16], text: 'Vistoria agendada para 14/05/2024 às 10h00. Sinistrado confirmou disponibilidade. Documentação preliminar recebida: fotos dos danos e confirmação do IPMA arquivadas no processo.', created_at: '2024-05-09T15:30:00' },

    // Sinistro 18 — Furto Residencial (encerrado)
    { id: crypto.randomUUID(), claim_id: claimIds[17], text: 'Furto reportado após regresso de viagem. Participação na GNR de Sintra efetuada. Sinistrada forneceu inventário de bens furtados com faturas disponíveis para a maioria dos artigos. Processo aberto.', created_at: '2024-01-22T16:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[17], text: 'GNR informou que parte dos artigos foi recuperada numa operação a 15 dias. Portátil e tablet não recuperados. Joalharia parcialmente recuperada. Relatório de perito de conteúdos em preparação com base nos artigos não recuperados.', created_at: '2024-02-08T10:30:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[17], text: 'Peritagem concluída. Indemnização calculada para artigos não recuperados com depreciação aplicada: portátil €1.150, tablet €780, joalharia não recuperada €2.200, janela arrombada €520. Total aprovado: €4.650. Deduzida franquia de €750 — pagamento de €3.900 processado. Processo encerrado.', created_at: '2024-04-10T14:00:00' },

    // Sinistro 19 — Inundação Armazém (submitted)
    { id: crypto.randomUUID(), claim_id: claimIds[18], text: 'Sinistro de grande escala comunicado. Inundação industrial por rotura de dique em Sacavém. Toda a área de armazenagem submersa. Perito industrial e perito de stocks acionados com urgência.', created_at: '2024-03-28T09:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[18], text: 'Vistoria realizada com perito industrial. Danos confirmados em toda a extensão do armazém. Inventário de stock destruído em validação com auditoria interna do cliente. Sistema elétrico e frota de empilhadores peritados por técnico especializado.', created_at: '2024-04-03T16:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[18], text: 'Auditoria de stock concluída: 847 SKUs destruídos avaliados em €180.000. Relatório do perito industrial a confirmar os valores dos equipamentos. Processo em preparação para submissão à Fidelidade Seguros — documentação técnica completa.', created_at: '2024-04-22T11:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[18], text: 'Processo completo submetido à Fidelidade Seguros. Relatórios técnicos, inventários, peritagens e orçamentos incluídos. Valor total submetido: €427.000 (remediação + elétrico + equipamentos + stock + perda de receita). Aguarda aprovação e nomeação de representante da seguradora.', created_at: '2024-05-10T14:30:00' },

    // Sinistro 20 — Responsabilidade Civil Construção (new)
    { id: crypto.randomUUID(), claim_id: claimIds[19], text: 'Processo muito recente. Queda de andaime comunicada pela construtora. Operário hospitalizado com fraturas. ACT (Autoridade para as Condições do Trabalho) notificada e já iniciou inquérito. Construtora a constituir advogado. Aguarda mais informações iniciais.', created_at: '2025-06-01T10:00:00' },
  ]

  for (const comment of comments) {
    insert.run(comment)
  }
}
