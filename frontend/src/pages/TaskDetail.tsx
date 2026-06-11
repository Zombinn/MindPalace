import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'
import { Home, Calendar, BookOpen, Settings, Plus, Edit3, Check, Circle, AlertTriangle, X, Sun, Moon, Menu, ChevronRight } from 'lucide-react'
import { api } from '../api'
import { formatDate, today, type ViewProps } from '../utils'
import { useLocale } from '../i18n'

function ExamConfigEditor({ task, onUpdated, showToast }: { task: any; onUpdated: () => void; showToast: (m: string) => void }) {
  const { t } = useLocale()
  const [editing, setEditing] = useState(false)
  const [questionCount, setQuestionCount] = useState(String(task.exam_config?.question_count || 5))
  const [passScore, setPassScore] = useState(String(task.exam_config?.pass_score || 80))
  const [maxDelays, setMaxDelays] = useState(String(task.max_delays || 3))

  const save = async () => {
    try {
      await api.tasks.update(task.id, {
        exam_config: { question_count: Number(questionCount), pass_score: Number(passScore) },
        max_delays: Number(maxDelays),
      })
      showToast(t('taskDetail.examConfigSaved'))
      setEditing(false)
      onUpdated()
    } catch { showToast(t('common.saveFailed')) }
  }

  if (!editing) return (
    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text3)]">
      <span>{t('taskDetail.examConfig', { n: questionCount, p: passScore, d: maxDelays })}</span>
      <button className="btn btn-ghost btn-sm text-xs" onClick={() => setEditing(true)}>{t('common.configure')}</button>
    </div>
  )

  return (
    <div className="flex items-center gap-3 mt-2 flex-wrap">
      <div className="flex items-center gap-1">
        <label className="text-xs text-[var(--text3)]">{t('taskDetail.questions')}</label>
        <input className="form-input text-xs" style={{ width: 60, padding: '3px 6px' }} type="number" min="1" max="20" value={questionCount} onChange={e => setQuestionCount(e.target.value)} />
      </div>
      <div className="flex items-center gap-1">
        <label className="text-xs text-[var(--text3)]">{t('taskDetail.passPercent')}</label>
        <input className="form-input text-xs" style={{ width: 60, padding: '3px 6px' }} type="number" min="10" max="100" value={passScore} onChange={e => setPassScore(e.target.value)} />
      </div>
      <div className="flex items-center gap-1">
        <label className="text-xs text-[var(--text3)]">{t('taskDetail.maxDelays')}</label>
        <input className="form-input text-xs" style={{ width: 50, padding: '3px 6px' }} type="number" min="0" max="10" value={maxDelays} onChange={e => setMaxDelays(e.target.value)} />
      </div>
      <button className="btn btn-primary btn-sm text-xs" onClick={save}>{t('common.save')}</button>
      <button className="btn btn-ghost btn-sm text-xs" onClick={() => setEditing(false)}>{t('common.cancel')}</button>
    </div>
  )
}

export default function TaskDetail({ showToast }: ViewProps) {
  const { t } = useLocale()
  const { id } = useParams()
  const navigate = useNavigate()
  const [task, setTask] = useState<any>(null)
  const [decomposing, setDecomposing] = useState(false)
  const [draft, setDraft] = useState<any>(null)
  const [showEditTask, setShowEditTask] = useState(false)
  const [selectedSub, setSelectedSub] = useState<any>(null)
  const [showReDecomposeConfirm, setShowReDecomposeConfirm] = useState(false)

  const load = () => api.tasks.get(Number(id)).then(setTask).catch(() => showToast(t('common.loadFailed')))
  useEffect(() => { load() }, [id])

  const toggleSub = async (sid: number, current: string) => {
    const ns = current === 'done' ? 'todo' : 'done'
    await api.subtasks.update(sid, { status: ns })
    load()
  }

  const startDecompose = () => {
    if (task.subtasks?.length) {
      setShowReDecomposeConfirm(true)
    } else {
      doDecompose()
    }
  }
  const doDecompose = async () => {
    setShowReDecomposeConfirm(false)
    setDecomposing(true)
    try {
      const r = await api.tasks.decompose(Number(id))
      setDraft(r.draft)
    } catch { showToast(t('taskDetail.decomposeFailed')) }
    setDecomposing(false)
  }

  const confirmDecompose = async () => {
    if (!draft?.subtasks?.length) return
    await api.tasks.confirmSubs(Number(id), { subtasks: draft.subtasks })
    setDraft(null)
    load()
    showToast(t('taskDetail.subsConfirmed'))
  }

  const startExam = async () => {
    try {
      const r = await api.exams.generate(Number(id))
      navigate(`/exams/${r.exam.id}`)
    } catch { showToast(t('taskDetail.examGenFailed')) }
  }

  if (!task) return <div className="page-body"><div className="empty-state">{t('common.loading')}</div></div>

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link to={`/goals/${task.goal_id}`} className="text-xs text-[var(--text3)] hover:text-[var(--accent)]">
                ← {t('nav.goals')}
              </Link>
            </div>
            <div className="page-title">{task.title}</div>
            <div className="page-subtitle">{task.status} · {Math.round((task.progress || 0) * 100)}% · Delays: {task.delay_count}</div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-sm" onClick={() => setShowEditTask(true)}><Edit3 size={14} /> {t('common.edit')}</button>
            {task.status !== 'passed' && (
              <button className="btn btn-primary btn-sm" onClick={startExam}><AlertTriangle size={14} /> {t('taskDetail.takeExam')}</button>
            )}
          </div>
        </div>
        <div className="progress-bar mt-3"><div className="progress-fill" style={{ width: `${(task.progress || 0) * 100}%` }} /></div>
        <ExamConfigEditor task={task} onUpdated={load} showToast={showToast} />
      </div>
      <div className="page-body">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{t('taskDetail.subtasks', { n: task.subtasks?.length || 0 })}</h3>
          <button className="btn btn-sm" onClick={startDecompose} disabled={decomposing}>
            {decomposing ? t('taskDetail.decomposing') : task.subtasks?.length ? t('taskDetail.redecompose') : t('taskDetail.aiDecompose')}
          </button>
        </div>

        {draft && (
          <div className="card mb-4" style={{ borderColor: 'var(--accent)' }}>
            <h3 className="font-semibold mb-2">{t('taskDetail.aiDraft')}</h3>
            {draft.subtasks?.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2 py-1 border-b border-[var(--border)] last:border-0">
                <span className="text-xs text-[var(--text3)]">{i + 1}.</span>
                <div>
                  <div className="text-sm font-medium">{s.title}</div>
                  {s.content && <div className="text-xs text-[var(--text3)]">{s.content}</div>}
                </div>
                {s.knowledge_tags?.length > 0 && <div className="flex gap-1 ml-auto">{s.knowledge_tags.map((tg: string) => <span key={tg} className="text-xs bg-[var(--bg3)] px-1 rounded">{tg}</span>)}</div>}
              </div>
            ))}
            <div className="flex gap-2 mt-3">
              <button className="btn btn-primary btn-sm" onClick={confirmDecompose}>{t('taskDetail.confirmSave')}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setDraft(null)}>{t('common.discard')}</button>
            </div>
          </div>
        )}

        {task.subtasks?.map((s: any) => (
          <div key={s.id}
            className={`task-item py-2 border-b border-[var(--border)] last:border-0 ${s.status === 'mastered' ? 'opacity-60' : ''} cursor-pointer hover:bg-[var(--bg3)] rounded px-1`}
            onClick={() => setSelectedSub(s)}
          >
            <button className="task-check" onClick={(e) => { e.stopPropagation(); toggleSub(s.id, s.status) }}>
              {s.status === 'done' || s.status === 'mastered' ? <Check size={16} className="text-[var(--accent)]" /> : <Circle size={16} />}
            </button>
            <div className="flex-1">
              <span className={`text-sm ${s.status === 'done' || s.status === 'mastered' ? 'line-through text-[var(--text3)]' : ''}`}>{s.title}</span>
              {s.content && <div className="text-xs text-[var(--text3)] truncate">{s.content}</div>}
              {s.knowledge_tags?.length > 0 && <div className="flex gap-1 mt-1">{s.knowledge_tags.map((tg: string) => <span key={tg} className="text-xs bg-[var(--bg3)] px-1 rounded">{tg}</span>)}</div>}
            </div>
            {s.status === 'mastered' && <span className="badge badge-done text-xs">{t('status.mastered')}</span>}
            {s.status === 'weak' && <span className="badge badge-warn text-xs">{t('status.weak')}</span>}
            {s.locked && <span className="text-xs text-[var(--text3)]">🔒</span>}
            <ChevronRight size={14} className="text-[var(--text3)]" />
          </div>
        ))}
      </div>
      {showEditTask && <TaskEditForm task={task} onClose={() => setShowEditTask(false)} onSaved={() => { setShowEditTask(false); load() }} showToast={showToast} />}
      {showReDecomposeConfirm && (
        <div className="modal-overlay" onClick={() => setShowReDecomposeConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <span className="font-semibold text-sm">Re-decompose?</span>
              <button onClick={() => setShowReDecomposeConfirm(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-[var(--text2)]">
                This will replace all existing sub-tasks ({task.subtasks?.length || 0}) with new AI-generated ones.
                Mastered sub-tasks will be preserved. Continue?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowReDecomposeConfirm(false)}>{t('common.cancel')}</button>
              <button className="btn btn-primary btn-sm" onClick={doDecompose}>{t('common.confirm')}</button>
            </div>
          </div>
        </div>
      )}
      {selectedSub && <SubDetail sub={selectedSub} onClose={() => setSelectedSub(null)} showToast={showToast} />}
    </>
  )
}

function SubDetail({ sub, onClose, showToast }: { sub: any; onClose: () => void; showToast: (m: string) => void }) {
  const { t } = useLocale()
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '90vh' }}>
        <div className="modal-header">
          <div>
            <span className="font-semibold text-sm">{sub.title}</span>
            <div className="flex gap-1 mt-1">
              {sub.status === 'mastered' && <span className="badge badge-done text-xs">{t('status.mastered')}</span>}
              {sub.status === 'weak' && <span className="badge badge-warn text-xs">{t('status.weak')}</span>}
              {sub.status === 'done' && <span className="badge badge-active text-xs">{t('status.done')}</span>}
              {sub.status === 'todo' && <span className="badge text-xs" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>Todo</span>}
              {sub.locked && <span className="text-xs">🔒</span>}
              {sub.est_hours != null && <span className="text-xs text-[var(--text3)]">Est. {sub.est_hours}h</span>}
            </div>
          </div>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {sub.content && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wide mb-2">📖 Study Notes</div>
              <div className="prose prose-sm dark:prose-invert max-w-none bg-[var(--bg3)] rounded p-3">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{sub.content}</div>
              </div>
            </div>
          )}

          {sub.key_points?.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wide mb-2">⭐ Key Points</div>
              <ul className="space-y-1">
                {sub.key_points.map((kp: string, i: number) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-[var(--accent)] font-medium">{i + 1}.</span>
                    <span>{kp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sub.practice_questions?.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wide mb-2">✏️ Practice Questions</div>
              {sub.practice_questions.map((pq: string, i: number) => (
                <div key={i} className="bg-[var(--bg3)] rounded p-3 mb-2 text-sm whitespace-pre-wrap">{pq}</div>
              ))}
            </div>
          )}

          {sub.ref_links?.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wide mb-2">🔗 Reference Links</div>
              <ul className="space-y-1">
                {sub.ref_links.map((link: string, i: number) => (
                  <li key={i} className="text-sm">
                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline break-all">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sub.knowledge_tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {sub.knowledge_tags.map((tg: string) => (
                <span key={tg} className="text-xs bg-[var(--bg3)] px-2 py-0.5 rounded">{tg}</span>
              ))}
            </div>
          )}

          {!sub.content && !sub.key_points?.length && !sub.practice_questions?.length && (
            <div className="text-sm text-[var(--text3)] italic text-center py-8">No detailed content available. Run AI Decompose to generate learning materials.</div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-sm" onClick={async () => {
            try {
              await api.notes.create({
                title: `Note: ${sub.title}`,
                content: '',
                sub_task_id: sub.id,
                tags: sub.knowledge_tags || [],
              })
              showToast(t('notes.saved'))
              onClose()
            } catch { showToast(t('common.saveFailed')) }
          }}>
            <BookOpen size={14} /> Create Note
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('common.close')}</button>
        </div>
      </div>
    </div>
  )
}

function TaskEditForm({ task, onClose, onSaved, showToast }: { task: any; onClose: () => void; onSaved: () => void; showToast: (m: string) => void }) {
  const { t } = useLocale()
  const [title, setTitle] = useState(task.title || '')
  const [objective, setObjective] = useState(task.objective || '')

  const save = async () => {
    if (!title.trim()) return showToast(t('goalDetail.titleRequired'))
    try {
      await api.tasks.update(task.id, { title, objective })
      onSaved()
      showToast(t('common.update'))
    } catch { showToast(t('common.saveFailed')) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="font-semibold">{t('common.edit')} Task</span><button onClick={onClose}><X size={16} /></button></div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">{t('common.title')}</label><input className="form-input" value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">{t('goalDetail.objective')}</label><textarea className="form-textarea" value={objective} onChange={e => setObjective(e.target.value)} /></div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button><button className="btn btn-primary" onClick={save}>{t('common.update')}</button></div>
      </div>
    </div>
  )
}
