import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'

// ── Queries ───────────────────────────────────────────────────────────────────

export function useGeoByProject(projectId: number) {
  return useQuery(trpc.geo.byProject.queryOptions({ projectId }))
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateGeo() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.geo.create.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['geo']] }) },
  })
}

export function useDeleteGeo() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.geo.delete.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['geo']] }) },
  })
}
