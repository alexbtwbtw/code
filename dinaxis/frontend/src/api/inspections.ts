import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'

export function useInspectionsByClaim(claimId: number) {
  return useQuery({
    ...trpc.inspections.byClaim.queryOptions({ claimId }),
    enabled: claimId > 0,
  })
}

export function useUpcomingInspections(limit = 10) {
  return useQuery(trpc.inspections.upcoming.queryOptions({ limit }))
}

export function useCreateInspection() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.inspections.create.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['inspections']] }),
  })
}

export function useUpdateInspection() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.inspections.update.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['inspections']] }),
  })
}

export function useDeleteInspection() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.inspections.delete.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['inspections']] }),
  })
}
