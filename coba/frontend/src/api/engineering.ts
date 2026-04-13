import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'

// ── Queries ───────────────────────────────────────────────────────────────────

export function useDwgFiles() {
  return useQuery(trpc.engineering.list.queryOptions())
}

export function useDwgFilesByProject(projectId: number) {
  return useQuery(trpc.engineering.byProject.queryOptions({ projectId }))
}

export function useGetDxf(id: number | null) {
  return useQuery({
    ...trpc.engineering.getDxf.queryOptions({ id: id ?? 0 }),
    enabled: id != null,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useDeleteDwgFile() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.engineering.delete.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['engineering']] }) },
  })
}

// ── Download helper ───────────────────────────────────────────────────────────

/**
 * Triggers a browser download of the original DWG binary from the backend
 * raw endpoint `/api/engineering/:id/download`.
 */
export function downloadDwg(id: number, fileName: string) {
  const a = document.createElement('a')
  a.href = `/api/engineering/${id}/download`
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
