import PDFDocument from 'pdfkit'
import { db } from '../db'
import { randomUUID } from 'crypto'

async function createPdf(content: (doc: InstanceType<typeof PDFDocument>) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    content(doc)
    doc.end()
  })
}

function storePdf(buf: Buffer): string {
  const key = randomUUID()
  db.prepare('INSERT INTO document_blobs (id, data) VALUES (?, ?)').run(key, buf.toString('base64'))
  return key
}

interface ClaimMeta {
  claimNumber: string
  claimantName: string
  claimType: string
  description: string
  address: string
  eventDate: string
}

const claimMetas: ClaimMeta[] = [
  { claimNumber: 'CLM-2025-0001', claimantName: 'Paulo e Helena Rodrigues', claimType: 'Danos Materiais — Queda de Árvore', description: 'Queda de árvore do lote vizinho sobre o telhado e vedação durante tempestade de vento forte em 2 de setembro de 2025.', address: 'Rua das Flores, 34, 2900-443 Setúbal', eventDate: '02/09/2025' },
  { claimNumber: 'CLM-2025-0002', claimantName: 'Loja de Decoração Alma, Lda.', claimType: 'Incêndio — Instalação Eléctrica', description: 'Incêndio originado em instalação eléctrica defeituosa na arrecadação traseira da loja, com propagação ao armazém e área de venda.', address: 'Rua Augusta, 210, 1100-055 Lisboa', eventDate: '10/09/2025' },
  { claimNumber: 'CLM-2025-0003', claimantName: 'Ginásio FitLife, Lda.', claimType: 'Responsabilidade Civil — Queda de Utente', description: 'Queda de utente na zona de passagem para a piscina coberta por pavimento molhado sem sinalização adequada.', address: 'Av. de Roma, 45, 1700-340 Lisboa', eventDate: '18/09/2025' },
  { claimNumber: 'CLM-2025-0004', claimantName: 'Tiago Ferreira Alves', claimType: 'Automóvel — Colisão Lateral', description: 'Colisão lateral com veículo que invadiu a faixa de rodagem na EN6 em Cascais.', address: 'EN6 — Cascais', eventDate: '01/10/2025' },
  { claimNumber: 'CLM-2025-0005', claimantName: 'Cristina e Manuel Saraiva', claimType: 'Inundação — Transbordo de Curso de Água', description: 'Inundação do rés-do-chão por transbordo da Vala de Quiaios durante precipitação extrema de 14-15 de outubro de 2025.', address: 'Beco da Ribeira, 7, 3080-820 Figueira da Foz', eventDate: '14/10/2025' },
  { claimNumber: 'CLM-2025-0006', claimantName: 'Ourivesaria Dourada, Lda.', claimType: 'Furto — Assalto com Arrombamento', description: 'Assalto nocturno com arrombamento da porta traseira e perfuração do cofre-forte. Joias, relógios e numerário furtados.', address: 'Rua de Santa Catarina, 101, 4000-451 Porto', eventDate: '01/11/2025' },
  { claimNumber: 'CLM-2025-0007', claimantName: 'Hotel Quinta do Lago, S.A.', claimType: 'Danos Materiais — Granizo e Vento', description: 'Destruição da cobertura de policarbonato da piscina exterior e danos nas claraboias do spa por granizo e vento forte.', address: 'Quinta do Lago, Almancil, 8135-024 Loulé', eventDate: '12/11/2025' },
  { claimNumber: 'CLM-2025-0008', claimantName: 'António e Rosa Marques', claimType: 'Incêndio — Carregador Eléctrico', description: 'Incêndio na garagem por sobrecarga no carregador caseiro de veículo eléctrico não homologado.', address: 'Travessa do Outeiro, 22, 4710-400 Braga', eventDate: '26/11/2025' },
  { claimNumber: 'CLM-2025-0009', claimantName: 'Supermercado Frescos & Co., Lda.', claimType: 'Responsabilidade Civil — Queda de Cliente', description: 'Queda de cliente idoso na entrada do supermercado por desnível não sinalizado entre passeio e pavimento interior.', address: 'Rua do Centro Comercial, 33, 2745-212 Queluz', eventDate: '30/11/2025' },
  { claimNumber: 'CLM-2025-0010', claimantName: 'Armazém Logístico Central, S.A.', claimType: 'Inundação — Transbordo de Canal', description: 'Inundação industrial por transbordo do Canal de São Roque. Armazém de 3.200 m² com 80 cm de água durante 12 horas.', address: 'Zona Industrial Norte, Lote 8, 3800-533 Aveiro', eventDate: '07/12/2025' },
]

const repairCompanies = [
  { name: 'Coberturas Silva & Filhos, Lda.', nif: '509 123 456', address: 'Rua das Indústrias, 45, 2900-502 Setúbal' },
  { name: 'Construções e Reparações Lisboa, Lda.', nif: '510 234 567', address: 'Av. Almirante Reis, 120, 1150-014 Lisboa' },
  { name: 'RC — Reparações Comerciais, Lda.', nif: '511 345 678', address: 'Rua do Benformoso, 80, 1100-085 Lisboa' },
  { name: 'AutoPeritos & Oficina, Lda.', nif: '512 456 789', address: 'EN6, Km 12, 2750-800 Cascais' },
  { name: 'Hidro Construções, Lda.', nif: '513 567 890', address: 'Rua do Mondego, 55, 3080-910 Figueira da Foz' },
  { name: 'Obras de Segurança, Lda.', nif: '514 678 901', address: 'Rua do Comércio, 200, 4000-560 Porto' },
  { name: 'Coberturex — Coberturas Comerciais, SA', nif: '515 789 012', address: 'Zona Industrial de Almancil, Lote 3, 8135-020 Loulé' },
  { name: 'Norte Construções, Lda.', nif: '516 890 123', address: 'Rua da Industria, 12, 4710-200 Braga' },
  { name: 'Construções Queluz, Lda.', nif: '517 901 234', address: 'Rua da Av. António Enes, 22, 2745-020 Queluz' },
  { name: 'Industrial Construções Aveiro, SA', nif: '518 012 345', address: 'Zona Industrial Norte, Lote 2, 3800-520 Aveiro' },
]

const repairItems: Array<Array<{ desc: string; qty: string; unit: string; total: string }>> = [
  // CLM-2025-0001 (Danos Materiais — telhado)
  [
    { desc: 'Substituição de telhas cerâmicas Marselha (18 m²)', qty: '18', unit: '85,00 €/m²', total: '1.530,00 €' },
    { desc: 'Substituição de frechal de pinho tratado (2,4 m)', qty: '2,4', unit: '280,00 €/m', total: '672,00 €' },
    { desc: 'Caleiras e rufos de zinco 0,65 mm', qty: '12', unit: '95,00 €/m', total: '1.140,00 €' },
    { desc: 'Reconstrução de vedação de alvenaria (8 m)', qty: '8', unit: '220,00 €/m', total: '1.760,00 €' },
    { desc: 'Mão de obra especializada (3 dias)', qty: '3', unit: '480,00 €/dia', total: '1.440,00 €' },
  ],
  // CLM-2025-0002 (Incêndio — loja)
  [
    { desc: 'Demolição e reconstrução da arrecadação', qty: '1', unit: '36.500,00 €', total: '36.500,00 €' },
    { desc: 'Limpeza profissional de fumo (180 m²)', qty: '180', unit: '55,00 €/m²', total: '9.900,00 €' },
    { desc: 'Substituição de tecto falso do armazém (120 m²)', qty: '120', unit: '62,00 €/m²', total: '7.440,00 €' },
    { desc: 'Novo quadro eléctrico certificado', qty: '1', unit: '8.500,00 €', total: '8.500,00 €' },
    { desc: 'Mão de obra (10 dias)', qty: '10', unit: '550,00 €/dia', total: '5.500,00 €' },
  ],
  // CLM-2025-0003 (RC — ginásio)
  [
    { desc: 'Pavimento antiderrapante certificado (8 m²)', qty: '8', unit: '180,00 €/m²', total: '1.440,00 €' },
    { desc: 'Instalação de tapetes e sinalização permanente', qty: '1', unit: '620,00 €', total: '620,00 €' },
    { desc: 'Mão de obra', qty: '1', unit: '350,00 €', total: '350,00 €' },
  ],
  // CLM-2025-0004 (Auto)
  [
    { desc: 'Substituição porta dianteira direita Toyota Corolla', qty: '1', unit: '3.200,00 €', total: '3.200,00 €' },
    { desc: 'Reparação porta traseira direita + pintura', qty: '1', unit: '1.800,00 €', total: '1.800,00 €' },
    { desc: 'Jante liga leve 17" Toyota original', qty: '1', unit: '580,00 €', total: '580,00 €' },
    { desc: 'Pneu Michelin Primacy 225/55R17 + montagem', qty: '1', unit: '280,00 €', total: '280,00 €' },
    { desc: 'Retrovisor eléctrico direito original', qty: '1', unit: '390,00 €', total: '390,00 €' },
    { desc: 'Mão de obra e pintura de acabamento', qty: '1', unit: '1.400,00 €', total: '1.400,00 €' },
  ],
  // CLM-2025-0005 (Inundação residencial)
  [
    { desc: 'Secagem e desumidificação (5 dias)', qty: '5', unit: '760,00 €/dia', total: '3.800,00 €' },
    { desc: 'Remoção e substituição tecto falso cozinha (25 m²)', qty: '25', unit: '112,00 €/m²', total: '2.800,00 €' },
    { desc: 'Reparação mosaico sala e corredor (42 m²)', qty: '42', unit: '107,00 €/m²', total: '4.494,00 €' },
    { desc: 'Reboco e pintura de paredes (60 m²)', qty: '60', unit: '85,00 €/m²', total: '5.100,00 €' },
    { desc: 'Substituição de tomadas eléctricas (8 un.)', qty: '8', unit: '220,00 €/un.', total: '1.760,00 €' },
  ],
  // CLM-2025-0006 (Furto joalharia)
  [
    { desc: 'Instalação de cofre-forte EN 1143-1 Grau 4', qty: '1', unit: '8.200,00 €', total: '8.200,00 €' },
    { desc: 'Sistema de alarme certificado Grau 3', qty: '1', unit: '7.800,00 €', total: '7.800,00 €' },
    { desc: 'Câmeras de alta resolução (6 un.)', qty: '6', unit: '450,00 €/un.', total: '2.700,00 €' },
    { desc: 'Substituição porta traseira de segurança RC3', qty: '1', unit: '3.200,00 €', total: '3.200,00 €' },
    { desc: 'Mão de obra e instalação', qty: '1', unit: '1.800,00 €', total: '1.800,00 €' },
  ],
  // CLM-2025-0007 (Hotel — cobertura)
  [
    { desc: 'Policarbonato alveolar 16mm UV (280 m²)', qty: '280', unit: '95,00 €/m²', total: '26.600,00 €' },
    { desc: 'Estrutura de alumínio de suporte', qty: '1', unit: '8.400,00 €', total: '8.400,00 €' },
    { desc: 'Substituição de 4 claraboias (vidro temperado)', qty: '4', unit: '3.800,00 €/un.', total: '15.200,00 €' },
    { desc: 'Reparação de caleiras e rufos (40 m)', qty: '40', unit: '120,00 €/m', total: '4.800,00 €' },
    { desc: 'Mão de obra especializada (8 dias)', qty: '8', unit: '650,00 €/dia', total: '5.200,00 €' },
  ],
  // CLM-2025-0008 (Incêndio garagem Braga)
  [
    { desc: 'Demolição e reconstrução da parede de betão', qty: '1', unit: '11.500,00 €', total: '11.500,00 €' },
    { desc: 'Limpeza de fuligem e tratamento da garagem', qty: '1', unit: '4.200,00 €', total: '4.200,00 €' },
    { desc: 'Pintura hall de entrada e corredor', qty: '1', unit: '2.800,00 €', total: '2.800,00 €' },
    { desc: 'Mão de obra (4 dias)', qty: '4', unit: '480,00 €/dia', total: '1.920,00 €' },
  ],
  // CLM-2025-0009 (RC supermercado)
  [
    { desc: 'Rampa de acesso certificada DL 163/2006', qty: '1', unit: '1.800,00 €', total: '1.800,00 €' },
    { desc: 'Pavimento antiderrapante entrada (12 m²)', qty: '12', unit: '145,00 €/m²', total: '1.740,00 €' },
    { desc: 'Sinalização de segurança (conjunto)', qty: '1', unit: '320,00 €', total: '320,00 €' },
    { desc: 'Mão de obra', qty: '1', unit: '480,00 €', total: '480,00 €' },
  ],
  // CLM-2025-0010 (Inundação industrial Aveiro)
  [
    { desc: 'Remediação industrial — secagem e desinfeção', qty: '3200', unit: '12,50 €/m²', total: '40.000,00 €' },
    { desc: 'Substituição sistema eléctrico completo', qty: '1', unit: '58.000,00 €', total: '58.000,00 €' },
    { desc: 'Linhas de paletização automática (2 un.)', qty: '2', unit: '47.500,00 €/un.', total: '95.000,00 €' },
    { desc: 'Empilhador eléctrico Toyota 1,5T', qty: '1', unit: '28.000,00 €', total: '28.000,00 €' },
    { desc: 'Reparação de pavimento de betão (200 m²)', qty: '200', unit: '40,00 €/m²', total: '8.000,00 €' },
  ],
]

const repairTotals = [
  '6.964,00 €', '67.840,00 €', '2.410,00 €', '7.650,00 €', '17.954,00 €',
  '23.700,00 €', '60.200,00 €', '20.420,00 €', '4.340,00 €', '229.000,00 €',
]

export async function seedDocuments(claimIds: number[], claimNumbers: string[]): Promise<void> {
  const insertDoc = db.prepare(`
    INSERT INTO documents (id, claim_id, filename, mime_type, storage_key, storage_adapter, size_bytes, label, description)
    VALUES (@id, @claim_id, @filename, @mime_type, @storage_key, @storage_adapter, @size_bytes, @label, @description)
  `)

  for (let i = 0; i < Math.min(10, claimIds.length); i++) {
    const claimId = claimIds[i]
    const meta = claimMetas[i]!
    const company = repairCompanies[i]!
    const items = repairItems[i]!
    const total = repairTotals[i]!
    const today = new Date().toLocaleDateString('pt-PT')

    // 1. Relatório de Peritagem PDF
    const relatorioBuffer = await createPdf(doc => {
      doc.fontSize(18).font('Helvetica-Bold').text('RELATÓRIO DE PERITAGEM', { align: 'center' })
      doc.moveDown(0.5)
      doc.fontSize(10).font('Helvetica').fillColor('#666666').text('Dinaxis — Gestão de Sinistros', { align: 'center' })
      doc.fillColor('#000000')
      doc.moveDown(1)

      // Header line
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke()
      doc.moveDown(0.8)

      doc.fontSize(11).font('Helvetica-Bold').text('1. IDENTIFICAÇÃO DO SINISTRO')
      doc.moveDown(0.4)
      doc.font('Helvetica').fontSize(10)
      doc.text(`Referência do Sinistro:  ${meta.claimNumber}`)
      doc.text(`Tipo de Sinistro:         ${meta.claimType}`)
      doc.text(`Sinistrado:              ${meta.claimantName}`)
      doc.text(`Local do Sinistro:       ${meta.address}`)
      doc.text(`Data do Evento:          ${meta.eventDate}`)
      doc.text(`Data de Emissão:         ${today}`)
      doc.moveDown(1)

      doc.font('Helvetica-Bold').fontSize(11).text('2. DESCRIÇÃO DO EVENTO E DOS DANOS')
      doc.moveDown(0.4)
      doc.font('Helvetica').fontSize(10).text(meta.description, { width: 495 })
      doc.moveDown(0.6)
      doc.text('Após vistoria técnica ao local do sinistro, foram identificados e documentados os seguintes danos: deterioração e destruição de elementos da construção e/ou conteúdos afectados pelo evento participado. Os danos são consistentes com a causa e circunstâncias descritas na participação inicial do sinistro.', { width: 495 })
      doc.moveDown(1)

      doc.font('Helvetica-Bold').fontSize(11).text('3. AVALIAÇÃO TÉCNICA')
      doc.moveDown(0.4)
      doc.font('Helvetica').fontSize(10).text('A inspecção foi realizada com rigor técnico e documental. Os danos foram fotografados e medidos. O relatório completo com registo fotográfico encontra-se arquivado no dossier do sinistro.', { width: 495 })
      doc.moveDown(1)

      doc.font('Helvetica-Bold').fontSize(11).text('4. CONCLUSÃO')
      doc.moveDown(0.4)
      doc.font('Helvetica').fontSize(10).text('Os danos avaliados têm origem directa no evento participado. A causa é consistente com as circunstâncias declaradas. Recomenda-se a aprovação dos orçamentos de reparação dentro do âmbito descrito neste relatório, sujeito à verificação dos orçamentos por parte da seguradora.', { width: 495 })
      doc.moveDown(2)

      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke()
      doc.moveDown(0.8)
      doc.fontSize(10).font('Helvetica')
      doc.text('Assinatura do Perito: ___________________________________')
      doc.moveDown(0.4)
      doc.text(`Data: ${today}`)
      doc.moveDown(0.4)
      doc.text('Número de Registo: _____________________')
    })

    const relatorioKey = storePdf(relatorioBuffer)
    insertDoc.run({
      id: randomUUID(),
      claim_id: claimId,
      filename: `Relatorio_Peritagem_${meta.claimNumber}.pdf`,
      mime_type: 'application/pdf',
      storage_key: relatorioKey,
      storage_adapter: 'blob',
      size_bytes: relatorioBuffer.length,
      label: 'Relatório de Peritagem',
      description: `Relatório técnico de peritagem elaborado após vistoria ao local do sinistro ${meta.claimNumber}.`,
    })

    // 2. Recibo de Reparação PDF
    const reciboBuffer = await createPdf(doc => {
      doc.fontSize(16).font('Helvetica-Bold').text('RECIBO DE REPARAÇÃO', { align: 'center' })
      doc.moveDown(0.3)
      doc.fontSize(9).font('Helvetica').fillColor('#666666').text(`${company.name}  |  NIF: ${company.nif}  |  ${company.address}`, { align: 'center' })
      doc.fillColor('#000000')
      doc.moveDown(0.8)

      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#999999').stroke()
      doc.moveDown(0.6)

      doc.fontSize(10).font('Helvetica-Bold').text(`Referência:   REC-${meta.claimNumber}`)
      doc.font('Helvetica').text(`Sinistro Nº:  ${meta.claimNumber}`)
      doc.text(`Sinistrado:   ${meta.claimantName}`)
      doc.text(`Data de Emissão: ${today}`)
      doc.text(`Condições de Pagamento: 30 dias após aprovação pela seguradora`)
      doc.moveDown(0.8)

      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke()
      doc.moveDown(0.5)

      doc.font('Helvetica-Bold').fontSize(10)
      doc.text('Descrição dos Trabalhos', 50, doc.y, { width: 280 })
      doc.text('Qtd.', 340, doc.y - 12, { width: 60, align: 'right' })
      doc.text('Preço Unit.', 400, doc.y - 12, { width: 85, align: 'right' })
      doc.text('Total', 485, doc.y - 12, { width: 60, align: 'right' })
      doc.moveDown(0.3)
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#999999').stroke()
      doc.moveDown(0.4)

      doc.font('Helvetica').fontSize(9)
      for (const item of items) {
        doc.text(item.desc, 50, doc.y, { width: 280 })
        doc.text(item.qty, 340, doc.y - 11, { width: 60, align: 'right' })
        doc.text(item.unit, 400, doc.y - 11, { width: 85, align: 'right' })
        doc.text(item.total, 485, doc.y - 11, { width: 60, align: 'right' })
        doc.moveDown(0.3)
      }

      doc.moveDown(0.4)
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke()
      doc.moveDown(0.5)

      doc.font('Helvetica-Bold').fontSize(11).text(`TOTAL (IVA 23% incluído): ${total}`, { align: 'right' })
      doc.moveDown(2)

      doc.font('Helvetica').fontSize(8).fillColor('#888888').text('Documento emitido electronicamente. Válido sem assinatura manuscrita. O presente recibo é emitido para efeitos de regularização do sinistro indicado. O pagamento fica condicionado à aprovação por parte da seguradora.', { align: 'center', width: 495 })
    })

    const reciboKey = storePdf(reciboBuffer)
    insertDoc.run({
      id: randomUUID(),
      claim_id: claimId,
      filename: `Recibo_Reparacao_${meta.claimNumber}.pdf`,
      mime_type: 'application/pdf',
      storage_key: reciboKey,
      storage_adapter: 'blob',
      size_bytes: reciboBuffer.length,
      label: 'Recibo de Reparação',
      description: `Recibo de reparação emitido pela empresa contratada para as obras do sinistro ${meta.claimNumber}.`,
    })

    // 3. Declaração de Danos (for claims 0-4) or Relatório Fotográfico placeholder (for 5-9)
    if (i < 5) {
      // Declaração do sinistrado
      const declaracaoBuffer = await createPdf(doc => {
        doc.fontSize(16).font('Helvetica-Bold').text('DECLARAÇÃO DO SINISTRADO', { align: 'center' })
        doc.moveDown(1)
        doc.font('Helvetica').fontSize(10)
        doc.text(`O(a) abaixo assinado(a), ${meta.claimantName}, na qualidade de sinistrado(a) no processo ${meta.claimNumber}, declara para os devidos efeitos que:`, { width: 495 })
        doc.moveDown(0.8)
        doc.text(`1. O evento sinistrado ocorreu em ${meta.eventDate}, conforme descrito na participação de sinistro.`, { width: 495 })
        doc.moveDown(0.4)
        doc.text(`2. Os danos descritos neste processo resultam directamente do evento acima referido e não de causas anteriores ou pré-existentes.`, { width: 495 })
        doc.moveDown(0.4)
        doc.text('3. Toda a informação e documentação fornecida ao perito e à seguradora é verídica e completa, não havendo omissões relevantes do conhecimento do declarante.', { width: 495 })
        doc.moveDown(0.4)
        doc.text('4. O declarante autoriza a seguradora e os seus representantes a efectuarem todas as vistorias e diligências necessárias à avaliação e regularização do sinistro.', { width: 495 })
        doc.moveDown(2)
        doc.text(`Local e Data: _________________________, ${today}`)
        doc.moveDown(1.5)
        doc.text('Assinatura: _______________________________')
        doc.moveDown(0.5)
        doc.text(`Nome: ${meta.claimantName}`)
        doc.moveDown(0.5)
        doc.text('NIF: _______________________')
      })

      const declaracaoKey = storePdf(declaracaoBuffer)
      insertDoc.run({
        id: randomUUID(),
        claim_id: claimId,
        filename: `Declaracao_Sinistrado_${meta.claimNumber}.pdf`,
        mime_type: 'application/pdf',
        storage_key: declaracaoKey,
        storage_adapter: 'blob',
        size_bytes: declaracaoBuffer.length,
        label: 'Declaração do Sinistrado',
        description: `Declaração do sinistrado confirmando as circunstâncias do evento e autorizando as diligências necessárias.`,
      })
    } else {
      // Relatório Fotográfico de Danos
      const fotoBuffer = await createPdf(doc => {
        doc.fontSize(16).font('Helvetica-Bold').text('RELATÓRIO FOTOGRÁFICO DE DANOS', { align: 'center' })
        doc.moveDown(0.5)
        doc.fontSize(10).font('Helvetica').fillColor('#666666').text(`Sinistro ${meta.claimNumber} — ${meta.claimType}`, { align: 'center' })
        doc.fillColor('#000000')
        doc.moveDown(1)

        doc.font('Helvetica-Bold').fontSize(11).text('NOTA INTRODUTÓRIA')
        doc.moveDown(0.4)
        doc.font('Helvetica').fontSize(10).text('O presente documento constitui o índice do registo fotográfico dos danos observados durante a vistoria ao local do sinistro. O arquivo fotográfico completo em alta resolução encontra-se disponível no dossier digital do sinistro.', { width: 495 })
        doc.moveDown(0.8)

        doc.font('Helvetica-Bold').fontSize(11).text('ÍNDICE DE FOTOGRAFIAS')
        doc.moveDown(0.4)
        const fotoDescriptions = [
          'Foto 01 — Vista geral do local do sinistro (exterior/fachada principal)',
          'Foto 02 — Zona de impacto/origem do sinistro (plano médio)',
          'Foto 03 — Detalhe dos danos — elemento estrutural/conteúdo principal afectado',
          'Foto 04 — Medição da extensão dos danos (régua de referência visível)',
          'Foto 05 — Vista aérea/de planta dos danos (quando aplicável)',
          'Foto 06 — Elementos secundários afectados',
          'Foto 07 — Estado dos elementos adjacentes não danificados (referência)',
          'Foto 08 — Pormenor de causa identificada pelo perito',
        ]
        doc.font('Helvetica').fontSize(10)
        for (const f of fotoDescriptions) {
          doc.text(`  ◦  ${f}`, { width: 495 })
          doc.moveDown(0.25)
        }
        doc.moveDown(0.8)

        doc.font('Helvetica-Bold').fontSize(11).text('OBSERVAÇÕES DO PERITO')
        doc.moveDown(0.4)
        doc.font('Helvetica').fontSize(10).text(`O registo fotográfico foi efectuado pelo perito responsável durante a vistoria ao local do sinistro ${meta.claimNumber}. As fotografias documentam a extensão e natureza dos danos de forma objectiva e imparcial, servindo de suporte ao relatório técnico de peritagem.`, { width: 495 })
        doc.moveDown(1.5)

        doc.text(`Data da vistoria: ${today}`)
        doc.text('Perito responsável: Ver relatório de peritagem associado')
      })

      const fotoKey = storePdf(fotoBuffer)
      insertDoc.run({
        id: randomUUID(),
        claim_id: claimId,
        filename: `Relatorio_Fotografico_${meta.claimNumber}.pdf`,
        mime_type: 'application/pdf',
        storage_key: fotoKey,
        storage_adapter: 'blob',
        size_bytes: fotoBuffer.length,
        label: 'Relatório Fotográfico',
        description: `Índice e descrição do registo fotográfico dos danos efectuado na vistoria ao sinistro ${meta.claimNumber}.`,
      })
    }
  }
}
