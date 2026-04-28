import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'
import type { ClaimStatus, ClaimType } from '@backend/types/claims'

export type ListClaimsParams = {
  search?: string
  status?: ClaimStatus
  claimType?: ClaimType
  insurerId?: number
  sortBy?: 'newest' | 'oldest' | 'value_desc' | 'value_asc'
}

export function useClaimsList(params: ListClaimsParams = {}) {
  return useQuery(trpc.claims.list.queryOptions(params))
}

export function useClaimById(id: number) {
  return useQuery({
    ...trpc.claims.byId.queryOptions({ id }),
    enabled: id > 0,
  })
}

export function useClaimStats() {
  return useQuery(trpc.claims.stats.queryOptions())
}

export function useRecentClaims(limit = 5) {
  return useQuery(trpc.claims.recent.queryOptions({ limit }))
}

export function useCreateClaim() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.claims.create.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['claims']] }),
  })
}

export function useUpdateClaim() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.claims.update.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['claims']] }),
  })
}

export function useDeleteClaim() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.claims.delete.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['claims']] }),
  })
}

export function useCustomClaimTypes() {
  return useQuery(trpc.claims.customTypes.queryOptions())
}

export function useAddCustomClaimType() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.claims.addCustomType.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['claims']] }),
  })
}
