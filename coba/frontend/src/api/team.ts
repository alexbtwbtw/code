import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'

// ── Queries ───────────────────────────────────────────────────────────────────

export function useTeamList() {
  return useQuery(trpc.team.list.queryOptions())
}

export function useMemberById(id: number) {
  return useQuery(trpc.team.byId.queryOptions({ id }))
}

export function useTeamByProject(projectId: number) {
  return useQuery(trpc.team.byProject.queryOptions({ projectId }))
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateMember() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.team.create.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['team']] }) },
  })
}

export function useCreateMemberWithHistory() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.team.createWithHistory.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['team']] }) },
  })
}

export function useUpdateMember() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.team.update.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['team']] }) },
  })
}

export function useTagProject() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.team.tagProject.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['team']] }) },
  })
}

export function useUntagProject() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.team.untagProject.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['team']] }) },
  })
}

export function useAddHistory() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.team.addHistory.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['team']] }) },
  })
}

export function useUpdateHistory() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.team.updateHistory.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['team']] }) },
  })
}

export function useDeleteHistory() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.team.deleteHistory.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['team']] }) },
  })
}

export function useAttachCv() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.team.attachCv.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['team']] }) },
  })
}

export function useSuggestMembers() {
  return useMutation(trpc.team.suggestMembers.mutationOptions())
}
