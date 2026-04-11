import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'

// ── Queries ───────────────────────────────────────────────────────────────────

export function useListBooks() {
  return useQuery(trpc.requirements.listBooks.queryOptions())
}

export function useBookById(id: number) {
  return useQuery(trpc.requirements.bookById.queryOptions({ id }))
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateBook() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.requirements.createBook.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['requirements']] }) },
  })
}

export function useUpdateBook() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.requirements.updateBook.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['requirements']] }) },
  })
}

export function useDeleteBook() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.requirements.deleteBook.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['requirements']] }) },
  })
}

export function useCreateRequirement() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.requirements.createRequirement.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['requirements']] }) },
  })
}

export function useUpdateRequirement() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.requirements.updateRequirement.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['requirements']] }) },
  })
}

export function useDeleteRequirement() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.requirements.deleteRequirement.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['requirements']] }) },
  })
}

export function useMatchMembers() {
  return useMutation(trpc.requirements.matchMembers.mutationOptions())
}

export function useAddReqAssignment() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.requirements.addAssignment.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['requirements']] }) },
  })
}

export function useRemoveReqAssignment() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.requirements.removeAssignment.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['requirements']] }) },
  })
}

export function useParseRequirementsFromPdf() {
  return useMutation(trpc.requirements.parseFromPdf.mutationOptions())
}
