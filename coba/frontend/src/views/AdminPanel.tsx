import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from '../i18n/context'
import { useCurrentUser } from '../auth'
import { trpcClient, trpc } from '../trpc'

export default function AdminPanel() {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const qc = useQueryClient()

  const [reseedConfirm, setReseedConfirm] = useState(false)
  const [wipeConfirm, setWipeConfirm] = useState(false)
  const [schemaConfirm, setSchemaConfirm] = useState(false)
  const [reseedMsg, setReseedMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [wipeMsg, setWipeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [schemaMsg, setSchemaMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const isAdmin = user?.role === 'admin' || user?.role === 'oversight'

  const reseedMutation = useMutation({
    mutationFn: () => trpcClient.admin.reseed.mutate(),
    onSuccess: () => {
      qc.invalidateQueries()
      setReseedMsg({ type: 'success', text: t('adminReseedSuccess') })
      setReseedConfirm(false)
    },
    onError: () => {
      setReseedMsg({ type: 'error', text: t('adminReseedError') })
      setReseedConfirm(false)
    },
  })

  const wipeMutation = useMutation({
    mutationFn: () => trpcClient.admin.wipe.mutate(),
    onSuccess: () => {
      qc.invalidateQueries()
      setWipeMsg({ type: 'success', text: t('adminWipeSuccess') })
      setWipeConfirm(false)
    },
    onError: () => {
      setWipeMsg({ type: 'error', text: t('adminWipeError') })
      setWipeConfirm(false)
    },
  })

  const schemaMutation = useMutation({
    mutationFn: () => trpcClient.admin.resetSchema.mutate(),
    onSuccess: () => {
      qc.invalidateQueries()
      setSchemaMsg({ type: 'success', text: t('adminSchemaSuccess') })
      setSchemaConfirm(false)
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : t('adminSchemaError')
      setSchemaMsg({ type: 'error', text: msg })
      setSchemaConfirm(false)
    },
  })

  const { data: auditLog } = useQuery({
    ...trpc.admin.getAuditLog.queryOptions(),
    enabled: isAdmin,
  })

  if (!user || (user.role !== 'admin' && user.role !== 'oversight')) {
    return null
  }

  function handleReseedClick() {
    if (!reseedConfirm) { setReseedConfirm(true); return }
    setReseedMsg(null)
    reseedMutation.mutate()
  }

  function handleWipeClick() {
    if (!wipeConfirm) { setWipeConfirm(true); return }
    setWipeMsg(null)
    wipeMutation.mutate()
  }

  return (
    <div className="admin-panel">

      {/* Page header */}
      <div className="admin-hero">
        <div className="admin-hero-icon">⚙</div>
        <div>
          <h1 className="admin-hero-title">{t('adminTitle')}</h1>
          <p className="admin-hero-sub">{t('adminSubtitle')}</p>
        </div>
      </div>

      {/* Action cards — admin only */}
      {isAdmin && (
        <div className="admin-cards">

          {/* ── Reseed card ── */}
          <div className="admin-card">
            <div className="admin-card-header">
              <span className="admin-card-icon admin-card-icon--amber">↺</span>
              <div>
                <h2 className="admin-card-title">{t('adminReseed')}</h2>
              </div>
            </div>
            <p className="admin-card-desc">{t('adminReseedDesc')}</p>

            {reseedMsg && (
              <div className={`admin-feedback admin-feedback--${reseedMsg.type}`}>
                {reseedMsg.text}
              </div>
            )}

            {reseedConfirm ? (
              <div className="admin-confirm-row">
                <span className="admin-confirm-warning">⚠ {t('adminReseedConfirm')}</span>
                <div className="admin-confirm-btns">
                  <button
                    className="btn btn-danger"
                    onClick={handleReseedClick}
                    disabled={reseedMutation.isPending}
                  >
                    {reseedMutation.isPending ? '…' : t('adminConfirmBtn')}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setReseedConfirm(false)}
                    disabled={reseedMutation.isPending}
                  >
                    {t('adminCancelBtn')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-secondary admin-action-btn"
                onClick={handleReseedClick}
                disabled={reseedMutation.isPending}
              >
                ↺ {t('adminReseed')}
              </button>
            )}
          </div>

          {/* ── Wipe card (danger zone) ── */}
          <div className="admin-card admin-card--danger">
            <div className="admin-card-header">
              <span className="admin-card-icon admin-card-icon--red">✕</span>
              <div>
                <span className="admin-danger-badge">{t('adminDangerZone')}</span>
                <h2 className="admin-card-title">{t('adminWipe')}</h2>
              </div>
            </div>
            <p className="admin-card-desc">{t('adminWipeDesc')}</p>

            {wipeMsg && (
              <div className={`admin-feedback admin-feedback--${wipeMsg.type}`}>
                {wipeMsg.text}
              </div>
            )}

            {wipeConfirm ? (
              <div className="admin-confirm-row">
                <span className="admin-confirm-warning admin-confirm-warning--red">⚠ {t('adminWipeConfirm')}</span>
                <div className="admin-confirm-btns">
                  <button
                    className="btn btn-danger"
                    onClick={handleWipeClick}
                    disabled={wipeMutation.isPending}
                  >
                    {wipeMutation.isPending ? '…' : t('adminConfirmBtn')}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setWipeConfirm(false)}
                    disabled={wipeMutation.isPending}
                  >
                    {t('adminCancelBtn')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-danger admin-action-btn"
                onClick={handleWipeClick}
                disabled={wipeMutation.isPending}
              >
                ✕ {t('adminWipe')}
              </button>
            )}
          </div>

          {/* ── Schema reset card (danger zone) ── */}
          <div className="admin-card admin-card--danger">
            <div className="admin-card-header">
              <span className="admin-card-icon admin-card-icon--red">⚠</span>
              <div>
                <span className="admin-danger-badge">{t('adminDangerZone')}</span>
                <h2 className="admin-card-title">{t('adminSchemaReset')}</h2>
              </div>
            </div>
            <p className="admin-card-desc">{t('adminSchemaResetDesc')}</p>

            {schemaMsg && (
              <div className={`admin-feedback admin-feedback--${schemaMsg.type}`}>
                {schemaMsg.text}
              </div>
            )}

            {schemaConfirm ? (
              <div className="admin-confirm-row">
                <span className="admin-confirm-warning admin-confirm-warning--red">⚠ {t('adminSchemaConfirm')}</span>
                <div className="admin-confirm-btns">
                  <button
                    className="btn btn-danger"
                    onClick={() => { setSchemaMsg(null); schemaMutation.mutate() }}
                    disabled={schemaMutation.isPending}
                  >
                    {schemaMutation.isPending ? '…' : t('adminConfirmBtn')}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSchemaConfirm(false)}
                    disabled={schemaMutation.isPending}
                  >
                    {t('adminCancelBtn')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-danger admin-action-btn"
                onClick={() => setSchemaConfirm(true)}
                disabled={schemaMutation.isPending}
              >
                ⚠ {t('adminSchemaReset')}
              </button>
            )}
          </div>

        </div>
      )}

      {/* ── Audit Log ── (admin only) */}
      {isAdmin && (
        <div className="admin-audit">
          <h2 className="admin-audit-title">Audit Log</h2>
          <div className="admin-audit-table-wrap">
            <table className="admin-audit-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {(auditLog ?? []).map(entry => (
                  <tr key={entry.id}>
                    <td className="audit-ts">{entry.createdAt}</td>
                    <td>{entry.userName ?? entry.userId ?? '—'}</td>
                    <td>
                      <span className={`audit-action audit-action--${entry.action}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td>{entry.entity}</td>
                    <td>{entry.entityId ?? '—'}</td>
                  </tr>
                ))}
                {(!auditLog || auditLog.length === 0) && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', opacity: 0.5 }}>
                      No audit entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
