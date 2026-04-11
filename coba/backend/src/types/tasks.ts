// ── Raw DB → camelCase ────────────────────────────────────────────────────────

export type RawTask = {
  id: number; project_id: number; title: string; description: string
  status: string; priority: string; state_summary: string; due_date: string | null
  created_at: string; updated_at: string
}

export type RawAssignment = {
  team_member_id: number; name: string; title: string
}

export type RawComment = {
  id: number; task_id: number; author_name: string; content: string; created_at: string
}

export function mapTask(r: RawTask) {
  return {
    id: r.id, projectId: r.project_id, title: r.title, description: r.description,
    status: r.status, priority: r.priority, stateSummary: r.state_summary,
    dueDate: r.due_date, createdAt: r.created_at, updatedAt: r.updated_at,
  }
}

export function mapComment(r: RawComment) {
  return { id: r.id, taskId: r.task_id, authorName: r.author_name, content: r.content, createdAt: r.created_at }
}
