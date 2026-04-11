import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'

// ── Queries ───────────────────────────────────────────────────────────────────

export function useFeaturesByProject(projectId: number) {
  return useQuery(trpc.features.byProject.queryOptions({ projectId }))
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateFeature() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.features.create.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['features']] }) },
  })
}

export function useDeleteFeature() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.features.delete.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['features']] }) },
  })
}
