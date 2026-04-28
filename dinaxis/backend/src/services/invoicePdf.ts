import PDFDocument from 'pdfkit'
import { db } from '../db'
import { getStorageAdapter } from '../lib/storage'
import { getInvoiceById, getInvoiceItems } from './invoices'

function formatEur(amount: number): string {
  const abs = Math.abs(amount)
  const str = abs.toFixed(2).replace('.', ',')
  // Add thousands separators
  const [intPart, decPart] = str.split(',')
  const formatted = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (amount < 0 ? '-' : '') + '€' + formatted + ',' + decPart
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length)
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str.slice(-len) : ' '.repeat(len - str.length) + str
}

export async function generateInvoicePdf(invoiceId: string): Promise<Buffer> {
  const invoice = getInvoiceById(invoiceId)
  if (!invoice) throw new Error('Invoice not found: ' + invoiceId)

  const items = getInvoiceItems(invoiceId)

  // Look up claim + insurer
  const claim = db.prepare('SELECT claim_number, claimant_name, insurer_id FROM claims WHERE id = ?').get(invoice.claimId) as
    { claim_number: string; claimant_name: string; insurer_id: number | null } | undefined

  let insurerName = ''
  if (claim?.insurer_id) {
    const ins = db.prepare('SELECT name FROM insurers WHERE id = ?').get(claim.insurer_id) as { name: string } | undefined
    insurerName = ins?.name ?? ''
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(chunks)

      // Save to storage
      try {
        const adapter = getStorageAdapter()
        const adapterType = process.env.STORAGE ?? 'blob'
        const key = await adapter.save(`invoices/${invoiceId}.pdf`, pdfBuffer, 'application/pdf')
        db.prepare("UPDATE invoices SET pdf_storage_key = ?, pdf_storage_adapter = ?, updated_at = datetime('now') WHERE id = ?")
          .run(key, adapterType, invoiceId)
      } catch {
        // Non-fatal: we still return the buffer
      }

      resolve(pdfBuffer)
    })
    doc.on('error', reject)

    const pageWidth = doc.page.width - 100 // accounting for 50px margins each side

    // ── Header ──────────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(28).text('FATURA', 50, 50)
    doc.font('Helvetica').fontSize(11)

    const statusMap: Record<string, string> = { draft: 'Rascunho', sent: 'Enviada', paid: 'Paga' }
    doc.text(`Nº: ${invoice.invoiceNumber}`, 50, 90)
    doc.text(`Estado: ${statusMap[invoice.status] ?? invoice.status}`, 50, 106)

    // ── Dates ────────────────────────────────────────────────────────────────
    doc.text(`Data de Emissão: ${invoice.issuedDate}`, 50, 130)
    if (invoice.dueDate) {
      doc.text(`Data de Vencimento: ${invoice.dueDate}`, 50, 146)
    }

    // ── Claim & insurer info ─────────────────────────────────────────────────
    let yPos = invoice.dueDate ? 178 : 162
    if (claim) {
      doc.font('Helvetica-Bold').text('Sinistro', 50, yPos)
      doc.font('Helvetica')
      yPos += 16
      doc.text(`Nº do Sinistro: ${claim.claim_number}`, 50, yPos)
      yPos += 14
      if (claim.claimant_name) {
        doc.text(`Sinistrado: ${claim.claimant_name}`, 50, yPos)
        yPos += 14
      }
      if (insurerName) {
        doc.text(`Seguradora: ${insurerName}`, 50, yPos)
        yPos += 14
      }
    }

    // ── Divider ──────────────────────────────────────────────────────────────
    yPos += 8
    doc.moveTo(50, yPos).lineTo(50 + pageWidth, yPos).strokeColor('#cccccc').stroke()
    yPos += 16

    // ── Items table header ───────────────────────────────────────────────────
    const colDesc = 50
    const colQty = 320
    const colUnit = 380
    const colTotal = 460

    doc.font('Helvetica-Bold').fontSize(10)
    doc.text('Descrição', colDesc, yPos, { width: 260 })
    doc.text('Qtd', colQty, yPos, { width: 55, align: 'right' })
    doc.text('Preço Unit.', colUnit, yPos, { width: 75, align: 'right' })
    doc.text('Total', colTotal, yPos, { width: 90, align: 'right' })

    yPos += 14
    doc.moveTo(50, yPos).lineTo(50 + pageWidth, yPos).strokeColor('#999999').stroke()
    yPos += 10

    // ── Items rows ───────────────────────────────────────────────────────────
    doc.font('Helvetica').fontSize(10)
    for (const item of items) {
      const descText = item.description.length > 55 ? item.description.slice(0, 52) + '...' : item.description
      doc.text(descText, colDesc, yPos, { width: 260 })
      doc.text(String(item.quantity), colQty, yPos, { width: 55, align: 'right' })
      doc.text(formatEur(item.unitPrice), colUnit, yPos, { width: 75, align: 'right' })
      doc.text(formatEur(item.amount), colTotal, yPos, { width: 90, align: 'right' })
      yPos += 18
    }

    // ── Subtotal ──────────────────────────────────────────────────────────────
    yPos += 4
    doc.moveTo(50, yPos).lineTo(50 + pageWidth, yPos).strokeColor('#cccccc').stroke()
    yPos += 12

    doc.font('Helvetica-Bold').fontSize(11)
    doc.text('Total', colUnit, yPos, { width: 75, align: 'right' })
    doc.text(formatEur(invoice.totalAmount), colTotal, yPos, { width: 90, align: 'right' })
    yPos += 24

    // ── Notes ─────────────────────────────────────────────────────────────────
    if (invoice.notes) {
      doc.font('Helvetica-Bold').fontSize(10).text('Observações', 50, yPos)
      yPos += 14
      doc.font('Helvetica').fontSize(10).text(invoice.notes, 50, yPos, { width: pageWidth })
      yPos += doc.heightOfString(invoice.notes, { width: pageWidth }) + 16
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 60
    doc.moveTo(50, footerY).lineTo(50 + pageWidth, footerY).strokeColor('#eeeeee').stroke()
    doc.font('Helvetica').fontSize(9).fillColor('#888888')
      .text('Gerado por Dinaxis', 50, footerY + 10, { width: pageWidth, align: 'center' })

    doc.end()
  })
}
