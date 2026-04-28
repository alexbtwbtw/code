import { db } from '../db'

export function seedClaimComments(claimIds: number[]): void {
  const insert = db.prepare(`
    INSERT INTO claim_comments (id, claim_id, text, created_at)
    VALUES (@id, @claim_id, @text, @created_at)
  `)

  const comments = [
    // Sinistro 0 — Danos Materiais (encerrado)
    { id: crypto.randomUUID(), claim_id: claimIds[0], text: 'Sinistro aberto após queda de árvore do lote vizinho durante tempestade de 2 de setembro. Contacto inicial estabelecido com os sinistrados, Sr. Paulo e Sra. Helena Rodrigues. Vistoria agendada para dia 10 de setembro com Eng. Ferreira. Sinistrados informados de que devem recolher fotos dos danos e qualquer relatório das autoridades.', created_at: '2025-09-05T10:30:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[0], text: 'Primeira vistoria realizada pelo Eng. António Ferreira. Danos na cobertura e vedação confirmados e totalmente consistentes com a queda de árvore. Relatório meteorológico do IPMA para o evento de 2 de setembro solicitado ao portal do IPMA. Dois orçamentos de empreiteiros de coberturas contactados.', created_at: '2025-09-10T16:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[0], text: 'Dois orçamentos recebidos: Coberturas Silva — €13.400; Obras e Telhados Lda — €14.100. Dentro do intervalo esperado. Orçamento mais baixo pré-aprovado condicionalmente. Agendada segunda vistoria para confirmar o trabalho após conclusão das obras.', created_at: '2025-09-20T11:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[0], text: 'Obras de reparação do telhado e vedação concluídas pelo empreiteiro. Segunda vistoria realizada pelo Eng. Ferreira em 15 de outubro — tudo conforme o orçamento aprovado. Tecto do quarto de casal em remediação de humidade. Processo a avançar para regularização.', created_at: '2025-10-15T14:30:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[0], text: 'Indemnização acordada de €13.200 processada. Sinistrados confirmaram acordo e assinaram declaração de quitação. Processo encerrado com satisfação dos sinistrados. Arquivo completo com todos os documentos.', created_at: '2025-12-10T10:00:00' },

    // Sinistro 1 — Incêndio Comercial (encerrado)
    { id: crypto.randomUUID(), claim_id: claimIds[1], text: 'Sinistro de incêndio reportado pela gestora da Loja Alma. Incêndio na madrugada de 10 de setembro, na arrecadação traseira. Bombeiros de Lisboa actuaram — relatório solicitado com urgência. Perita Dra. Carla Mendonça contactada para vistoria urgente. Loja encerrada por motivos de segurança.', created_at: '2025-09-12T09:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[1], text: 'Primeira vistoria realizada pela Dra. Mendonça a 18 de setembro. Causa confirmada: curto-circuito no quadro eléctrico de distribuição. Relatório técnico de incêndio entregue. Danos extensos no armazém e área de venda. Eng. Ferreira convocado para avaliação estrutural.', created_at: '2025-09-18T17:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[1], text: 'Relatório estrutural do Eng. Ferreira recebido: tectos do armazém e arrecadação requerem demolição e reconstrução. Estrutura do edifício OK. Inventário de stock e mobiliário destruído a realizar com técnico de contabilidade da Loja Alma. Segunda vistoria agendada.', created_at: '2025-10-05T11:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[1], text: 'Segunda vistoria concluída. Âmbito total de danos mapeado. Dois orçamentos de empreiteiros recebidos: €97.000 e €103.500. Reunião com Tranquilidade Seguros agendada para aprovação. Inventário de conteúdos validado pelo técnico de contabilidade da empresa.', created_at: '2025-10-22T15:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[1], text: 'Reunião com Tranquilidade realizada. Orçamento de €97.000 aprovado com margem de contingência de 5%. Autorização de obra emitida. Prazo estimado de conclusão: 3 meses. Acordo final de indemnização de €87.500 assinado. Processo encerrado em janeiro de 2026.', created_at: '2026-01-20T10:00:00' },

    // Sinistro 2 — Responsabilidade Civil (encerrado)
    { id: crypto.randomUUID(), claim_id: claimIds[2], text: 'Queda de utente reportada pelo ginásio FitLife. Sinistrada (Sra. Ana Ferreira, 38 anos) sofreu entorse grave do tornozelo na zona de passagem para a piscina. Câmeras de vigilância solicitadas com urgência. Perita Arq. Sofia Lopes convocada para vistoria ao local.', created_at: '2025-09-20T11:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[2], text: 'Vistoria realizada a 26 de setembro pela Arq. Lopes. Pavimento não conforme, sem tratamento antiderrapante certificado. Câmeras analisadas: confirmam ausência de sinalização e tapete no momento do acidente. Responsabilidade do ginásio inequívoca. Relatório técnico obtido.', created_at: '2025-09-26T17:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[2], text: 'Relatório médico da sinistrada recebido: fractura do tornozelo com necessidade de cirurgia de fixação interna. 6 semanas de imobilização e 8 semanas de fisioterapia. Advogado da sinistrada apresentou reclamação formal de €22.700. Proposta de acordo extrajudicial em preparação.', created_at: '2025-10-15T10:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[2], text: 'Proposta de acordo extrajudicial de €22.200 apresentada ao advogado da sinistrada. Detalhes: despesas médicas €9.500, incapacidade €3.200, danos morais €7.000, honorários de advogado €2.500. Prazo de resposta: 15 dias. Negociação em curso.', created_at: '2025-11-10T14:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[2], text: 'Acordo extrajudicial aceite pela sinistrada. Indemnização final de €24.500 (ajuste nos danos morais após contra-proposta). Pagamento processado. Processo encerrado em fevereiro de 2026. Ginásio comprometeu-se a instalar tapetes antiderrapantes certificados e sinalização permanente.', created_at: '2026-02-14T10:00:00' },

    // Sinistro 3 — Auto / assigned
    { id: crypto.randomUUID(), claim_id: claimIds[3], text: 'Colisão lateral reportada pelo sinistrado, Sr. Tiago Alves. Boletim de Acidente Amigável preenchido no local. Veículo rebocado para oficina autorizada Toyota em Cascais. Processo atribuído ao perito Eng. Paulo Rodrigues. Vistoria agendada para 10 de outubro.', created_at: '2025-10-03T11:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[3], text: 'Vistoria realizada pelo Eng. Rodrigues. Danos documentados: porta dianteira direita (substituição), porta traseira (reparação), jante e pneu traseiro direito (substituição), retrovisor direito (substituição). Orçamento da oficina Toyota a aguardar. Sinistrado informado do progresso.', created_at: '2025-10-10T16:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[3], text: 'Orçamento da oficina autorizada Toyota recebido: €18.600. Ligeiramente acima da estimativa do perito (€17.800). Diferença de €800 a analisar — provavelmente justificada pelo modelo exacto das peças de porta. A confirmar com o perito antes de aprovação final.', created_at: '2025-10-22T09:00:00' },

    // Sinistro 4 — Inundação Residencial / assigned
    { id: crypto.randomUUID(), claim_id: claimIds[4], text: 'Sinistro por inundação reportado. Chuvas de 14-15 de outubro causaram transbordo da Vala de Quiaios. Rés-do-chão inundado com 35 cm de água. Processo atribuído ao Eng. Rui Baptista para vistoria urgente. Sinistrados a residir provisoriamente em casa de familiares.', created_at: '2025-10-18T09:30:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[4], text: 'Vistoria realizada pelo Eng. Baptista a 28 de outubro. Danos confirmados e consistentes com o evento hidrológico. Tecto falso da cozinha em risco de colapso — autorizado empreiteiro de urgência para remoção preventiva. Relatório meteorológico do IPMA para o evento obtido e arquivado.', created_at: '2025-10-28T16:00:00' },

    // Sinistro 5 — Furto Joalharia / inspection_scheduled
    { id: crypto.randomUUID(), claim_id: claimIds[5], text: 'Assalto grave à ourivesaria reportado. PJ e PSP no local. Cofre-forte perfurado. Inventário urgente iniciado com o gerente. Perita Arq. Sofia Lopes contactada. Aguarda autorização da PJ para acesso ao local antes da vistoria pericial.', created_at: '2025-11-03T10:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[5], text: 'PJ autorizou acesso ao local após recolha de vestígios (72 horas). Vistoria agendada para 12 de novembro. Inventário preliminar elaborado pelo gerente com base nos registos da empresa: artigos avaliados em €145.000. Avaliador independente de joalharia contactado para participar na vistoria.', created_at: '2025-11-08T14:00:00' },

    // Sinistro 6 — Hotel / inspection_scheduled
    { id: crypto.randomUUID(), claim_id: claimIds[6], text: 'Sinistro reportado pelo director de manutenção do Hotel Quinta do Lago. Tempestade de 12 de novembro destruiu a cobertura da piscina exterior e danificou as claraboias do spa. Eng. Ferreira contactado para vistoria técnica. Instalações afectadas encerradas preventivamente.', created_at: '2025-11-15T10:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[6], text: 'Vistoria agendada para 25 de novembro com Eng. Ferreira e Arq. Lopes. Hotel disponibilizará projecto original das coberturas. Empreiteiro especializado em coberturas comerciais confirmado para avaliação simultânea. Relatório meteorológico do IPMA para evento de 12/11 solicitado.', created_at: '2025-11-20T09:00:00' },

    // Sinistro 7 — Incêndio Residencial Braga / inspected
    { id: crypto.randomUUID(), claim_id: claimIds[7], text: 'Incêndio na garagem reportado pelos sinistrados, Sr. António e Sra. Rosa Marques. Causa: carregador caseiro do veículo eléctrico. Bombeiros de Braga controlaram o fogo em 30 minutos. Perita Dra. Mendonça convocada para vistoria urgente. Automóvel destruído.', created_at: '2025-11-28T11:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[7], text: 'Vistoria realizada pela Dra. Mendonça a 5 de dezembro. Causa confirmada: sobrecarga no carregador caseiro não certificado. Automóvel: perda total. Parede de separação com danos estruturais — Eng. Ferreira convocado para avaliação complementar. Relatório de peritagem entregue a 12/12.', created_at: '2025-12-05T17:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[7], text: 'Relatório do Eng. Ferreira recebido: parede de separação requer demolição e reconstrução. Sem outros danos estruturais. Três orçamentos de empreiteiros solicitados para obras. Valor do automóvel destruído a consultar com perito automóvel para dano total. Processo em avaliação.', created_at: '2025-12-20T10:00:00' },

    // Sinistro 8 — Responsabilidade Civil Supermercado / inspected
    { id: crypto.randomUUID(), claim_id: claimIds[8], text: 'Queda de cliente idoso na entrada do supermercado reportada pelo gerente. Cliente transportado ao hospital. Câmeras de vigilância asseguradas. Arq. Sofia Lopes convocada para vistoria urgente ao local antes de qualquer modificação.', created_at: '2025-12-02T14:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[8], text: 'Vistoria realizada a 8 de dezembro. Arq. Lopes confirmou desnível de 4 cm não sinalizado — incumprimento do DL 163/2006. Responsabilidade inequívoca. Relatório médico do cliente obtido: fractura do rádio do pulso esquerdo. Proposta de acordo a preparar.', created_at: '2025-12-08T17:00:00' },

    // Sinistro 9 — Inundação Industrial Aveiro / inspected
    { id: crypto.randomUUID(), claim_id: claimIds[9], text: 'Inundação industrial grave reportada pelo director de operações do Armazém Logístico Central. Transbordo do Canal de São Roque inundou o armazém com 80 cm de água. Eng. Baptista e Eng. Ferreira mobilizados para vistoria urgente. Equipa de remediação contactada.', created_at: '2025-12-10T09:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[9], text: 'Primeira vistoria concluída a 15 de dezembro. Danos de grande escala confirmados. Stock e equipamento industrial gravemente afectados. Empresa de remediação industrial autorizada a iniciar secagem e desinfeção imediatamente para limitar danos secundários. Relatório técnico em preparação.', created_at: '2025-12-15T18:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[9], text: 'Segunda vistoria realizada a 8 de janeiro de 2026. Danos totais mapeados após secagem. Inventário de stock validado com auditoria ao WMS: 1.240 SKUs destruídos. Dois orçamentos de empreiteiros industriais recebidos. Processo a avançar para submissão à Fidelidade Seguros.', created_at: '2026-01-08T16:00:00' },

    // Sinistro 10 — Auto / report_pending
    { id: crypto.randomUUID(), claim_id: claimIds[10], text: 'Colisão frontal reportada pela sinistrada, Sra. Marta Pinto. Veículo rebocado para oficina autorizada Peugeot. Sinistrada com dores cervicais e lombares — aconselhada a consultar ortopedista com urgência. Perito Eng. Rodrigues convocado para avaliação.', created_at: '2025-12-18T10:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[10], text: 'Relatório provisório do perito automóvel recebido: danos graves na frente, possível dano na longarina. Orçamento da oficina Peugeot pendente. Relatório médico do ortopedista também pendente. Processo em espera de ambos os documentos para conclusão da avaliação.', created_at: '2025-12-28T11:00:00' },

    // Sinistro 11 — Furto Residencial Sintra / report_pending
    { id: crypto.randomUUID(), claim_id: claimIds[11], text: 'Furto durante férias de Natal reportado pelos sinistrados, Sr. Bruno e Sra. Filipa Castanheira. Participação na GNR de Sintra apresentada a 3 de janeiro. GNR confirmou arrombamento por janela lateral. Inventário preliminar de bens furtados apresentado.', created_at: '2026-01-07T14:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[11], text: 'Avaliador de joalharia independente contactado para estimativa das peças de joalharia furtadas. Faturas de compra do portátil e câmara obtidas pelos sinistrados. GNR informou que não há pistas sobre os autores. Relatório de peritagem de conteúdos em preparação.', created_at: '2026-01-20T10:00:00' },

    // Sinistro 12 — Danos Materiais Clínica / submitted
    { id: crypto.randomUUID(), claim_id: claimIds[12], text: 'Sinistro reportado pela administração da Clínica São Lucas. Rebentamento de tubagem no segundo andar durante o fim-de-semana de 10-11 de janeiro. Clínica parcialmente encerrada — segundo andar fora de serviço. Vistoria urgente agendada para Eng. Ferreira e Arq. Lopes.', created_at: '2026-01-13T09:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[12], text: 'Vistoria realizada a 17 de janeiro. Danos extensos no segundo andar e infiltrações no piso 1 confirmados. Empresa de secagem autorizada a intervir imediatamente. Dois orçamentos de empreiteiros especializados em clínicas solicitados. Processo a preparar para submissão.', created_at: '2026-01-17T17:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[12], text: 'Dois orçamentos recebidos: Construções Médicas Lda — €62.500; Obras Clínicas SA — €58.800. Valores dentro do esperado. Processo completo submetido à Fidelidade Seguros a 13 de fevereiro com toda a documentação. Aguarda perito da seguradora.', created_at: '2026-02-13T14:00:00' },

    // Sinistro 13 — Incêndio Residencial Porto / submitted
    { id: crypto.randomUUID(), claim_id: claimIds[13], text: 'Sinistro de incêndio reportado pelo Sr. João Nuno Figueiredo. Incêndio na madrugada de 23 de janeiro causado por vela esquecida. Apartamento com danos extensos na cozinha e sala. Sinistrado realojado temporariamente em alojamento local. Perita Dra. Mendonça convocada.', created_at: '2026-01-25T10:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[13], text: 'Vistoria realizada a 29 de janeiro pela Dra. Mendonça. Causa confirmada: vela acesa. Dolo excluído. Relatório dos Bombeiros Sapadores do Porto obtido. Âmbito dos danos mapeado. Orçamentos solicitados. Processo submetido à Tranquilidade a 24 de fevereiro.', created_at: '2026-02-24T11:00:00' },

    // Sinistro 14 — Auto Pesado / submitted
    { id: crypto.randomUUID(), claim_id: claimIds[14], text: 'Acidente de viação com camião pesado na A1 reportado pela empresa Transportes Raposos. Condutor ileso. Veículo imobilizado e rebocado para oficina de camiões em Alenquer. Perito Eng. Rodrigues convocado para avaliação urgente.', created_at: '2026-02-04T08:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[14], text: 'Vistoria realizada a 6 de fevereiro. Eng. Rodrigues confirmou dano total técnico. Custo de reparação estimado supera o valor venal do veículo. Relatório de avaliação de dano total submetido à Allianz com pedido de decisão sobre reparação vs. indemnização. Processo a aguardar decisão.', created_at: '2026-02-06T17:00:00' },

    // Sinistro 15 — Danos Materiais Residencial / new
    { id: crypto.randomUUID(), claim_id: claimIds[15], text: 'Processo recém-aberto. Danos no pátio e parede da habitação causados pelo temporal de 3 de março de 2026. Contacto inicial com a sinistrada, Sra. Isabel Neves. Documentação solicitada: fotos dos danos e relatório do condomínio sobre a queda de material da fachada.', created_at: '2026-03-05T11:00:00' },

    // Sinistro 16 — Furto Farmácia / new
    { id: crypto.randomUUID(), claim_id: claimIds[16], text: 'Assalto à farmácia reportado. PSP e INFARMED notificados. Câmeras de vigilância internas gravaram o assalto — ficheiros assegurados para entrega à PSP. Lista de medicamentos controlados furtados a elaborar com director técnico. Processo aberto com urgência.', created_at: '2026-03-17T09:30:00' },

    // Sinistro 17 — Colapso de Tecto Escola / new
    { id: crypto.randomUUID(), claim_id: claimIds[17], text: 'Colapso de tecto falso numa sala de aula reportado pela administração da escola. Ocorrência durante intervalo — sem feridos. Sala encerrada por razões de segurança. Restantes salas do segundo andar a ser inspeccionadas preventivamente. Processo aberto com urgência.', created_at: '2026-03-28T10:00:00' },

    // Sinistro 18 — Inundação Empreendimento / disputed
    { id: crypto.randomUUID(), claim_id: claimIds[18], text: 'Sinistro de grande escala reportado pela Empreendimentos Costa Vicentina. Inundação do empreendimento rural no Alentejo Litoral após chuvas de 25 de janeiro. Eng. Baptista convocado como perito da empresa. Fidelidade Seguros notificada com relatório preliminar.', created_at: '2026-01-30T10:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[18], text: 'Fidelidade Seguros enviou carta de reserva de cobertura, questionando se a inundação resultou de falha do sistema de drenagem e não do evento meteorológico. Vistoria conjunta com perito da seguradora (Eng. Ferreira) e da empresa (Eng. Baptista) realizada a 5 de fevereiro.', created_at: '2026-02-05T18:00:00' },
    { id: crypto.randomUUID(), claim_id: claimIds[18], text: 'Peritos apresentaram conclusões divergentes. Eng. Baptista sustenta que o evento foi excepcional e superior à capacidade de qualquer sistema de drenagem. Eng. Ferreira identificou subdimensionamento das valas. Processo em análise jurídica na Fidelidade. Advogado da empresa constituído. Mediação marcada para maio de 2026.', created_at: '2026-02-25T14:00:00' },

    // Sinistro 19 — Danos Materiais Residencial Alcochete / new
    { id: crypto.randomUUID(), claim_id: claimIds[19], text: 'Processo recém-aberto. Granizo e vento de 8 de abril causaram danos no telhado e portão da moradia em Alcochete. Contacto inicial com os sinistrados, Sr. Rui e Sra. Célia Domingues. Documentação a solicitar: relatório meteorológico do IPMA e fotos dos danos. Vistoria a agendar.', created_at: '2026-04-10T11:00:00' },
  ]

  for (const comment of comments) {
    insert.run(comment)
  }
}
