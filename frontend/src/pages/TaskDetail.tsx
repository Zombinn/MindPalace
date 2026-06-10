import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'
import { Home, Calendar, BookOpen, Settings, Plus, Edit3, Check, Circle, AlertTriangle, X, Sun, Moon, Menu, ChevronRight } from 'lucide-react'
import { api } from '../api'

type ViewProps = { showToast: (msg: string) => void }

function formatDate(s: string) { if (!s) return ''; return new Date(s).toISOString().slice(0, 10) }
function today() { return new Date().toISOString().slice(0, 10) }


export default function TaskDetail({ showToast }: ViewProps) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [task, setTask] = useState<any>(null)
  const [decomposing, setDecomposing] = useState(false)
  const [draft, setDraft] = useState<any>(null)

  const load = () => api.tasks.get(Number(id)).then(setTask).catch(() => showToast('Failed to load'))
  useEffect(() => { load() }, [id])

  const toggleSub = async (sid: number, current: string) => {
    const ns = current === 'done' ? 'todo' : 'done'
    await api.subtasks.update(sid, { status: ns })
    load()
  }

  const startDecompose = async () => {
    setDecomposing(true)
    try {
      const r = await api.tasks.decompose(Number(id))
      setDraft(r.draft)
    } catch { showToast('Decomposition failed. Check AI config.') }
    setDecomposing(false)
  }

  const confirmDecompose = async () => {
    if (!draft?.subtasks?.length) return
    await api.tasks.confirmSubs(Number(id), { subtasks: draft.subtasks })
    setDraft(null)
    load()
    showToast('Sub-tasks confirmed!')
  }

  const startExam = async () => {
    try {
      const r = await api.exams.generate(Number(id))
      navigate(`/exams/${r.exam.id}`)
    } catch { showToast('Exam generation failed. Check AI config.') }
  }

  if (!task) return <div className="page-body"><div className="empty-state">Loading...</div></div>

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="page-title">{task.title}</div>
            <div className="page-subtitle">{task.status} · {Math.round((task.progress || 0) * 100)}% · Delays: {task.delay_count}</div>
          </div>
          <div className="flex gap-2">
            {task.status !== 'passed' && (
              <button className="btn btn-primary btn-sm" onClick={startExam}><AlertTriangle size={14} /> Take Exam</button>
            )}
          </div>
        </div>
        <div className="progress-bar mt-3"><div className="progress-fill" style={{ width: `${(task.progress || 0) * 100}%` }} /></div>
      </div>
      <div className="page-body">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Sub-tasks ({task.subtasks?.length || 0})</h3>
          <button className="btn btn-sm" onClick={startDecompose} disabled={decomposing}>
            {decomposing ? 'Decomposing...' : task.subtasks?.length ? 'Re-decompose' : 'AI Decompose'}
          </button>
        </div>

        {draft && (
          <div className="card mb-4" style={{ borderColor: 'var(--accent)' }}>
            <h3 className="font-semibold mb-2">AI Draft – Review before confirming</h3>
            {draft.subtasks?.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2 py-1 border-b border-[var(--border)] last:border-0">
                <span className="text-xs text-[var(--text3)]">{i + 1}.</span>
                <div>
                  <div className="text-sm font-medium">{s.title}</div>
                  {s.content && <div className="text-xs text-[var(--text3)]">{s.content}</div>}
                </div>
                {s.knowledge_tags?.length > 0 && <div className="flex gap-1 ml-auto">{s.knowledge_tags.map((t: string) => <span key={t} className="text-xs bg-[var(--bg3)] px-1 rounded">{t}</span>)}</div>}
              </div>
            ))}
            <div className="flex gap-2 mt-3">
              <button className="btn btn-primary btn-sm" onClick={confirmDecompose}>Confirm & Save</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setDraft(null)}>Discard</button>
            </div>
          </div>
        )}

        {task.subtasks?.map((s: any) => (
          <div key={s.id} className={`task-item py-2 border-b border-[var(--border)] last:border-0 ${s.status === 'mastered' ? 'opacity-60' : ''}`}>
            <button className="task-check" onClick={() => toggleSub(s.id, s.status)}>
              {s.status === 'done' || s.status === 'mastered' ? <Check size={16} className="text-[var(--accent)]" /> : <Circle size={16} />}
            </button>
            <div className="flex-1">
              <span className={`text-sm ${s.status === 'done' || s.status === 'mastered' ? 'line-through text-[var(--text3)]' : ''}`}>{s.title}</span>
              {s.knowledge_tags?.length > 0 && <div className="flex gap-1 mt-1">{s.knowledge_tags.map((t: string) => <span key={t} className="text-xs bg-[var(--bg3)] px-1 rounded">{t}</span>)}</div>}
            </div>
            {s.status === 'mastered' && <span className="badge badge-done text-xs">Mastered</span>}
            {s.status === 'weak' && <span className="badge badge-warn text-xs">Weak</span>}
            {s.locked && <span className="text-xs text-[var(--text3)]">🔒</span>}
          </div>
        ))}
      </div>
    </>
  )
}
