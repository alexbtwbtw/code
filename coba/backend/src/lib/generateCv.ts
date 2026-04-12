import PDFDocument from 'pdfkit'

export type CvMember = {
  name: string
  title: string
  email: string
  phone: string
  bio: string
  history: {
    projectName: string
    country: string
    macroRegion: string
    category: string
    startDate?: string | null
    endDate?: string | null
    notes: string
    geoEntries?: {
      pointLabel: string
      type: string
      soilType?: string | null
      rockType?: string | null
      depth?: number | null
    }[]
    structures?: {
      label: string
      type: string
      material?: string | null
      lengthM?: number | null
      heightM?: number | null
      spanM?: number | null
    }[]
  }[]
}

const MARGIN = 56
const NAVY   = '#0d2240'
const BLUE   = '#2c5f8a'
const STEEL  = '#557799'
const DARK   = '#222222'
const MID    = '#444444'
const LIGHT  = '#888888'
const RULE   = '#2c5f8a'
const SUBRULE = '#d0d8e4'

/** Generate a PDF CV for a team member. Returns a Buffer of the PDF bytes. */
export function generateCvPdf(member: CvMember): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', autoFirstPage: true })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = doc.page.width - MARGIN * 2   // usable width (A4 = 595pt → W = 483pt)
    const pageH = doc.page.height            // 841pt

    // ── Helper: add footer to every page ──────────────────────────────────────
    function addFooter(pageNum: number) {
      const savedY = doc.y
      doc
        .fontSize(7.5).font('Helvetica').fillColor('#aaaaaa')
        .text(
          `COBA — Curriculum Vitae — ${member.name}`,
          MARGIN, pageH - 38,
          { width: W / 2, align: 'left' }
        )
        .text(
          `Página ${pageNum}`,
          MARGIN + W / 2, pageH - 38,
          { width: W / 2, align: 'right' }
        )
      // restore cursor (footer is outside flow)
      doc.y = savedY
    }

    // Track pages for numbering
    let pageNum = 1
    doc.on('pageAdded', () => {
      pageNum++
    })

    // ── Header block ──────────────────────────────────────────────────────────
    doc
      .fontSize(22).font('Helvetica-Bold').fillColor(NAVY)
      .text(member.name, MARGIN, MARGIN, { width: W })

    doc
      .fontSize(13).font('Helvetica').fillColor(BLUE)
      .text(member.title || '', { width: W })
      .moveDown(0.4)

    // Contact row: email  |  phone
    const contactParts: string[] = []
    if (member.email) contactParts.push(member.email)
    if (member.phone) contactParts.push(member.phone)
    if (contactParts.length) {
      doc
        .fontSize(9).font('Helvetica').fillColor('#555555')
        .text(contactParts.join('   |   '), { width: W })
    }

    // ── Horizontal rule ───────────────────────────────────────────────────────
    doc.moveDown(0.6)
    const ruleY = doc.y
    doc
      .moveTo(MARGIN, ruleY)
      .lineTo(MARGIN + W, ruleY)
      .strokeColor(RULE).lineWidth(2).stroke()
    doc.moveDown(0.8)

    // ── Profile / Bio section ─────────────────────────────────────────────────
    if (member.bio) {
      doc
        .fontSize(13).font('Helvetica-Bold').fillColor(NAVY)
        .text('Perfil', { width: W })
      doc.moveDown(0.25)
      doc
        .fontSize(10).font('Helvetica').fillColor(DARK)
        .text(member.bio, { width: W, align: 'justify' })
      doc.moveDown(1.0)
    }

    // ── Project Experience section ────────────────────────────────────────────
    if (member.history.length > 0) {
      doc
        .fontSize(13).font('Helvetica-Bold').fillColor(NAVY)
        .text('Experiência em Projetos', { width: W })
      doc.moveDown(0.3)

      // Thin rule under section heading
      const secRuleY = doc.y
      doc
        .moveTo(MARGIN, secRuleY)
        .lineTo(MARGIN + W, secRuleY)
        .strokeColor(SUBRULE).lineWidth(0.75).stroke()
      doc.moveDown(0.7)

      for (const h of member.history) {
        // Check if we need a new page (leave ~80pt for at least one entry)
        if (doc.y > pageH - 100) {
          addFooter(pageNum)
          doc.addPage()
          doc.y = MARGIN
        }

        // ── Project name (bold) and date range ────────────────────────────
        const dateStr = [h.startDate?.slice(0, 4), h.endDate?.slice(0, 4)]
          .filter(Boolean)
          .join(' – ')

        // Left: project name; Right: date string (approximate right-align by using continued text trick)
        const nameWidth = W - (dateStr ? 80 : 0)
        doc
          .fontSize(10.5).font('Helvetica-Bold').fillColor(NAVY)
          .text(h.projectName || '—', MARGIN, doc.y, { width: nameWidth, continued: !!dateStr })

        if (dateStr) {
          doc
            .fontSize(9).font('Helvetica').fillColor(LIGHT)
            .text(dateStr, { width: 80, align: 'right', continued: false })
        }

        // ── Client / location / category sub-line ─────────────────────────
        const locParts = [h.country, h.macroRegion].filter(Boolean)
        const catStr = h.category
          ? h.category.charAt(0).toUpperCase() + h.category.slice(1)
          : ''
        const subLine = [...locParts, catStr].filter(Boolean).join('  ·  ')
        if (subLine) {
          doc
            .fontSize(9).font('Helvetica-Oblique').fillColor(STEEL)
            .text(subLine, { width: W })
        }

        // ── Description / notes paragraph ─────────────────────────────────
        if (h.notes) {
          doc.moveDown(0.2)
          doc
            .fontSize(9.5).font('Helvetica').fillColor(MID)
            .text(h.notes, { width: W, align: 'justify' })
        }

        // ── Geo investigation sub-bullets ─────────────────────────────────
        if (h.geoEntries && h.geoEntries.length > 0) {
          doc.moveDown(0.3)
          doc
            .fontSize(8.5).font('Helvetica-Bold').fillColor(STEEL)
            .text('Investigação Geotécnica:', { width: W })
          for (const g of h.geoEntries) {
            const typeLabel = g.type.replace(/_/g, ' ')
            const parts: string[] = [`${g.pointLabel} (${typeLabel})`]
            if (g.soilType) parts.push(`solo: ${g.soilType}`)
            if (g.rockType) parts.push(`rocha: ${g.rockType}`)
            if (g.depth != null) parts.push(`Prof. ${g.depth} m`)
            doc
              .fontSize(8.5).font('Helvetica').fillColor(MID)
              .text(`  •  ${parts.join('  —  ')}`, { width: W - 10, indent: 10 })
          }
        }

        // ── Structure sub-bullets ─────────────────────────────────────────
        if (h.structures && h.structures.length > 0) {
          doc.moveDown(0.3)
          doc
            .fontSize(8.5).font('Helvetica-Bold').fillColor(STEEL)
            .text('Estruturas:', { width: W })
          for (const s of h.structures) {
            const parts: string[] = [s.label, s.type]
            if (s.material) parts.push(s.material)
            const dims: string[] = []
            if (s.lengthM != null)  dims.push(`L=${s.lengthM} m`)
            if (s.heightM != null)  dims.push(`H=${s.heightM} m`)
            if (s.spanM != null)    dims.push(`vão=${s.spanM} m`)
            if (dims.length) parts.push(dims.join(', '))
            doc
              .fontSize(8.5).font('Helvetica').fillColor(MID)
              .text(`  •  ${parts.join('  —  ')}`, { width: W - 10, indent: 10 })
          }
        }

        doc.moveDown(0.9)
      }
    }

    // Footer on the last page
    addFooter(pageNum)

    doc.end()
  })
}

/**
 * Generate a CV PDF and optionally upload it to S3.
 * If S3_FILES_BUCKET is set and memberId is provided, uploads to S3 and returns a presigned URL.
 * Otherwise returns the raw Buffer (caller should base64-encode for local storage).
 */
export async function generateCvPdfOrUpload(member: CvMember, memberId?: number): Promise<Buffer | string> {
  const buffer = await generateCvPdf(member)
  if (memberId != null && process.env.S3_FILES_BUCKET) {
    const { uploadBuffer, getPresignedDownloadUrl } = await import('./s3')
    const key = `cvs/generated/${memberId}/cv_generated.pdf`
    await uploadBuffer(key, buffer, 'application/pdf')
    return getPresignedDownloadUrl(key)
  }
  return buffer
}
