import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from '../i18n/context'
import { useCurrentUser } from '../auth'
import { trpcClient } from '../trpc'

export default function AdminPanel() {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const [confirmed, setConfirmed] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const reseedMutation = useMutation({
    mutationFn: () => trpcClient.admin.reseed.mutate(),
    onSuccess: () => {
      setSuccessMsg(t('adminReseedSuccess'))
      setErrorMsg(null)
      setConfirmed(false)
    },
    onError: () => {
      setErrorMsg(t('adminReseedError'))
      setSuccessMsg(null)
      setConfirmed(false)
    },
  })

  if (!user || user.role !== 'oversight') {
    return null
  }

  function handleReseedClick() {
    if (!confirmed) {
      setConfirmed(true)
      return
    }
    setSuccessMsg(null)
    setErrorMsg(null)
    reseedMutation.mutate()
  }

  return (
    <div className="container" style={{ maxWidth: 600, margin: '2rem auto' }}>
      <h1 className="page-title">{t('adminTitle')}</h1>

      <div className="card" style={{ padding: '2rem', marginTop: '1.5rem' }}>
        {confirmed && (
          <p style={{ color: 'var(--color-warning, #f59e0b)', marginBottom: '1rem', fontWeight: 500 }}>
            {t('adminReseedConfirm')}
          </p>
        )}

        {successMsg && (
          <p style={{ color: 'var(--color-success, #22c55e)', marginBottom: '1rem' }}>
            {successMsg}
          </p>
        )}

        {errorMsg && (
          <p style={{ color: 'var(--color-danger, #ef4444)', marginBottom: '1rem' }}>
            {errorMsg}
          </p>
        )}

        <button
          className="btn btn-danger"
          onClick={handleReseedClick}
          disabled={reseedMutation.isPending}
          style={{ minWidth: 220 }}
        >
          {reseedMutation.isPending
            ? '…'
            : confirmed
              ? t('adminReseedConfirm').slice(0, 30) + ' — ' + t('adminReseed')
              : t('adminReseed')}
        </button>

        {confirmed && (
          <button
            className="btn btn-secondary"
            onClick={() => setConfirmed(false)}
            style={{ marginLeft: '1rem' }}
          >
            {t('btnCancelEdit')}
          </button>
        )}
      </div>
    </div>
  )
}
