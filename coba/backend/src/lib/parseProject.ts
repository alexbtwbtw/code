import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import Anthropic from '@anthropic-ai/sdk'
import { STRUCTURE_TYPES } from '../router/structures'

// ── Output schema ─────────────────────────────────────────────────────────────

const GEO_TYPES = ['borehole', 'trial_pit', 'core_sample', 'field_survey'] as const

export const ProjectOutputSchema = z.object({
  refCode:        z.string().default(''),
  name:           z.string().default(''),
  client:         z.string().default(''),
  macroRegion:    z.string().default(''),
  country:        z.string().default(''),
  place:          z.string().default(''),
  category:       z.enum(['water','transport','energy','environment','planning','other']).catch('other'),
  status:         z.enum(['planning','active','completed','suspended','cancelled']).catch('planning'),
  startDate:      z.string().nullable().optional(),
  endDate:        z.string().nullable().optional(),
  budget:         z.number().nullable().optional(),
  currency:       z.string().default('EUR'),
  projectManager: z.string().default(''),
  teamSize:       z.number().nullable().optional(),
  description:    z.string().default(''),
  tags:           z.string().default(''),
  geoEntries: z.array(z.object({
    pointLabel:       z.string().default(''),
    type:             z.enum(GEO_TYPES).catch('borehole'),
    depth:            z.number().nullable().optional(),
    soilType:         z.string().default(''),
    rockType:         z.string().default(''),
    groundwaterDepth: z.number().nullable().optional(),
    bearingCapacity:  z.number().nullable().optional(),
    sptNValue:        z.number().nullable().optional(),
    seismicClass:     z.string().default(''),
    latitude:         z.number().nullable().optional(),
    longitude:        z.number().nullable().optional(),
    sampledAt:        z.string().nullable().optional(),
    notes:            z.string().default(''),
  })).default([]),
  structures: z.array(z.object({
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
})

export type ProjectOutput = z.infer<typeof ProjectOutputSchema>

// ── Prompt ────────────────────────────────────────────────────────────────────

const PROMPT = `Analise o documento em anexo e extraia a informação de projeto num único objeto JSON.

Esquema obrigatório (sem texto fora do JSON):
{
  "refCode": "Código de referência do projeto (ex. PT-2025-001) ou vazio",
  "name": "Nome completo do projeto",
  "client": "Nome do cliente ou dono de obra ou vazio",
  "macroRegion": "Uma de: EMEA | Sub-Saharan Africa | Asia | Americas | Other",
  "country": "País onde o projeto se localiza",
  "place": "Cidade ou região do projeto",
  "category": "Uma de: water | transport | energy | environment | planning | other",
  "status": "Uma de: planning | active | completed | suspended | cancelled",
  "startDate": null ou "YYYY" ou "YYYY-MM-DD",
  "endDate": null ou "YYYY" ou "YYYY-MM-DD",
  "budget": null ou número (valor em moeda indicada),
  "currency": "EUR | USD | GBP | AOA | MZN (padrão: EUR)",
  "projectManager": "Nome do gestor de projeto ou vazio",
  "teamSize": null ou número inteiro,
  "description": "Descrição técnica do projeto em português (3-5 frases)",
  "tags": "palavras-chave separadas por vírgula (ex. barragem,geotecnia,betão)",
  "geoEntries": [
    {
      "pointLabel": "Designação do ponto (ex. BH-01, SP-02)",
      "type": "Uma de: borehole | trial_pit | core_sample | field_survey",
      "depth": null ou número em metros,
      "soilType": "Tipo de solo ou vazio",
      "rockType": "Tipo de rocha ou vazio",
      "groundwaterDepth": null ou número em metros,
      "bearingCapacity": null ou número em kPa,
      "sptNValue": null ou número inteiro,
      "seismicClass": "Classe sísmica (A–E) ou vazio",
      "latitude": null ou número decimal,
      "longitude": null ou número decimal,
      "sampledAt": null ou "YYYY-MM-DD",
      "notes": "Notas sobre esta prospeção ou vazio"
    }
  ],
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
      "notes": "Notas adicionais ou vazio"
    }
  ]
}

Regras:
- Extraia toda a informação disponível no documento; infira campos em falta a partir do contexto.
- Infira a categoria: "barragem"/"dam" → energy, "metro"/"estrada"/"ponte" → transport, "saneamento"/"água" → water, etc.
- Infira o estado: se o documento indica obra concluída → completed, em curso → active, em fase de projeto → planning.
- Para "geoEntries": inclua apenas investigações geotécnicas explicitamente mencionadas (sondagens, valas, etc.); se nenhuma, use array vazio.
- Para "structures": inclua todas as estruturas físicas identificadas no documento; se nenhuma, use array vazio.
- O campo "description" deve ser escrito em português, mesmo que o documento esteja noutra língua.
- Para datas: aceite anos isolados ("2018") ou datas completas ("2018-03-01"); use null se não mencionadas.
- Responda APENAS com o JSON, sem markdown, sem texto adicional.`

// ── Main function ─────────────────────────────────────────────────────────────

export async function parseProject(pdfBase64: string): Promise<ProjectOutput> {
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

  return ProjectOutputSchema.parse(parsed)
}
