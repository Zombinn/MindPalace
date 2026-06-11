import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'
import { Home, Calendar, BookOpen, Settings, Plus, Edit3, Check, Circle, AlertTriangle, X, Sun, Moon, Menu, ChevronRight } from 'lucide-react'
import { api } from '../api'
import { formatDate, today, type ViewProps } from '../utils'
import { GoalForm } from './GoalList'
import { useLocale } from '../i18n'


export default function GoalDetail({ showToast }: ViewProps) {
  const { t } = useLocale()
  const { id } = useParams()
  const navigate = useNavigate()
  const [goal, setGoal] = useState<any>(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const load = () => api.goals.get(Number(id)).then(setGoal).catch(() => showToast(t('common.loadFailed')))
  useEffect(() => { load() }, [id])

  const archive = async () => {
    if (!confirm(t('goalDetail.archiveConfirm'))) return
    await api.goals.archive(Number(id))
    navigate('/goals')
  }

  if (!goal) return <div className="page-body"><div className="empty-state">{t('common.loading')}</div></div>

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="page-title">{goal.name}</div>
            <div className="page-subtitle">{formatDate(goal.start_date)} – {formatDate(goal.end_date)} · {goal.priority} · {goal.status}</div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-sm" onClick={() => setShowEdit(true)}><Edit3 size={14} /> {t('common.edit')}</button>
            <button className="btn btn-sm" onClick={archive}><X size={14} /> {t('common.archive')}</button>
          </div>
        </div>
      </div>
      <div className="page-body">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{t('goalDetail.tasks', { n: goal.tasks?.length || 0 })}</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowTaskForm(true)}><Plus size={14} /> {t('goalDetail.newTask')}</button>
        </div>
        {(!goal.tasks || goal.tasks.length === 0) && <div className="empty-state"><div>{t('goalDetail.emptyTasks')}</div></div>}
        {goal.tasks?.map((t: any) => (
          <div key={t.id} className="goal-card cursor-pointer" onClick={() => navigate(`/tasks/${t.id}`)}>
            <div className="flex items-center justify-between">
              <span className="font-medium">{t.title}</span>
              <div className="flex items-center gap-2">
                {t.status === 'in_progress' && <span className="badge badge-active">{t('status.inProgress')}</span>}
                {t.status === 'passed' && <span className="badge badge-done">{t('status.passed')}</span>}
                {t.status === 'delayed' && <span className="badge badge-warn">{t('status.delayed')} x{t.delay_count}</span>}
                {t.is_overdue && <span className="badge badge-overdue">{t('status.overdue')}</span>}
                <ChevronRight size={14} className="text-[var(--text3)]" />
              </div>
            </div>
            {t.objective && <div className="text-sm text-[var(--text2)] mt-1">{t.objective}</div>}
            <div className="progress-bar mt-2"><div className="progress-fill" style={{ width: `${(t.progress || 0) * 100}%` }} /></div>
          </div>
        ))}
      </div>
      {showTaskForm && <TaskForm goalId={Number(id)} onClose={() => setShowTaskForm(false)} onSaved={() => { setShowTaskForm(false); load() }} showToast={showToast} />}
      {showEdit && <GoalForm goal={goal} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); load() }} showToast={showToast} />}
    </>
  )
}

function TaskForm({ goalId, onClose, onSaved, showToast }: { goalId: number; onClose: () => void; onSaved: () => void; showToast: (m: string) => void }) {
  const { t } = useLocale()
  const [title, setTitle] = useState('')
  const [objective, setObj] = useState('')
  const [start, setStart] = useState(today())
  const [end, setEnd] = useState('')

  const save = async () => {
    if (!title.trim()) return showToast(t('goalDetail.titleRequired'))
    try {
      await api.tasks.create(goalId, { title, objective, start_date: start, end_date: end })
      onSaved()
    } catch { showToast(t('common.saveFailed')) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="font-semibold">{t('goalDetail.newStageTask')}</span><button onClick={onClose}><X size={16} /></button></div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">{t('common.title')}</label><input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('goalDetail.titlePlaceholder')} /></div>
          <div className="form-group"><label className="form-label">{t('goalDetail.objective')}</label><textarea className="form-textarea" value={objective} onChange={e => setObj(e.target.value)} placeholder={t('goalDetail.objectivePlaceholder')} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">{t('common.start')}</label><input type="date" className="form-input" value={start} onChange={e => setStart(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">{t('common.end')}</label><input type="date" className="form-input" value={end} onChange={e => setEnd(e.target.value)} /></div>
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button><button className="btn btn-primary" onClick={save}>{t('common.create')}</button></div>
      </div>
    </div>
  )
}
