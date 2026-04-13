import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'
import { getCurrentUser } from '../auth'

// ── Queries ───────────────────────────────────────────────────────────────────

export function useDwgFiles() {
  return useQuery(trpc.engineering.list.queryOptions())
}

export function useDwgFilesByProject(projectId: number) {
  return useQuery(trpc.engineering.byProject.queryOptions({ projectId }))
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useUpdateDwgFile() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.engineering.update.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['engineering']] }) },
  })
}

export function useDeleteDwgFile() {
  const qc = useQueryClient()
  return useMutation({
    ...trpc.engineering.delete.mutationOptions(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [['engineering']] }) },
  })
}

// ── Auth headers helper ───────────────────────────────────────────────────────

/**
 * Build the auth headers that the engineering REST endpoints require.
 * These mirror the headers sent by the tRPC client (see trpc.ts).
 */
function authHeaders(): HeadersInit {
  const user = getCurrentUser()
  if (!user) return {}
  return {
    'x-user-role': user.role,
    'x-user-id':   String(user.id),
    'x-user-name': user.name,
  }
}

// ── Download helper ───────────────────────────────────────────────────────────

/**
 * Fetches the DWG binary with auth headers and triggers a browser download.
 * Using fetch (rather than a bare <a> link) is required because the backend
 * download endpoint now requires the x-user-role header for authentication.
 */
export async function downloadDwg(id: number, fileName: string): Promise<void> {
  const res = await fetch(`/api/engineering/${id}/download`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    console.error(`DWG download failed: HTTP ${res.status}`)
    return
  }
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download  = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Fetch DWG bytes for WASM viewer ──────────────────────────────────────────

/**
 * Fetches the raw DWG bytes for the WASM renderer with auth headers.
 * The /api/engineering/:id/dwg endpoint requires authentication.
 */
export async function fetchDwgBytes(id: number): Promise<ArrayBuffer> {
  const res = await fetch(`/api/engineering/${id}/dwg`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.arrayBuffer()
}
