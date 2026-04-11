import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'

// ── Queries ───────────────────────────────────────────────────────────────────

export function useTasksByProject(projectId: number) {
  return useQuery(trpc.tasks.byProject.queryOptions({ projectId }))
}

export function useTaskById(id: number) {
  return useQuery(trpc.tasks.byId.queryOptions({ id }))
}

export function useTasksByMember(teamMemberId: number) {
  return useQuery(trpc.tasks.byMember.queryOptions({ teamMemberId }))
}

export function useOverdueTasks() {
  return useQuery(trpc.tasks.overdue.queryOptions())
}

export function useNearDeadlineTasks() {
  return useQuery(trpc.tasks.nearDeadline.queryOptions())
}

export function useBlockedTasks() {
  return useQuery(trpc.tasks.blocked.queryOptions())
}

export function useMyOverdueTasks(memberId: number) {
  return useQuery(trpc.tasks.myOverdue.queryOptions({ memberId }))
}

export function useMyNearDeadlineTasks(memberId: number) {
  return useQuery(trpc.tasks.myNearDeadline.queryOptions({ memberId }))
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.tasks.create.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['tasks']] }) },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.tasks.update.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['tasks']] }) },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.tasks.delete.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['tasks']] }) },
  })
}

export function useAssignTask() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.tasks.assign.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['tasks']] }) },
  })
}

export function useUnassignTask() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.tasks.unassign.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['tasks']] }) },
  })
}

export function useAddComment() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.tasks.addComment.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['tasks']] }) },
  })
}

export function useDeleteComment() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.tasks.deleteComment.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['tasks']] }) },
  })
}
