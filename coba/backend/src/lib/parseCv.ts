import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import Anthropic from '@anthropic-ai/sdk'
import { STRUCTURE_TYPES } from '../router/structures'

// ── Output schema ─────────────────────────────────────────────────────────────

export const CvOutputSchema = z.object({
  name:    z.string().default(''),
  title:   z.string().default(''),
  email:   z.string().default(''),
  phone:   z.string().default(''),
  bio:     z.string().default(''),
  history: z.array(z.object({
    projectName:  z.string().default(''),
    macroRegion:  z.string().default(''),
    country:      z.string().default(''),
    place:        z.string().default(''),
    category:     z.string().default('other'),
    startDate:    z.string().nullable().optional(),
    endDate:      z.string().nullable().optional(),
    notes:        z.string().default(''),
    structures:   z.array(z.object({
      label:          z.string().default(''),
      type:           z.enum(STRUCTURE_TYPES).catch('other'),
      material:       z.string().default(''),
      macroRegion:    z.string().default(''),
      country:        z.string().default(''),
      place:          z.string().default(''),
      lengthM:        z.number().nullable().optional(),
      heightM:        z.number().nullable().optional(),
      spanM:          z.number().nullable().optional(),
      foundationType: z.string().default(''),
      designLoad:     z.number().nullable().optional(),
      builtAt:        z.string().nullable().optional(),
      notes:          z.string().default(''),
    })).default([]),
    features: z.array(z.object({
      label:       z.string().default(''),
      description: z.string().default(''),
      macroRegion: z.string().default(''),
      country:     z.string().default(''),
      place:       z.string().default(''),
      notes:       z.string().default(''),
    })).default([]),
  })).default([]),
})

export type CvOutput = z.infer<typeof CvOutputSchema>

// ── Prompt ────────────────────────────────────────────────────────────────────

const PROMPT = `Analise o CV em anexo e extraia a informação num único objeto JSON.

Esquema obrigatório (sem texto fora do JSON):
{
  "name": "Nome completo",
  "title": "Cargo profissional principal (ex: Engenheiro Geotécnico Sénior)",
  "email": "email@exemplo.com ou vazio",
  "phone": "+351 xxx xxx xxx ou vazio",
  "bio": "Parágrafo de apresentação profissional em português (3-5 frases, 3ª pessoa)",
  "history": [
    {
      "projectName": "Nome do projeto",
      "macroRegion": "Uma de: EMEA | Sub-Saharan Africa | Asia | Americas | Other",
      "country": "País",
      "place": "Cidade ou região",
      "category": "Uma de: water | transport | energy | environment | planning | other",
      "startDate": null ou "YYYY" ou "YYYY-MM-DD" (data de início do profissional neste projeto),
      "endDate": null ou "YYYY" ou "YYYY-MM-DD" (data de conclusão ou saída do projeto),
      "notes": "Descrição do papel e atividades do profissional neste projeto (em português)",
      "structures": [
        {
          "label": "Nome ou designação da estrutura",
          "type": "Uma de: bridge | dam | tunnel | retaining_wall | embankment | building | pipeline | reservoir | culvert | road | other",
          "material": "Material principal (betão armado, aço, etc.) ou vazio",
          "macroRegion": "Uma de: EMEA | Sub-Saharan Africa | Asia | Americas | Other",
          "country": "País onde a estrutura se localiza",
          "place": "Cidade ou localidade da estrutura",
          "lengthM": null ou número em metros,
          "heightM": null ou número em metros,
          "spanM": null ou número em metros,
          "foundationType": "Tipo de fundação ou vazio",
          "designLoad": null ou número em kN/m²,
          "builtAt": null ou "YYYY" ou "YYYY-MM-DD",
          "notes": "Notas adicionais sobre a estrutura (em português) ou vazio"
        }
      ],
      "features": [
        {
          "label": "Nome ou designação da funcionalidade/elemento do projeto",
          "description": "Descrição breve do que é este elemento (em português)",
          "macroRegion": "Uma de: EMEA | Sub-Saharan Africa | Asia | Americas | Other",
          "country": "País",
          "place": "Cidade ou localidade",
          "notes": "Notas adicionais (em português) ou vazio"
        }
      ]
    }
  ]
}

Regras:
- Inclua TODOS os projetos mencionados no CV, mesmo com informação parcial.
- Infira a categoria e região a partir do contexto (ex: "barragem" → energy, "metro" → transport).
- Para estruturas: extraia apenas as que aparecem explicitamente no CV; se não houver estruturas mencionadas num projeto, use array vazio.
- Para funcionalidades (features): extraia elementos notáveis do projeto que não sejam estruturas físicas principais — por exemplo: sistemas de monitorização, zonas especiais, infraestruturas auxiliares, instalações de controlo, redes de distribuição, captações de água, etc. Se não houver, use array vazio.
- Os campos "macroRegion", "country" e "place" de cada estrutura e funcionalidade devem ser inferidos do contexto do projeto se não indicados explicitamente.
- Para "startDate" e "endDate": extraia do CV se disponíveis; use null se não mencionadas. Aceite anos isolados ("2018") ou datas completas ("2018-03-01"). Para projetos em curso, deixe "endDate" a null.
- O campo "bio" deve ser escrito em português, mesmo que o CV esteja noutra língua.
- O campo "notes" de cada projeto deve resumir o papel do profissional em português.
- Responda APENAS com o JSON, sem markdown, sem texto adicional.`

// ── Main function ─────────────────────────────────────────────────────────────

export async function parseCv(pdfBase64: string): Promise<CvOutput> {
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
    max_tokens: 8192,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
        } as Anthropic.DocumentBlockParam,
        { type: 'text', text: PROMPT },
      ],
    }],
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
  // Strip optional markdown code fences
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

  return CvOutputSchema.parse(parsed)
}
