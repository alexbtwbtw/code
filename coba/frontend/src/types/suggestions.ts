export type Suggestion = {
  memberId: number; name: string; title: string; rationale: string; score?: number
  bio?: string; historyCount?: number; evidence?: string; email?: string
  projectCount?: number; cvId?: number | null; cvFilename?: string | null
  recentHistory?: { projectName: string; category: string; country: string }[]
}
