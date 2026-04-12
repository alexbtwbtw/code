import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'

// ── Queries ───────────────────────────────────────────────────────────────────

export function useTimeByProject(projectId: number) {
  return useQuery(trpc.timeEntries.byProject.queryOptions({ projectId }))
}

export function useTimeByMember(memberId: number) {
  return useQuery(trpc.timeEntries.byMember.queryOptions({ memberId }))
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.timeEntries.create.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['timeEntries']] }) },
  })
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.timeEntries.delete.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['timeEntries']] }) },
  })
}
