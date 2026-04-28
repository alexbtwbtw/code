import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'

export function useLineItemsByClaim(claimId: number) {
  return useQuery({
    ...trpc.lineItems.byClaim.queryOptions({ claimId }),
    enabled: claimId > 0,
  })
}

export function useClaimTotals(claimId: number) {
  return useQuery({
    ...trpc.lineItems.totals.queryOptions({ claimId }),
    enabled: claimId > 0,
  })
}

export function useCreateLineItem() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.lineItems.create.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['lineItems']] }),
  })
}

export function useUpdateLineItem() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.lineItems.update.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['lineItems']] }),
  })
}

export function useDeleteLineItem() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.lineItems.delete.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['lineItems']] }),
  })
}

export function useLineItemPhotos(lineItemId: number) {
  return useQuery({
    ...trpc.lineItems.photosByItem.queryOptions({ lineItemId }),
    enabled: lineItemId > 0,
  })
}

export function useDeleteLineItemPhoto() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.lineItems.deletePhoto.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['lineItems']] }),
  })
}

export async function uploadLineItemPhoto(lineItemId: number, file: File): Promise<{ id: string; filename: string }> {
  const fd = new FormData()
  fd.append('lineItemId', String(lineItemId))
  fd.append('file', file)
  const res = await fetch('/api/line-item-photos/upload', { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}
