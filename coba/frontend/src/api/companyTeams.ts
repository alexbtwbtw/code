import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'

// ── Queries ───────────────────────────────────────────────────────────────────

export function useCompanyTeamList() {
  return useQuery(trpc.companyTeams.list.queryOptions())
}

export function useCompanyTeamById(id: number) {
  return useQuery(trpc.companyTeams.byId.queryOptions({ id }))
}

export function useCompanyTeamsByMember(memberId: number) {
  return useQuery(trpc.companyTeams.byMember.queryOptions({ memberId }))
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateCompanyTeam() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.companyTeams.create.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['companyTeams']] }) },
  })
}

export function useUpdateCompanyTeam() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.companyTeams.update.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['companyTeams']] }) },
  })
}

export function useDeleteCompanyTeam() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.companyTeams.delete.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['companyTeams']] }) },
  })
}

export function useAddCompanyTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.companyTeams.addMember.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['companyTeams']] }) },
  })
}

export function useRemoveCompanyTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.companyTeams.removeMember.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['companyTeams']] }) },
  })
}
