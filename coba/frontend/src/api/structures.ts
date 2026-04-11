import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'

// ── Queries ───────────────────────────────────────────────────────────────────

export function useStructuresByProject(projectId: number) {
  return useQuery(trpc.structures.byProject.queryOptions({ projectId }))
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateStructure() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.structures.create.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['structures']] }) },
  })
}

export function useDeleteStructure() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.structures.delete.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['structures']] }) },
  })
}
