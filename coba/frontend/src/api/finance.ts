import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'

// ── Queries ───────────────────────────────────────────────────────────────────

export function useProjectFixedCosts(projectId: number) {
  return useQuery(trpc.finance.getProjectFixedCosts.queryOptions({ projectId }))
}

export function useProjectFinancialSummary(projectId: number) {
  return useQuery(trpc.finance.projectFinancialSummary.queryOptions({ projectId }))
}

export function useMemberRates(memberId: number) {
  return useQuery(trpc.finance.getMemberRates.queryOptions({ memberId }))
}

export function useMemberCurrentRate(memberId: number) {
  return useQuery(trpc.finance.getMemberCurrentRate.queryOptions({ memberId }))
}

export function useMemberCostSummary(memberId: number) {
  return useQuery(trpc.finance.memberCostSummary.queryOptions({ memberId }))
}

export function useCompanyFinancials(opts?: { fromDate?: string; toDate?: string }) {
  return useQuery(trpc.finance.companyFinancials.queryOptions(opts))
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateFixedCost() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.finance.createFixedCost.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['finance']] }) },
  })
}

export function useUpdateFixedCost() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.finance.updateFixedCost.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['finance']] }) },
  })
}

export function useDeleteFixedCost() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.finance.deleteFixedCost.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['finance']] }) },
  })
}

export function useSetMemberRate() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.finance.setMemberRate.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['finance']] }) },
  })
}

export function useDeleteMemberRate() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.finance.deleteMemberRate.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['finance']] }) },
  })
}
