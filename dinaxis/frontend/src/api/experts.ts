import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'

export function useExpertsList(search?: string) {
  return useQuery({ ...trpc.experts.list.queryOptions({ search }), })
}

export function useExpertById(id: number) {
  return useQuery({ ...trpc.experts.byId.queryOptions({ id }), enabled: id > 0 })
}

export function useExpertClaims(expertId: number) {
  return useQuery({ ...trpc.experts.claimsForExpert.queryOptions({ expertId }), enabled: expertId > 0 })
}

export function useClaimExperts(claimId: number) {
  return useQuery({ ...trpc.experts.claimExperts.queryOptions({ claimId }), enabled: claimId > 0 })
}

export function useCreateExpert() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.experts.create.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['experts']] }),
  })
}

export function useUpdateExpert() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.experts.update.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['experts']] }),
  })
}

export function useDeleteExpert() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.experts.delete.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['experts']] }),
  })
}

export function useAddClaimExpert() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.experts.addToClaim.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['experts']] }),
  })
}

export function useUpdateClaimExpert() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.experts.updateOnClaim.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['experts']] }),
  })
}

export function useRemoveClaimExpert() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.experts.removeFromClaim.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['experts']] }),
  })
}
