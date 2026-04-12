import { trpcClient } from '../trpc'

export async function downloadSuggestionCv(cvId: number, filename: string) {
  const data = await trpcClient.team.getCvData.query({ cvId })
  if (!data) return
  if ('presignedUrl' in data) {
    // S3 mode — open presigned URL directly
    const a = document.createElement('a')
    a.href = data.presignedUrl; a.download = filename; a.click()
    return
  }
  if (!data.fileData) return
  const bytes = Uint8Array.from(atob(data.fileData), c => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
