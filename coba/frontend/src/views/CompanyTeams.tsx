import { useState } from 'react'
import { useTranslation } from '../i18n/context'
import { useTeamList } from '../api/team'
import {
  useCompanyTeamList,
  useCompanyTeamById,
  useCreateCompanyTeam,
  useUpdateCompanyTeam,
  useDeleteCompanyTeam,
  useAddCompanyTeamMember,
  useRemoveCompanyTeamMember,
} from '../api/companyTeams'

export default function CompanyTeams() {
  const { t } = useTranslation()

  const { data: teams, isLoading } = useCompanyTeamList()
  const { data: allMembers } = useTeamList()

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '' })
  const [createError, setCreateError] = useState('')
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '' })
  const [editError, setEditError] = useState('')
  const [addMemberId, setAddMemberId] = useState<string>('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  const createTeam = useCreateCompanyTeam()
  const updateTeam = useUpdateCompanyTeam()
  const deleteTeam = useDeleteCompanyTeam()
  const addMember = useAddCompanyTeamMember()
  const removeMember = useRemoveCompanyTeamMember()

  const { data: selectedTeam } = useCompanyTeamById(selectedTeamId ?? 0)

  function openCreate() {
    setShowCreateForm(true)
    setCreateForm({ name: '', description: '' })
    setCreateError('')
  }

  function handleCreate(ev: React.FormEvent) {
    ev.preventDefault()
    if (!createForm.name.trim()) { setCreateError(t('errorRequired')); return }
    createTeam.mutate(
      { name: createForm.name.trim(), description: createForm.description.trim() },
      {
        onSuccess: (team) => {
          setShowCreateForm(false)
          setSelectedTeamId(team.id)
        },
      },
    )
  }

  function openEdit(team: { id: number; name: string; description: string }) {
    setEditingTeamId(team.id)
    setEditForm({ name: team.name, description: team.description })
    setEditError('')
  }

  function handleUpdate(ev: React.FormEvent) {
    ev.preventDefault()
    if (!editForm.name.trim()) { setEditError(t('errorRequired')); return }
    if (!editingTeamId) return
    updateTeam.mutate(
      { id: editingTeamId, name: editForm.name.trim(), description: editForm.description.trim() },
      { onSuccess: () => setEditingTeamId(null) },
    )
  }

  function handleDelete(id: number) {
    deleteTeam.mutate({ id }, {
      onSuccess: () => {
        setDeleteConfirmId(null)
        if (selectedTeamId === id) setSelectedTeamId(null)
      },
    })
  }

  function handleAddMember(teamId: number) {
    const mid = parseInt(addMemberId)
    if (!mid) return
    addMember.mutate({ teamId, memberId: mid }, {
      onSuccess: () => setAddMemberId(''),
    })
  }

  // Members not yet in the selected team
  const selectedMemberIds = new Set(selectedTeam?.members.map(m => m.id) ?? [])
  const availableMembers = (allMembers ?? []).filter(m => !selectedMemberIds.has(m.id))

  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1 className="view-title">{t('companyTeamsTitle')}</h1>
          <p className="view-subtitle">{t('companyTeamsSubtitle')}</p>
        </div>
        {!showCreateForm && (
          <button className="btn-primary" onClick={openCreate}>
            + {t('companyTeamAdd')}
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreateForm && (
        <form className="inline-form" onSubmit={handleCreate} noValidate>
          <div className="form-grid form-grid--2">
            <div className="field">
              <label className="field-label">
                {t('companyTeamName')}<span className="field-required"> *</span>
              </label>
              <input
                className="input"
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
              />
              {createError && <p className="field-error">{createError}</p>}
            </div>
            <div className="field">
              <label className="field-label">{t('companyTeamDesc')}</label>
              <input
                className="input"
                value={createForm.description}
                onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={() => setShowCreateForm(false)}>
              {t('btnCancelEdit')}
            </button>
            <button type="submit" className="btn-submit" disabled={createTeam.isPending}>
              {createTeam.isPending ? t('btnCreatingMember') : t('companyTeamAdd')}
            </button>
          </div>
        </form>
      )}

      <div className="requirements-layout">
        {/* Team list */}
        <div className="req-books-panel">
          {isLoading ? (
            <p className="muted">{t('loading')}</p>
          ) : !teams?.length ? (
            <p className="muted">{t('companyTeamEmpty')}</p>
          ) : (
            <div className="req-books-list">
              {teams.map(team => (
                <button
                  key={team.id}
                  className={`req-book-card ${selectedTeamId === team.id ? 'req-book-card--active' : ''}`}
                  onClick={() => setSelectedTeamId(team.id)}
                >
                  <div className="req-book-card-body">
                    <p className="req-book-card-title">{team.name}</p>
                    {team.description && (
                      <p className="req-book-card-desc">{team.description}</p>
                    )}
                    <p className="req-count-label">
                      {team.memberCount} {t('companyTeamMembers').toLowerCase()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Team detail panel */}
        {selectedTeamId != null && selectedTeam && (
          <div className="req-detail-panel">
            {editingTeamId === selectedTeamId ? (
              <form className="inline-form" onSubmit={handleUpdate} noValidate>
                <div className="form-grid form-grid--2">
                  <div className="field">
                    <label className="field-label">
                      {t('companyTeamName')}<span className="field-required"> *</span>
                    </label>
                    <input
                      className="input"
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    />
                    {editError && <p className="field-error">{editError}</p>}
                  </div>
                  <div className="field">
                    <label className="field-label">{t('companyTeamDesc')}</label>
                    <input
                      className="input"
                      value={editForm.description}
                      onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={() => setEditingTeamId(null)}>
                    {t('btnCancelEdit')}
                  </button>
                  <button type="submit" className="btn-submit" disabled={updateTeam.isPending}>
                    {updateTeam.isPending ? t('btnSaving') : t('btnSaveChanges')}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="section-heading-row">
                  <div>
                    <h2 className="detail-section-title">{selectedTeam.name}</h2>
                    {selectedTeam.description && (
                      <p className="muted" style={{ marginTop: 4 }}>{selectedTeam.description}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-edit" onClick={() => openEdit(selectedTeam)}>
                      {t('btnEdit')}
                    </button>
                    {deleteConfirmId === selectedTeamId ? (
                      <>
                        <button className="btn-danger btn-sm" onClick={() => handleDelete(selectedTeamId)}>
                          {t('taskDeleteConfirmYes')}
                        </button>
                        <button className="btn-secondary btn-sm" onClick={() => setDeleteConfirmId(null)}>
                          {t('taskDeleteConfirmNo')}
                        </button>
                      </>
                    ) : (
                      <button className="btn-danger btn-sm" onClick={() => setDeleteConfirmId(selectedTeamId)}>
                        {t('companyTeamDelete')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Members section */}
                <div className="detail-section" style={{ marginTop: 20 }}>
                  <div className="section-heading-row">
                    <h3 className="detail-section-title" style={{ fontSize: '1rem' }}>
                      {t('companyTeamMembers')}
                    </h3>
                  </div>

                  {/* Add member row */}
                  {availableMembers.length > 0 && (
                    <div className="tag-member-row" style={{ marginBottom: 12 }}>
                      <select
                        className="input"
                        value={addMemberId}
                        onChange={e => setAddMemberId(e.target.value)}
                      >
                        <option value="">{t('tagMemberSelect')}</option>
                        {availableMembers.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name}{m.title ? ` — ${m.title}` : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn-primary btn-sm"
                        disabled={!addMemberId || addMember.isPending}
                        onClick={() => handleAddMember(selectedTeamId)}
                      >
                        + {t('companyTeamAddMember')}
                      </button>
                    </div>
                  )}

                  {!selectedTeam.members.length ? (
                    <p className="muted">{t('noMembers')}</p>
                  ) : (
                    <div className="tagged-projects-list">
                      {selectedTeam.members.map(m => (
                        <div key={m.id} className="tagged-project-row">
                          <span className="member-card-avatar" style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}>
                            {initials(m.name)}
                          </span>
                          <span className="tagged-project-name">{m.name}</span>
                          {m.title && <span className="tagged-project-role">{m.title}</span>}
                          <button
                            className="btn-remove"
                            onClick={() => removeMember.mutate({ teamId: selectedTeamId, memberId: m.id })}
                            title={t('btnUntagMember')}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}
