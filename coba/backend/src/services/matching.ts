/** Return up to 2 verbatim sentences from `text` that contain any of the given keywords. */
export function extractVerbatimEvidence(text: string, keywords: string[]): string {
  if (!keywords.length || !text.trim()) return ''
  const sentences = text.split(/(?<=[.!?])\s+|[\n]+/).map(s => s.trim()).filter(s => s.length > 10)
  const hits: string[] = []
  for (const kw of keywords) {
    const s = sentences.find(s => s.toLowerCase().includes(kw.toLowerCase()))
    if (s && !hits.includes(s)) hits.push(s)
    if (hits.length >= 2) break
  }
  return hits.join(' … ')
}
