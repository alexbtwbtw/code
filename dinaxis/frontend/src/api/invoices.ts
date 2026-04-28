import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'

export function useInvoicesByClaim(claimId: number) {
  return useQuery({ ...trpc.invoices.list.queryOptions({ claimId }), enabled: claimId > 0 })
}

export function useInvoiceItems(invoiceId: string) {
  return useQuery({ ...trpc.invoices.getItems.queryOptions({ invoiceId }), enabled: !!invoiceId })
}

export function useLineItemInvoices(lineItemId: number) {
  return useQuery({ ...trpc.invoices.lineItemInvoices.queryOptions({ lineItemId }), enabled: lineItemId > 0 })
}

export function useBillingItemInvoices(billingItemId: number) {
  return useQuery({ ...trpc.invoices.billingItemInvoices.queryOptions({ billingItemId }), enabled: billingItemId > 0 })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.invoices.create.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['invoices']] }),
  })
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.invoices.updateStatus.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['invoices']] }),
  })
}

export function useDeleteInvoice() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.invoices.delete.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['invoices']] }),
  })
}
