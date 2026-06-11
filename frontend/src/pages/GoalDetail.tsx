import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'
import { Home, Calendar, BookOpen, Settings, Plus, Edit3, Check, Circle, AlertTriangle, X, Sun, Moon, Menu, ChevronRight } from 'lucide-react'
import { api } from '../api'
import { formatDate, today, type ViewProps } from '../utils'
import { GoalForm } from './GoalList'


export default function GoalDetail({ showToast }: ViewProps) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [goal, setGoal] = useState<any>(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const load = () => api.goals.get(Number(id)).then(setGoal).catch(() => showToast('Failed to load'))
  useEffect(() => { load() }, [id])

  const archive = async () => {
    if (!confirm('Archive this goal?')) return
    await api.goals.archive(Number(id))
    navigate('/goals')
  }

  if (!goal) return <div className="page-body"><div className="empty-state">Loading...</div></div>

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="page-title">{goal.name}</div>
            <div className="page-subtitle">{formatDate(goal.start_date)} – {formatDate(goal.end_date)} · {goal.priority} · {goal.status}</div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-sm" onClick={() => setShowEdit(true)}><Edit3 size={14} /> Edit</button>
            <button className="btn btn-sm" onClick={archive}><X size={14} /> Archive</button>
          </div>
        </div>
      </div>
      <div className="page-body">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Stage Tasks ({goal.tasks?.length || 0})</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowTaskForm(true)}><Plus size={14} /> New Task</button>
        </div>
        {(!goal.tasks || goal.tasks.length === 0) && <div className="empty-state"><div>No tasks yet</div></div>}
        {goal.tasks?.map((t: any) => (
          <div key={t.id} className="goal-card cursor-pointer" onClick={() => navigate(`/tasks/${t.id}`)}>
            <div className="flex items-center justify-between">
              <span className="font-medium">{t.title}</span>
              <div className="flex items-center gap-2">
                {t.status === 'in_progress' && <span className="badge badge-active">In Progress</span>}
                {t.status === 'passed' && <span className="badge badge-done">Passed</span>}
                {t.status === 'delayed' && <span className="badge badge-warn">Delayed x{t.delay_count}</span>}
                {t.is_overdue && <span className="badge badge-overdue">Overdue</span>}
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
  const [title, setTitle] = useState('')
  const [objective, setObj] = useState('')
  const [start, setStart] = useState(today())
  const [end, setEnd] = useState('')

  const save = async () => {
    if (!title.trim()) return showToast('Title required')
    try {
      await api.tasks.create(goalId, { title, objective, start_date: start, end_date: end })
      onSaved()
    } catch { showToast('Save failed') }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="font-semibold">New Stage Task</span><button onClick={onClose}><X size={16} /></button></div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Master DETR architecture" /></div>
          <div className="form-group"><label className="form-label">Learning Objective</label><textarea className="form-textarea" value={objective} onChange={e => setObj(e.target.value)} placeholder="What exactly to learn and to what level?" /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Start</label><input type="date" className="form-input" value={start} onChange={e => setStart(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">End</label><input type="date" className="form-input" value={end} onChange={e => setEnd(e.target.value)} /></div>
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Create</button></div>
      </div>
    </div>
  )
}
