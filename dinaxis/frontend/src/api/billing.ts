import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'

export function useBillingItemsByClaim(claimId: number) {
  return useQuery({ ...trpc.billing.byClaim.queryOptions({ claimId }), enabled: claimId > 0 })
}

export function useBillingTotals(claimId: number) {
  return useQuery({ ...trpc.billing.totals.queryOptions({ claimId }), enabled: claimId > 0 })
}

export function useCreateBillingItem() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.billing.create.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['billing']] }),
  })
}

export function useUpdateBillingItem() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.billing.update.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['billing']] }),
  })
}

export function useDeleteBillingItem() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.billing.delete.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['billing']] }),
  })
}
