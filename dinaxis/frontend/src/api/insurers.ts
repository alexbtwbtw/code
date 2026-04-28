import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'

export function useInsurersList() {
  return useQuery(trpc.insurers.list.queryOptions())
}

export function useInsurerById(id: number) {
  return useQuery({
    ...trpc.insurers.byId.queryOptions({ id }),
    enabled: id > 0,
  })
}

export function useInsurerClaimCount(id: number) {
  return useQuery({
    ...trpc.insurers.claimCount.queryOptions({ id }),
    enabled: id > 0,
  })
}

export function useCreateInsurer() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.insurers.create.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['insurers']] }),
  })
}

export function useUpdateInsurer() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.insurers.update.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['insurers']] }),
  })
}

export function useDeleteInsurer() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.insurers.delete.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['insurers']] }),
  })
}

export function useInsurerContacts(insurerId: number) {
  return useQuery({
    ...trpc.insurers.contacts.queryOptions({ insurerId }),
    enabled: insurerId > 0,
  })
}

export function useAddInsurerContact() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.insurers.addContact.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['insurers']] }),
  })
}

export function useUpdateInsurerContact() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.insurers.updateContact.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['insurers']] }),
  })
}

export function useDeleteInsurerContact() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.insurers.deleteContact.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['insurers']] }),
  })
}

export function useSetPrimaryContact() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.insurers.setPrimary.mutationOptions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: [['insurers']] }),
  })
}
