import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'

export function useDocumentsByClaim(claimId: number) {
  return useQuery({
    ...trpc.documents.byClaim.queryOptions({ claimId }),
    enabled: claimId > 0,
  })
}

export function useDocumentById(id: string) {
  return useQuery({
    ...trpc.documents.byId.queryOptions({ id }),
    enabled: id.length > 0,
  })
}

export function useDocumentServeUrl(id: string) {
  return useQuery({
    ...trpc.documents.serveUrl.queryOptions({ id }),
    enabled: id.length > 0,
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.documents.delete.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['documents']] }),
  })
}

export function useDocumentComments(documentId: string) {
  return useQuery({
    ...trpc.documents.comments.queryOptions({ documentId }),
    enabled: documentId.length > 0,
  })
}

export function useAddDocumentComment() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.documents.addComment.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['documents']] }),
  })
}

export function useDeleteDocumentComment() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.documents.deleteComment.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['documents']] }),
  })
}

export function useClaimComments(claimId: number) {
  return useQuery({
    ...trpc.documents.claimComments.queryOptions({ claimId }),
    enabled: claimId > 0,
  })
}

export function useAddClaimComment() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.documents.addClaimComment.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['documents']] }),
  })
}

export function useDeleteClaimComment() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.documents.deleteClaimComment.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['documents']] }),
  })
}

export function useUpdateDocument() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.documents.update.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['documents']] }),
  })
}

export async function uploadDocument(claimId: number, file: File, label?: string, description?: string): Promise<void> {
  const fd = new FormData()
  fd.append('claimId', String(claimId))
  fd.append('file', file)
  if (label) fd.append('label', label)
  if (description) fd.append('description', description)
  const res = await fetch('/dinaxis/api/documents/upload', { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Upload failed')
}
