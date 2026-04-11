import Anthropic from '@anthropic-ai/sdk'
import { TRPCError } from '@trpc/server'

export type ProjectSnapshot = {
  name: string
  category: string
  country: string
  macroRegion: string
  description: string
  tags: string
  structures: { type: string; material: string }[]
}

export type MemberSnapshot = {
  id: number
  name: string
  title: string
  bio: string
  history: {
    projectName: string
    category: string
    country: string
    macroRegion: string
    notes: string
    structures: { type: string }[]
  }[]
}

export type AiSuggestion = {
  memberId: number
  rationale: string
  evidence: string
}

export async function suggestMembersAi(
  project: ProjectSnapshot,
  members: MemberSnapshot[],
  topN: number,
): Promise<AiSuggestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'ANTHROPIC_API_KEY not configured.',
    })
  }

  const client = new Anthropic({ apiKey })

  const prompt = `You are helping a project manager find the best team members for a civil engineering project.

PROJECT:
${JSON.stringify(project, null, 2)}

CANDIDATES (${members.length} total):
${JSON.stringify(members, null, 2)}

Task: Identify the top ${topN} candidates whose skills and experience best match this project. Consider: relevant project categories, geographic experience (country/region), structure types worked on, and any keyword overlap between their bio/notes and the project description and tags.

Return ONLY a JSON array of exactly ${topN} objects (fewer if there are fewer candidates), ordered from best to worst fit:
[
  {
    "memberId": <number>,
    "rationale": "<1-2 sentences in Portuguese explaining why this person is a strong fit>",
    "evidence": "<verbatim excerpt copied word-for-word from the candidate's bio field above — do NOT paraphrase or rewrite, quote exactly as written; use empty string if nothing relevant>"
  }
]

No markdown, no extra text — only the JSON array.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'AI returned an invalid response. Please try again.',
    })
  }

  if (!Array.isArray(parsed)) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI returned unexpected format.' })
  }

  return (parsed as AiSuggestion[]).filter(s => typeof s.memberId === 'number' && typeof s.rationale === 'string')
}
