import { useState } from 'react'
import { useTranslation } from '../i18n/context'
import type { Page } from '../App'
import { TASK_STATUS_KEY, TASK_PRIORITY_KEY, TASK_STATUSES, TASK_PRIORITIES } from '../constants/tasks'
import { initials, fmtDate } from '../utils/format'
import { useTaskById, useUpdateTask, useDeleteTask, useAssignTask, useUnassignTask, useAddComment, useDeleteComment } from '../api/tasks'
import { useTeamList } from '../api/team'

interface Props {
  id: number
  projectId: number
  projectName?: string
  onNavigate: (page: Page) => void
}

export default function TaskDetail({ id, projectId, projectName, onNavigate }: Props) {
  const { t } = useTranslation()

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', description: '', status: '', priority: '', stateSummary: '', dueDate: '' })
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Comment form
  const [commentAuthor, setCommentAuthor] = useState('')
  const [commentContent, setCommentContent] = useState('')

  // Assign member
  const [showAssignPanel, setShowAssignPanel] = useState(false)
  const [assignMemberId, setAssignMemberId] = useState('')

  const { data: task, isLoading } = useTaskById(id)
  const { data: allMembers } = useTeamList()

  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const assignMember = useAssignTask()
  const unassignMember = useUnassignTask()
  const addComment = useAddComment()
  const deleteComment = useDeleteComment()

  function startEditing() {
    if (!task) return
    setEditForm({
      title: task.title, description: task.description, status: task.status,
      priority: task.priority, stateSummary: task.stateSummary,
      dueDate: task.dueDate?.slice(0, 10) ?? '',
    })
    setConfirmDelete(false)
    setIsEditing(true)
  }

  function handleSave(ev: React.FormEvent) {
    ev.preventDefault()
    if (!editForm.title.trim()) return
    updateTask.mutate({
      id,
      title: editForm.title, description: editForm.description,
      status: editForm.status as typeof TASK_STATUSES[number],
      priority: editForm.priority as typeof TASK_PRIORITIES[number],
      stateSummary: editForm.stateSummary,
      dueDate: editForm.dueDate || null,
    }, {
      onSuccess: () => { setIsEditing(false) },
    })
  }

  function handleDelete() {
    deleteTask.mutate({ id }, {
      onSuccess: () => {
        onNavigate({ view: 'project', id: projectId, name: projectName })
      },
    })
  }

  function handleAddComment(ev: React.FormEvent) {
    ev.preventDefault()
    if (!commentAuthor.trim() || !commentContent.trim()) return
    addComment.mutate({ taskId: id, authorName: commentAuthor, content: commentContent }, {
      onSuccess: () => { setCommentContent('') },
    })
  }

  function handleAssign(ev: React.FormEvent) {
    ev.preventDefault()
    if (!assignMemberId) return
    assignMember.mutate({ taskId: id, teamMemberId: parseInt(assignMemberId) }, {
      onSuccess: () => { setAssignMemberId(''); setShowAssignPanel(false) },
    })
  }

  if (isLoading) return <div className="page-loading">{t('loading')}</div>
  if (!task) return <div className="page-loading">Task not found.</div>

  const isOverdue = task.dueDate && task.status !== 'done' && task.dueDate < new Date().toISOString().slice(0, 10)
  const assignedIds = new Set(task.assignees.map(a => a.memberId))
  const availableMembers = allMembers?.filter(m => !assignedIds.has(m.id)) ?? []

  return (
    <div className="task-detail-page">
      {/* Back link */}
      <button className="btn-back task-back-btn" onClick={() => onNavigate({ view: 'project', id: projectId, name: projectName })}>
        &larr; {t('btnBackToProject')}{projectName ? `: ${projectName}` : ''}
      </button>

      {/* Hero */}
      <div className="task-hero">
        <div className="task-hero-top">
          <span className={`task-priority-dot task-priority-dot--${task.priority}`} title={t(TASK_PRIORITY_KEY[task.priority])} />
          <span className={`status-pill status-pill--task-${task.status}`}>{t(TASK_STATUS_KEY[task.status] ?? 'taskStatusTodo')}</span>
          <span className={`task-priority-label task-priority-label--${task.priority}`}>{t(TASK_PRIORITY_KEY[task.priority])}</span>
          {isOverdue && <span className="task-overdue-badge">{t('taskOverdue')}</span>}
          <div className="task-hero-actions">
            <button className="btn-edit" onClick={startEditing}>{t('btnEditTask')}</button>
            {confirmDelete ? (
              <>
                <span className="delete-confirm-label">{t('taskDeleteConfirm')}</span>
                <button className="btn-cancel btn-sm" onClick={handleDelete} disabled={deleteTask.isPending}>{t('taskDeleteConfirmYes')}</button>
                <button className="btn-secondary btn-sm" onClick={() => setConfirmDelete(false)}>{t('taskDeleteConfirmNo')}</button>
              </>
            ) : (
              <button className="btn-cancel btn-sm" onClick={() => setConfirmDelete(true)}>{t('btnDeleteTask')}</button>
            )}
          </div>
        </div>
        {isEditing ? (
          <form className="task-edit-form" onSubmit={handleSave}>
            <input className="input task-edit-title" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
            <textarea className="input textarea" rows={3} value={editForm.description} placeholder={t('taskFieldDescription')}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            <div className="form-grid form-grid--3">
              <label className="field">
                <span className="field-label">{t('taskFieldStatus')}</span>
                <select className="input" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  {TASK_STATUSES.map(s => <option key={s} value={s}>{t(TASK_STATUS_KEY[s])}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="field-label">{t('taskFieldPriority')}</span>
                <select className="input" value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}>
                  {TASK_PRIORITIES.map(p => <option key={p} value={p}>{t(TASK_PRIORITY_KEY[p])}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="field-label">{t('taskFieldDueDate')}</span>
                <input className="input" type="date" value={editForm.dueDate} onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))} />
              </label>
            </div>
            <label className="field">
              <span className="field-label">{t('taskFieldStateSummary')}</span>
              <textarea className="input textarea" rows={2} value={editForm.stateSummary}
                onChange={e => setEditForm(f => ({ ...f, stateSummary: e.target.value }))} />
            </label>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => setIsEditing(false)}>{t('btnCancelEdit')}</button>
              <button type="submit" className="btn-submit" disabled={updateTask.isPending}>
                {updateTask.isPending ? t('btnSaving') : t('btnSaveTask')}
              </button>
            </div>
          </form>
        ) : (
          <>
            <h1 className="task-hero-title">{task.title}</h1>
            {task.description && <p className="task-hero-description">{task.description}</p>}
            {task.stateSummary && (
              <div className="task-state-summary">
                <span className="task-state-label">{t('taskFieldStateSummary')}:</span>
                <p>{task.stateSummary}</p>
              </div>
            )}
            <div className="task-meta-row">
              {task.dueDate && (
                <span className={`task-meta-item${isOverdue ? ' task-meta-item--overdue' : ''}`}>
                  {t('taskDue')}: {fmtDate(task.dueDate)}
                </span>
              )}
              <span className="task-meta-item">{t('taskCreated')}: {fmtDate(task.createdAt)}</span>
              <span className="task-meta-item">{t('taskUpdated')}: {fmtDate(task.updatedAt)}</span>
            </div>
          </>
        )}
      </div>

      {/* Assignees */}
      <section className="detail-section">
        <div className="section-heading-row">
          <h2 className="detail-section-title">{t('taskAssignees')}</h2>
          <button className="btn-add-geo" onClick={() => setShowAssignPanel(p => !p)}>
            {showAssignPanel ? t('btnCancelEdit') : `+ ${t('taskAssign')}`}
          </button>
        </div>

        {showAssignPanel && (
          <form className="tag-member-panel" onSubmit={handleAssign}>
            <div className="form-grid form-grid--2">
              <label className="field">
                <span className="field-label">{t('taskSelectMember')}</span>
                <select className="input" value={assignMemberId} onChange={e => setAssignMemberId(e.target.value)} required>
                  <option value="">{t('taskSelectMember')}</option>
                  {availableMembers.map(m => <option key={m.id} value={m.id}>{m.name}{m.title ? ` — ${m.title}` : ''}</option>)}
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowAssignPanel(false)}>{t('btnCancelEdit')}</button>
              <button type="submit" className="btn-submit" disabled={!assignMemberId || assignMember.isPending}>{t('taskAssign')}</button>
            </div>
          </form>
        )}

        {!task.assignees.length ? (
          <p className="muted">{t('projectTeamNoMembers')}</p>
        ) : (
          <div className="tagged-projects-list">
            {task.assignees.map(a => (
              <div key={a.memberId} className="tagged-project-row">
                <div className="tagged-member-avatar">{initials(a.name)}</div>
                <button className="tagged-project-name task-assignee-link" onClick={() => onNavigate({ view: 'member', id: a.memberId, name: a.name })}>
                  {a.name}
                </button>
                {a.title && <span className="tagged-project-role">{a.title}</span>}
                <button className="btn-untag"
                  onClick={() => unassignMember.mutate({ taskId: id, teamMemberId: a.memberId })}
                  title={t('taskUnassign')}>✕</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Comments */}
      <section className="detail-section">
        <h2 className="detail-section-title">{t('taskComments')} ({task.comments.length})</h2>

        {task.comments.length === 0 ? (
          <p className="muted">{t('taskNoComments')}</p>
        ) : (
          <div className="task-comments-list">
            {task.comments.map(c => (
              <div key={c.id} className="task-comment">
                <div className="task-comment-header">
                  <span className="task-comment-avatar">{initials(c.authorName)}</span>
                  <span className="task-comment-author">{c.authorName}</span>
                  <span className="task-comment-date">{fmtDate(c.createdAt)}</span>
                  <button className="btn-untag task-comment-delete"
                    onClick={() => deleteComment.mutate({ id: c.id })}
                    title="Delete">✕</button>
                </div>
                <p className="task-comment-body">{c.content}</p>
              </div>
            ))}
          </div>
        )}

        <form className="task-comment-form" onSubmit={handleAddComment}>
          <h3 className="task-comment-form-title">{t('taskAddComment')}</h3>
          <div className="form-grid form-grid--2">
            <input className="input" placeholder={t('taskAuthorName')} value={commentAuthor}
              onChange={e => setCommentAuthor(e.target.value)} required />
            <div />
          </div>
          <textarea className="input textarea" rows={3} placeholder={t('taskCommentPlaceholder')}
            value={commentContent} onChange={e => setCommentContent(e.target.value)} required />
          <div className="form-actions">
            <button type="submit" className="btn-submit" disabled={addComment.isPending || !commentAuthor.trim() || !commentContent.trim()}>
              {addComment.isPending ? t('btnSubmitting') : t('taskAddComment')}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
