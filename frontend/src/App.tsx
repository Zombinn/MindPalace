import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'
import { Home, Calendar, BookOpen, Settings, Plus, Edit3, Check, Circle, AlertTriangle, X, Sun, Moon, Menu, ChevronRight } from 'lucide-react'
import { api } from './api'

type ViewProps = { showToast: (msg: string) => void }

const NAV = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/goals', label: 'Goals', icon: Calendar },
  { path: '/notes', label: 'Notes', icon: BookOpen },
  { path: '/settings', label: 'Settings', icon: Settings },
]

function formatDate(s: string) { if (!s) return ''; return new Date(s).toISOString().slice(0, 10) }
function today() { return new Date().toISOString().slice(0, 10) }

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('mindpalace-theme') === 'dark')
  const [toast, setToast] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('mindpalace-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t) }
  }, [toast])

  const showToast = useCallback((msg: string) => setToast(msg), [])

  return (
    <div className="flex min-h-screen">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo"><span>MP</span>MindPalace</div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(n => (
            <Link key={n.path} to={n.path} className={`nav-item${location.pathname === n.path ? ' active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <n.icon size={18} />{n.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={() => setDark(!dark)} className="btn btn-ghost btn-sm">
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <span>v1.0</span>
        </div>
      </aside>
      <main className="main-content">
        <button className="btn btn-ghost btn-sm fixed top-3 left-3 z-50 lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu size={20} />
        </button>
        <Routes>
          <Route path="/" element={<Dashboard showToast={showToast} />} />
          <Route path="/goals" element={<GoalList showToast={showToast} />} />
          <Route path="/goals/:id" element={<GoalDetail showToast={showToast} />} />
          <Route path="/tasks/:id" element={<TaskDetail showToast={showToast} />} />
          <Route path="/exams/:id" element={<ExamView showToast={showToast} />} />
          <Route path="/notes" element={<NoteList showToast={showToast} />} />
          <Route path="/notes/:id" element={<NoteEditor showToast={showToast} />} />
          <Route path="/settings" element={<SettingsView showToast={showToast} />} />
        </Routes>
      </main>
      {toast && <div className="fixed bottom-6 right-6 bg-black text-white px-4 py-2 rounded-lg text-sm z-[300]">{toast}</div>}
    </div>
  )
}

/* ======== Dashboard ======== */
function Dashboard({ showToast }: ViewProps) {
  const [data, setData] = useState<any>(null)
  const [weak, setWeak] = useState<any[]>([])

  useEffect(() => {
    api.dashboard.summary().then(setData).catch(() => {})
    api.dashboard.weakPoints().then(setWeak).catch(() => {})
  }, [])

  if (!data) return <div className="page-body"><div className="empty-state">Loading...</div></div>

  return (
    <>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">{today()}</div>
      </div>
      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-value">{data.goals_active}</div><div className="stat-label">Active Goals</div></div>
          <div className="stat-card"><div className="stat-value">{data.tasks_in_progress}</div><div className="stat-label">In Progress</div></div>
          <div className="stat-card"><div className="stat-value">{data.tasks_due_today}</div><div className="stat-label">Due Today</div></div>
          <div className="stat-card"><div className="stat-value">{data.delay_count}</div><div className="stat-label">Delays</div></div>
        </div>

        {data.due_tasks?.length > 0 && (
          <div className="card mb-4">
            <h3 className="font-semibold mb-3">Due Today</h3>
            {data.due_tasks.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <Link to={`/tasks/${t.id}`} className="text-sm hover:text-[var(--accent)]">{t.title}</Link>
                {t.is_overdue && <span className="badge badge-overdue">Overdue</span>}
              </div>
            ))}
          </div>
        )}

        {weak.length > 0 && (
          <div className="card">
            <h3 className="font-semibold mb-3">Weak Points</h3>
            <div className="flex flex-wrap gap-2">
              {weak.slice(0, 10).map(w => (
                <span key={w.tag} className="text-xs bg-[var(--bg3)] px-2 py-1 rounded">{w.tag} ({w.count})</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* ======== Goal List ======== */
function GoalList({ showToast }: ViewProps) {
  const navigate = useNavigate()
  const [goals, setGoals] = useState<any[]>([])
  const [showNew, setShowNew] = useState(false)

  const load = () => api.goals.list().then(setGoals).catch(() => showToast('Failed to load goals'))
  useEffect(() => { load() }, [])

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="page-title">Goals</div>
            <div className="page-subtitle">{goals.length} goals</div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}><Plus size={16} /> New Goal</button>
        </div>
      </div>
      <div className="page-body">
        {goals.length === 0 && <div className="empty-state"><div className="empty-state-icon">🎯</div><div>No goals yet.</div></div>}
        {goals.map(g => (
          <div key={g.id} className="goal-card cursor-pointer" onClick={() => navigate(`/goals/${g.id}`)}>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold">{g.name}</span>
                {g.status === 'active' && <span className="badge badge-active">Active</span>}
                {g.status === 'done' && <span className="badge badge-done">Done</span>}
                {g.status === 'archived' && <span className="badge badge-done">Archived</span>}
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

function GoalForm({ onClose, onSaved, goal, showToast }: { onClose: () => void; onSaved: () => void; goal?: any; showToast: (m: string) => void }) {
  const [name, setName] = useState(goal?.name || '')
  const [desc, setDesc] = useState(goal?.description || '')
  const [start, setStart] = useState(goal?.start_date || today())
  const [end, setEnd] = useState(goal?.end_date || '')
  const [pri, setPri] = useState(goal?.priority || 'P1')

  const save = async () => {
    if (!name.trim()) return showToast('Name required')
    try {
      if (goal) await api.goals.update(goal.id, { name, description: desc, start_date: start, end_date: end, priority: pri })
      else await api.goals.create({ name, description: desc, start_date: start, end_date: end, priority: pri })
      onSaved()
    } catch { showToast('Save failed') }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="font-semibold">{goal ? 'Edit Goal' : 'New Goal'}</span><button onClick={onClose}><X size={16} /></button></div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Get ML/Algorithm Offer" /></div>
          <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={desc} onChange={e => setDesc(e.target.value)} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Start</label><input type="date" className="form-input" value={start} onChange={e => setStart(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">End</label><input type="date" className="form-input" value={end} onChange={e => setEnd(e.target.value)} /></div>
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-input" value={pri} onChange={e => setPri(e.target.value)}>
              <option value="P0">P0 — Critical</option><option value="P1">P1 — High</option><option value="P2">P2 — Medium</option>
            </select>
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>{goal ? 'Update' : 'Create'}</button></div>
      </div>
    </div>
  )
}

/* ======== Goal Detail ======== */
function GoalDetail({ showToast }: ViewProps) {
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

/* ======== Task Detail ======== */
function TaskDetail({ showToast }: ViewProps) {
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

/* ======== Exam View ======== */
function ExamView({ showToast }: ViewProps) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [evaluating, setEvaluating] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    api.tasks.get(Number(id)).then((t: any) => {
      if (t.exams?.length) {
        const e = t.exams[0]
        setExam(e)
        api.exams.generate(Number(id)).then((r: any) => setQuestions(r.questions || []))
      }
    }).catch(() => showToast('Failed to load'))
  }, [id])

  const submit = async () => {
    setEvaluating(true)
    try {
      await api.exams.saveAnswers(Number(id), { answers })
      const r = await api.exams.evaluate(Number(id))
      setResult(r)
    } catch { showToast('Evaluation failed') }
    setEvaluating(false)
  }

  if (!exam) return <div className="page-body"><div className="empty-state">Loading exam...</div></div>

  return (
    <>
      <div className="page-header">
        <div className="page-title">Exam</div>
        <div className="page-subtitle">Status: {exam.status} {exam.total_score != null ? `· Score: ${exam.total_score}` : ''} {exam.passed ? '· Passed' : exam.passed === false ? '· Not Passed' : ''}</div>
      </div>
      <div className="page-body">
        {result ? (
          <div>
            <div className={`card mb-4 ${result.passed ? 'border-[var(--accent)]' : 'border-[var(--danger)]'}`}>
              <h3 className="font-semibold">{result.passed ? 'Exam Passed!' : 'Exam Not Passed'}</h3>
              <p className="text-sm mt-1">Score: {result.total_score} / Pass: {result.pass_score}</p>
              {result.ai_summary && <p className="text-sm text-[var(--text2)] mt-2">{result.ai_summary}</p>}
            </div>
            <div className="flex gap-2">
              <button className="btn" onClick={() => navigate(`/tasks/${exam.stage_task_id}`)}>Back to Task</button>
            </div>
          </div>
        ) : (
          <div>
            {questions.map((q: any) => (
              <div key={q.id} className="exam-question">
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-sm">{q.question}</span>
                  <span className="text-xs text-[var(--text3)]">{q.qtype} · {q.max_score}pts</span>
                </div>
                {q.options?.length > 0 && (
                  <div className="flex flex-col gap-1 mb-2">
                    {q.options.map((o: any, i: number) => (
                      <label key={i} className="flex items-center gap-2 text-sm">
                        <input type={q.qtype === 'multi' ? 'checkbox' : 'radio'} name={`q-${q.id}`}
                          checked={answers[q.id] === o.key}
                          onChange={() => setAnswers({ ...answers, [q.id]: o.key })} />
                        {o.key}: {o.text}
                      </label>
                    ))}
                  </div>
                )}
                {(q.qtype === 'short_answer' || q.qtype === 'code') && (
                  <textarea className="exam-answer" value={answers[q.id] || ''}
                    onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder="Type your answer..." />
                )}
              </div>
            ))}
            <button className="btn btn-primary w-full mt-4" onClick={submit} disabled={evaluating}>
              {evaluating ? 'Evaluating...' : 'Submit & Evaluate'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

/* ======== Notes ======== */
function NoteList({ showToast }: ViewProps) {
  const navigate = useNavigate()
  const [notes, setNotes] = useState<any[]>([])
  const [search, setSearch] = useState('')

  const load = () => api.notes.list(search ? `?q=${encodeURIComponent(search)}` : '').then(setNotes).catch(() => {})
  useEffect(() => { load() }, [search])

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div><div className="page-title">Notes</div><div className="page-subtitle">{notes.length} notes</div></div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/notes/new')}><Plus size={14} /> New Note</button>
        </div>
      </div>
      <div className="page-body">
        <input className="form-input mb-4" placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)} />
        {notes.length === 0 && <div className="empty-state"><div>No notes yet</div></div>}
        {notes.map(n => (
          <div key={n.id} className="goal-card cursor-pointer" onClick={() => navigate(`/notes/${n.id}`)}>
            <div className="font-medium text-sm">{n.title || 'Untitled'}</div>
            <div className="text-xs text-[var(--text3)] mt-1">{n.content?.slice(0, 120)}</div>
            {n.tags?.length > 0 && <div className="flex gap-1 mt-2">{n.tags.map((t: string) => <span key={t} className="text-xs bg-[var(--bg3)] px-1 rounded">{t}</span>)}</div>}
          </div>
        ))}
      </div>
    </>
  )
}

function NoteEditor({ showToast }: ViewProps) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (!isNew) api.notes.list().then(ns => {
      const n = ns.find((x: any) => x.id === Number(id))
      if (n) { setTitle(n.title); setContent(n.content) }
    })
  }, [id])

  const save = async () => {
    try {
      if (isNew) await api.notes.create({ title, content })
      else await api.notes.update(Number(id), { title, content })
      showToast('Saved!')
      navigate('/notes')
    } catch { showToast('Save failed') }
  }

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <input className="form-input text-xl font-semibold border-0 bg-transparent outline-none flex-1" value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title..." />
          <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
        </div>
      </div>
      <div className="page-body">
        <textarea className="form-textarea w-full" style={{ minHeight: '400px', fontFamily: 'monospace' }} value={content}
          onChange={e => setContent(e.target.value)} placeholder="Write your note in Markdown..." />
      </div>
    </>
  )
}

/* ======== Settings ======== */
function SettingsView({ showToast }: ViewProps) {
  const [tab, setTab] = useState<'providers' | 'routes' | 'templates'>('providers')
  const [providers, setProviders] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [showProvForm, setShowProvForm] = useState(false)
  const [editProv, setEditProv] = useState<any>(null)
  const [editRoute, setEditRoute] = useState<any>(null)
  const [editTpl, setEditTpl] = useState<any>(null)

  const load = () => {
    api.settings.providers().then(setProviders)
    api.settings.routes().then(setRoutes)
    api.settings.templates().then(setTemplates)
  }
  useEffect(() => { load() }, [])

  return (
    <>
      <div className="page-header"><div className="page-title">Settings</div></div>
      <div className="page-body">
        <div className="flex gap-4 mb-6">
          {(['providers', 'routes', 'templates'] as const).map(t => (
            <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : ''}`} onClick={() => setTab(t)}>
              {t === 'providers' ? 'AI Providers' : t === 'routes' ? 'Scene Routes' : 'Prompt Templates'}
            </button>
          ))}
        </div>

        {tab === 'providers' && (
          <div>
            <button className="btn btn-primary btn-sm mb-4" onClick={() => { setEditProv(null); setShowProvForm(true) }}><Plus size={14} /> Add Provider</button>
            {providers.map(p => (
              <div key={p.id} className="goal-card">
                <div className="flex justify-between">
                  <div><span className="font-medium">{p.name}</span> {p.is_default && <span className="badge badge-active">Default</span>}</div>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={async () => {
                      try { const r = await api.settings.pingProvider(p.id); showToast(`OK! ${r.models?.length || 0} models`) } catch (e: any) { showToast('Failed: ' + e.message) }
                    }}>Ping</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditProv(p); setShowProvForm(true) }}><Edit3 size={12} /></button>
                  </div>
                </div>
                <div className="text-xs text-[var(--text3)] mt-1">{p.base_url} · {p.default_model}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'routes' && (
          <div>
            {['decompose', 'exam_gen', 'exam_eval', 'redecompose', 'script_gen', 'note_assist'].map(s => {
              const r = routes.find(x => x.scene === s)
              return (
                <div key={s} className="goal-card cursor-pointer" onClick={() => setEditRoute({ scene: s, ...r })}>
                  <div className="flex justify-between"><span className="font-medium">{s}</span><span className="text-sm text-[var(--text2)]">{r?.model || 'Not configured'}</span></div>
                  {r && <div className="text-xs text-[var(--text3)]">Provider #{r.provider_id} · temp={r.temperature}</div>}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'templates' && (
          <div>
            {templates.map(t => (
              <div key={t.id} className="goal-card cursor-pointer" onClick={() => setEditTpl(t)}>
                <div className="flex justify-between"><span className="font-medium">{t.name || t.scene}</span><span className={`badge ${t.is_builtin ? 'badge-done' : 'badge-active'}`}>{t.is_builtin ? 'Built-in' : 'Custom'}</span></div>
                <div className="text-xs text-[var(--text3)] mt-1">{t.content?.slice(0, 100)}...</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showProvForm && <ProviderForm provider={editProv} onClose={() => setShowProvForm(false)} onSaved={() => { setShowProvForm(false); load() }} showToast={showToast} />}
      {editRoute && <RouteForm route={editRoute} providers={providers} onClose={() => setEditRoute(null)} onSaved={() => { setEditRoute(null); load() }} showToast={showToast} />}
      {editTpl && <TemplateForm tpl={editTpl} onClose={() => setEditTpl(null)} onSaved={() => { setEditTpl(null); load() }} showToast={showToast} />}
    </>
  )
}

function ProviderForm({ provider, onClose, onSaved, showToast }: any) {
  const [name, setName] = useState(provider?.name || '')
  const [url, setUrl] = useState(provider?.base_url || '')
  const [key, setKey] = useState('')
  const [model, setModel] = useState(provider?.default_model || '')
  const [def, setDef] = useState(provider?.is_default || false)

  const save = async () => {
    if (!name || !url || (!provider && !key)) return showToast('Fill all fields')
    try {
      const data: any = { name, base_url: url, default_model: model, is_default: def }
      if (key) data.api_key = key
      if (provider) await api.settings.updateProvider(provider.id, data)
      else await api.settings.createProvider(data)
      onSaved()
    } catch { showToast('Save failed') }
  }

  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><span className="font-semibold">{provider ? 'Edit' : 'Add'} Provider</span><button onClick={onClose}><X size={16} /></button></div>
      <div className="modal-body">
        <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="OpenAI" /></div>
        <div className="form-group"><label className="form-label">Base URL</label><input className="form-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://api.openai.com/v1" /></div>
        <div className="form-group"><label className="form-label">API Key {provider && '(empty to keep)'}</label><input className="form-input" type="password" value={key} onChange={e => setKey(e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Default Model</label><input className="form-input" value={model} onChange={e => setModel(e.target.value)} placeholder="gpt-4o" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={def} onChange={e => setDef(e.target.checked)} /> Set as default</label>
      </div>
      <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></div>
    </div></div>
  )
}

function RouteForm({ route, providers, onClose, onSaved, showToast }: any) {
  const [pid, setPid] = useState(route.provider_id || '')
  const [model, setModel] = useState(route.model || '')
  const [temp, setTemp] = useState(route.temperature || 0.7)

  const save = async () => {
    try { await api.settings.setRoute(route.scene, { provider_id: Number(pid), model, temperature: Number(temp) }); onSaved() } catch { showToast('Save failed') }
  }

  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><span className="font-semibold">Route: {route.scene}</span><button onClick={onClose}><X size={16} /></button></div>
      <div className="modal-body">
        <div className="form-group"><label className="form-label">Provider</label>
          <select className="form-input" value={pid} onChange={e => setPid(e.target.value)}>
            <option value="">Default</option>
            {providers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Model</label><input className="form-input" value={model} onChange={e => setModel(e.target.value)} placeholder="gpt-4o" /></div>
        <div className="form-group"><label className="form-label">Temperature ({temp})</label><input type="range" min="0" max="2" step="0.1" value={temp} onChange={e => setTemp(e.target.value)} /></div>
      </div>
      <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></div>
    </div></div>
  )
}

function TemplateForm({ tpl, onClose, onSaved, showToast }: any) {
  const [content, setContent] = useState(tpl.content || '')
  const save = async () => { try { await api.settings.updateTemplate(tpl.id, { content }); onSaved() } catch { showToast('Save failed') } }

  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><span className="font-semibold">Template: {tpl.scene}</span><button onClick={onClose}><X size={16} /></button></div>
      <div className="modal-body">
        <textarea className="form-textarea" style={{ minHeight: '300px', fontFamily: 'monospace', fontSize: '0.8rem' }} value={content} onChange={e => setContent(e.target.value)} />
      </div>
      <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></div>
    </div></div>
  )
}
