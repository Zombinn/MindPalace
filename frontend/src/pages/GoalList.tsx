import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'
import { Home, Calendar, BookOpen, Settings, Plus, Edit3, Check, Circle, AlertTriangle, X, Sun, Moon, Menu, ChevronRight } from 'lucide-react'
import { api } from '../api'
import { formatDate, today, type ViewProps } from '../utils'
import { useLocale } from '../i18n'


export default function GoalList({ showToast }: ViewProps) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [goals, setGoals] = useState<any[]>([])
  const [showNew, setShowNew] = useState(false)

  const load = () => api.goals.list().then(setGoals).catch(() => showToast(t('goals.loadFailed')))
  useEffect(() => { load() }, [])

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="page-title">{t('goals.title')}</div>
            <div className="page-subtitle">{t('goals.count', { n: goals.length })}</div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}><Plus size={16} /> {t('goals.new')}</button>
        </div>
      </div>
      <div className="page-body">
        {goals.length === 0 && <div className="empty-state"><div className="empty-state-icon">🎯</div><div>{t('goals.empty')}</div></div>}
        {goals.map(g => (
          <div key={g.id} className="goal-card cursor-pointer" onClick={() => navigate(`/goals/${g.id}`)}>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold">{g.name}</span>
                {g.status === 'active' && <span className="badge badge-active">{t('status.active')}</span>}
                {g.status === 'done' && <span className="badge badge-done">{t('status.done')}</span>}
                {g.status === 'archived' && <span className="badge badge-done">{t('status.archived')}</span>}
              </div>
              <ChevronRight size={16} className="text-[var(--text3)]" />
            </div>
            <div className="text-sm text-[var(--text3)] mt-1">{formatDate(g.start_date)} – {formatDate(g.end_date)} · {g.priority}</div>
            {g.description && <div className="text-sm text-[var(--text2)] mt-2">{g.description}</div>}
          </div>
        ))}
      </div>
      {showNew && <GoalForm onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load() }} showToast={showToast} />}
    </>
  )
}

export function GoalForm({ onClose, onSaved, goal, showToast }: { onClose: () => void; onSaved: () => void; goal?: any; showToast: (m: string) => void }) {
  const { t } = useLocale()
  const [name, setName] = useState(goal?.name || '')
  const [desc, setDesc] = useState(goal?.description || '')
  const [start, setStart] = useState(goal?.start_date || today())
  const [end, setEnd] = useState(goal?.end_date || '')
  const [pri, setPri] = useState(goal?.priority || 'P1')

  const save = async () => {
    if (!name.trim()) return showToast(t('goals.nameRequired'))
    try {
      if (goal) await api.goals.update(goal.id, { name, description: desc, start_date: start, end_date: end || undefined, priority: pri })
      else await api.goals.create({ name, description: desc, start_date: start, end_date: end || undefined, priority: pri })
      onSaved()
    } catch { showToast(t('common.saveFailed')) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="font-semibold">{goal ? t('goals.edit') : t('goals.newGoal')}</span><button onClick={onClose}><X size={16} /></button></div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">{t('common.name')}</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder={t('goals.namePlaceholder')} /></div>
          <div className="form-group"><label className="form-label">{t('common.description')}</label><textarea className="form-textarea" value={desc} onChange={e => setDesc(e.target.value)} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">{t('common.start')}</label><input type="date" className="form-input" value={start} onChange={e => setStart(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">{t('common.end')}</label><input type="date" className="form-input" value={end} onChange={e => setEnd(e.target.value)} /></div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('common.priority')}</label>
            <select className="form-input" value={pri} onChange={e => setPri(e.target.value)}>
              <option value="P0">{t('goals.p0')}</option><option value="P1">{t('goals.p1')}</option><option value="P2">{t('goals.p2')}</option>
            </select>
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button><button className="btn btn-primary" onClick={save}>{goal ? t('common.update') : t('common.create')}</button></div>
      </div>
    </div>
  )
}
