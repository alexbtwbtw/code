import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'

// ── Queries ───────────────────────────────────────────────────────────────────

export function useProjectsList(params: {
  search?: string
  status?: string
  category?: string
  country?: string
  sortBy?: 'relevance' | 'newest' | 'budget' | 'priority'
} = {}) {
  return useQuery(trpc.projects.list.queryOptions(params))
}

export function useProjectById(id: number) {
  return useQuery(trpc.projects.byId.queryOptions({ id }))
}

export function useProjectStats(params: { status?: string } = {}) {
  return useQuery(trpc.projects.stats.queryOptions(params))
}

export function useMyProjects(memberId: number) {
  return useQuery(trpc.projects.myProjects.queryOptions({ memberId }))
}

export function useRiskSummary() {
  return useQuery(trpc.projects.riskSummary.queryOptions())
}

export function usePriorityList() {
  return useQuery(trpc.projects.priorityList.queryOptions())
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.projects.update.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['projects']] }) },
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.projects.create.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['projects']] }) },
  })
}
