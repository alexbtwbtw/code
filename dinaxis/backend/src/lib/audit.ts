export function logAudit(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  resource: string,
  resourceId: string | number,
  details?: Record<string, unknown>,
) {
  const entry = {
    ts: new Date().toISOString(),
    action,
    resource,
    id: resourceId,
    ...details,
  }
  console.log('[audit]', JSON.stringify(entry))
}
