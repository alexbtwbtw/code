import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import Anthropic from '@anthropic-ai/sdk'
import mammoth from 'mammoth'
import { DISCIPLINES, LEVELS } from '../schemas/requirements'

// ── Output schema ─────────────────────────────────────────────────────────────

export const RequirementsOutputSchema = z.object({
  bookTitle: z.string().default(''),
  bookCategory: z.enum(['water', 'transport', 'energy', 'environment', 'planning', 'other']).catch('other'),
  bookDescription: z.string().default(''),
  requirements: z.array(z.object({
    title:           z.string().default(''),
    description:     z.string().default(''),
    discipline:      z.enum(DISCIPLINES).catch('other'),
    level:           z.enum(LEVELS).catch('any'),
    yearsExperience: z.number().int().nullable().optional(),
    certifications:  z.string().default(''),
    notes:           z.string().default(''),
    sourceEvidence:  z.string().default(''),
  })).default([]),
})

export type RequirementsOutput = z.infer<typeof RequirementsOutputSchema>

// ── Prompt ────────────────────────────────────────────────────────────────────

const PROMPT = `Analise o documento em anexo e extraia os requisitos de pessoal/staffing num único objeto JSON.

O documento pode ser um caderno de encargos, proposta de concurso, plano de pessoal, briefing de projeto, ou qualquer documento que descreva necessidades de contratação ou perfis profissionais exigidos.

Esquema obrigatório (sem texto fora do JSON):
{
  "bookTitle": "Título conciso para este caderno de encargos (ex: 'Requisitos de Pessoal — Barragem do Alqueva')",
  "bookCategory": "Uma de: water | transport | energy | environment | planning | other",
  "bookDescription": "Breve descrição do contexto e objetivo deste caderno de encargos (1-3 frases em português)",
  "requirements": [
    {
      "title": "Designação do perfil ou cargo exigido (ex: 'Engenheiro Geotécnico Sénior')",
      "description": "Descrição das funções e responsabilidades deste perfil neste projeto (em português)",
      "discipline": "Uma de: geotechnical | structural | environmental | hydraulic | transport | electrical | planning | other",
      "level": "Uma de: any | junior | mid | senior | lead",
      "yearsExperience": null ou número inteiro de anos mínimos de experiência,
      "certifications": "Certificações ou habilitações exigidas (separadas por vírgula) ou string vazia",
      "notes": "Observações adicionais sobre este requisito (em português) ou string vazia",
      "sourceEvidence": "Excerto LITERAL do documento original que originou este requisito (máximo 200 caracteres)"
    }
  ]
}

Regras:
- Extraia TODOS os perfis, cargos ou requisitos de pessoal mencionados no documento.
- Para "sourceEvidence": copie literalmente o trecho do documento que justifica cada requisito — use as palavras exatas do documento original.
- Para "discipline": infira a partir das funções descritas (ex: "fundações" → geotechnical, "projeto de pontes" → structural).
- Para "level": infira do contexto (ex: "sénior", "mínimo 10 anos" → senior; "coordenador" → lead; sem requisito → any).
- Para "yearsExperience": extraia o número de anos mínimos se mencionado, caso contrário use null.
- O campo "bookCategory" deve refletir o setor principal do projeto descrito.
- Responda APENAS com o JSON, sem markdown, sem texto adicional.`

// ── Mock / real dispatcher ────────────────────────────────────────────────────

const USE_REAL = process.env.USE_REAL_AI === 'true'

export async function parseRequirementsFromPdf(fileBase64: string): Promise<RequirementsOutput> {
  if (!USE_REAL) {
    const { mockParseRequirements } = await import('./mocks/parseRequirements.mock')
    return mockParseRequirements()
  }
  return realParseRequirementsFromPdf(fileBase64)
}

export async function parseRequirementsFromDocx(docxBase64: string): Promise<RequirementsOutput> {
  if (!USE_REAL) {
    const { mockParseRequirements } = await import('./mocks/parseRequirements.mock')
    return mockParseRequirements()
  }
  return realParseRequirementsFromDocx(docxBase64)
}

// ── Real implementations ──────────────────────────────────────────────────────

async function realParseRequirementsFromPdf(fileBase64: string): Promise<RequirementsOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'ANTHROPIC_API_KEY não está configurada. Adicione-a ao ficheiro backend/.env.',
    })
  }

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 },
        } as Anthropic.DocumentBlockParam,
        { type: 'text', text: PROMPT },
      ],
    }],
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Claude devolveu uma resposta inválida. Tente novamente.',
    })
  }

  return RequirementsOutputSchema.parse(parsed)
}

// ── Word doc handler (real) — converts DOCX to plain text then sends inline ───

async function realParseRequirementsFromDocx(docxBase64: string): Promise<RequirementsOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'ANTHROPIC_API_KEY não está configurada. Adicione-a ao ficheiro backend/.env.',
    })
  }

  const buffer = Buffer.from(docxBase64, 'base64')
  const { value: text } = await mammoth.extractRawText({ buffer })

  if (!text.trim()) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Não foi possível extrair texto do documento Word. Verifique se o ficheiro não está corrompido.',
    })
  }

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `${PROMPT}\n\n---DOCUMENTO---\n${text}`,
    }],
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Claude devolveu uma resposta inválida. Tente novamente.',
    })
  }

  return RequirementsOutputSchema.parse(parsed)
}
