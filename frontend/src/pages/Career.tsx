import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, X, ChevronRight, ExternalLink, Briefcase, Inbox, BarChart3 } from 'lucide-react'
import { api } from '../api'

type ViewProps = { showToast: (msg: string) => void }

const STATES = [
  { id: 'evaluated', label: 'Evaluated', color: 'bg-slate-200 dark:bg-slate-700' },
  { id: 'applied', label: 'Applied', color: 'bg-blue-200 dark:bg-blue-900' },
  { id: 'responded', label: 'Responded', color: 'bg-amber-200 dark:bg-amber-900' },
  { id: 'interview', label: 'Interview', color: 'bg-purple-200 dark:bg-purple-900' },
  { id: 'offer', label: 'Offer', color: 'bg-emerald-200 dark:bg-emerald-900' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-200 dark:bg-red-900' },
  { id: 'discarded', label: 'Discarded', color: 'bg-neutral-200 dark:bg-neutral-700' },
  { id: 'skip', label: 'SKIP', color: 'bg-neutral-100 dark:bg-neutral-800' },
]

function statusColor(status: string) {
  const s = STATES.find(x => x.id === status)
  return s?.color ?? 'bg-gray-100'
}

function today() { return new Date().toISOString().slice(0, 10) }

export default function Career({ showToast }: ViewProps) {
  const [tab, setTab] = useState<'board' | 'inbox'>('board')
  const [jobs, setJobs] = useState<any[]>([])
  const [pipeline, setPipeline] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [editJob, setEditJob] = useState<any>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const load = async () => {
    try {
      const [j, p, s] = await Promise.all([
        api.career.jobs(), api.career.pipeline(), api.career.stats()
      ])
      setJobs(j); setPipeline(p); setStats(s)
    } catch { showToast('Failed to load career data') }
  }

  useEffect(() => { load() }, [])

  const moveJob = async (jobId: number, newStatus: string) => {
    const job = jobs.find(j => j.id === jobId)
    if (!job || job.status === newStatus) return
    // Optimistic update
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j))
    try {
      await api.career.updateJob(jobId, { status: newStatus })
    } catch {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: job.status } : j))
      showToast('Failed to update status')
    }
  }

  const handleDragStart = (e: React.DragEvent, jobId: number) => {
    e.dataTransfer.setData('jobId', String(jobId))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    setDragOver(null)
    const jobId = Number(e.dataTransfer.getData('jobId'))
    moveJob(jobId, status)
  }

  const deleteJob = async (id: number) => {
    if (!confirm('Delete this application?')) return
    try { await api.career.deleteJob(id); load() } catch { showToast('Delete failed') }
  }

  const addPipelineItem = async () => {
    const url = prompt('Job posting URL:')
    if (!url?.trim()) return
    try {
      await api.career.addPipelineItem({ url: url.trim() })
      load()
      showToast('Added to pipeline inbox')
    } catch { showToast('Failed to add') }
  }

  const removePipelineItem = async (id: number) => {
    try { await api.career.deletePipelineItem(id); load() } catch { showToast('Failed') }
  }

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="page-title">Career Pipeline</div>
            <div className="page-subtitle">
              {stats ? `${stats.total} applications · ${stats.pipeline_pending} inbox` : 'Loading...'}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex rounded-lg border border-[var(--border)]">
              <button className={`btn btn-sm rounded-r-none border-0 ${tab === 'board' ? 'bg-[var(--bg3)]' : 'bg-transparent'}`} onClick={() => setTab('board')}><BarChart3 size={14} /> Board</button>
              <button className={`btn btn-sm rounded-l-none border-l border-[var(--border)] ${tab === 'inbox' ? 'bg-[var(--bg3)]' : 'bg-transparent'}`} onClick={() => setTab('inbox')}><Inbox size={14} /> Inbox ({pipeline.filter((p:any) => p.status === 'pending').length})</button>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditJob(null); setShowForm(true) }}><Plus size={14} /> Add Job</button>
          </div>
        </div>
        {stats && (
          <div className="flex gap-4 mt-4 flex-wrap">
            {STATES.map(s => {
              const count = stats.by_status?.[s.id] || 0
              return count > 0 ? (
                <div key={s.id} className="flex items-center gap-1.5 text-xs">
                  <div className={`w-3 h-3 rounded ${s.color}`} />
                  <span className="text-[var(--text2)]">{s.label}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ) : null
            })}
            <div className="text-xs text-[var(--text3)] ml-auto">
              {stats.avg_score != null ? `Avg score: ${stats.avg_score}/5` : 'No scores yet'}
            </div>
          </div>
        )}
      </div>

      <div className="page-body" style={{ maxWidth: '100%', padding: '16px 20px' }}>
        {tab === 'inbox' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Pipeline Inbox — Pending URLs</h3>
              <button className="btn btn-sm" onClick={addPipelineItem}><Plus size={14} /> Add URL</button>
            </div>
            {pipeline.length === 0 && <div className="empty-state"><div className="empty-state-icon">📥</div><div>No URLs in pipeline. Paste job posting links to process them.</div></div>}
            {pipeline.map((p: any) => (
              <div key={p.id} className="goal-card">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium truncate max-w-[600px]">{p.url}</div>
                    {p.company && <div className="text-xs text-[var(--text2)] mt-1">{p.company}{p.role ? ` · ${p.role}` : ''}</div>}
                    <span className={`badge text-xs ${p.status === 'pending' ? 'badge-warn' : p.status === 'processed' ? 'badge-done' : p.status === 'error' ? 'badge-overdue' : 'badge-active'}`}>{p.status}</span>
                    {p.score != null && <span className="text-xs ml-2">{p.score}/5</span>}
                  </div>
                  <div className="flex gap-2">
                    {p.url && <a href={p.url} target="_blank" className="btn btn-ghost btn-sm" title="Open URL"><ExternalLink size={14} /></a>}
                    <button className="btn btn-ghost btn-sm" onClick={() => removePipelineItem(p.id)}><X size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Kanban Board */
          <div className="kanban-board">
            {STATES.map(state => {
              const columnJobs = jobs.filter((j: any) => j.status === state.id)
              return (
                <div
                  key={state.id}
                  className={`kanban-column ${dragOver === state.id ? 'ring-2 ring-[var(--accent)]' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(state.id) }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => handleDrop(e, state.id)}
                >
                  <div className="kanban-column-header">
                    <div className={`w-3 h-3 rounded ${state.color}`} />
                    <span className="font-medium text-xs">{state.label}</span>
                    <span className="text-xs text-[var(--text3)] ml-auto">{columnJobs.length}</span>
                  </div>
                  <div className="kanban-column-body">
                    {columnJobs.map((job: any) => (
                      <div
                        key={job.id}
                        className="kanban-card"
                        draggable
                        onDragStart={e => handleDragStart(e, job.id)}
                        onClick={() => { setEditJob(job); setShowForm(true) }}
                      >
                        <div className="text-sm font-medium leading-tight">{job.company}</div>
                        <div className="text-xs text-[var(--text2)] mt-0.5">{job.role}</div>
                        <div className="flex items-center gap-2 mt-2">
                          {job.score != null && <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${job.score >= 4 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : job.score >= 2.5 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>{job.score}/5</span>}
                          {job.tags?.map((t: string) => <span key={t} className="text-xs bg-[var(--bg3)] px-1 rounded">{t}</span>)}
                          <button className="btn btn-ghost btn-sm ml-auto p-0 h-5 w-5" onClick={e => { e.stopPropagation(); deleteJob(job.id) }}><X size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showForm && <JobForm job={editJob} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} showToast={showToast} />}

      <style>{`
        .kanban-board { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; overflow-x: auto; min-height: 60vh; }
        .kanban-column { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; display: flex; flex-direction: column; min-width: 160px; }
        .kanban-column-header { display: flex; align-items: center; gap: 6px; padding: 10px 12px; border-bottom: 1px solid var(--border); }
        .kanban-column-body { padding: 8px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
        .kanban-card { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 10px 12px; cursor: pointer; transition: border-color .15s, box-shadow .15s; }
        .kanban-card:hover { border-color: var(--accent); box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        @media (max-width: 1200px) { .kanban-board { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 768px)  { .kanban-board { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
    </>
  )
}

function JobForm({ job, onClose, onSaved, showToast }: { job?: any; onClose: () => void; onSaved: () => void; showToast: (m: string) => void }) {
  const [company, setCompany] = useState(job?.company || '')
  const [role, setRole] = useState(job?.role || '')
  const [url, setUrl] = useState(job?.url || '')
  const [status, setStatus] = useState(job?.status || 'evaluated')
  const [score, setScore] = useState(job?.score != null ? String(job.score) : '')
  const [location, setLocation] = useState(job?.location || '')
  const [notes, setNotes] = useState(job?.notes || '')
  const [tags, setTags] = useState((job?.tags || []).join(', '))
  const [appliedDate, setAppliedDate] = useState(job?.applied_date || '')

  const save = async () => {
    if (!company.trim()) return showToast('Company name required')
    const data: any = {
      company: company.trim(), role: role.trim(), url: url.trim(),
      status, location: location.trim(), notes, applied_date: appliedDate || null,
      tags: tags.split(',').map((t: string) => t.trim()).filter(Boolean),
    }
    if (score && !isNaN(Number(score))) data.score = Number(score)
    try {
      if (job) await api.career.updateJob(job.id, data)
      else await api.career.createJob(data)
      onSaved()
    } catch { showToast('Save failed') }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header"><span className="font-semibold">{job ? 'Edit' : 'Add'} Job</span><button onClick={onClose}><X size={16} /></button></div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group"><label className="form-label">Company *</label><input className="form-input" value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" /></div>
            <div className="form-group"><label className="form-label">Role</label><input className="form-input" value={role} onChange={e => setRole(e.target.value)} placeholder="Senior ML Engineer" /></div>
          </div>
          <div className="form-group"><label className="form-label">URL</label><input className="form-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://jobs.example.com/..." /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Status</label>
              <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
                {STATES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Score (0-5)</label><input className="form-input" type="number" min="0" max="5" step="0.5" value={score} onChange={e => setScore(e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Location</label><input className="form-input" value={location} onChange={e => setLocation(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Applied Date</label><input type="date" className="form-input" value={appliedDate} onChange={e => setAppliedDate(e.target.value)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Tags (comma-separated)</label><input className="form-input" value={tags} onChange={e => setTags(e.target.value)} placeholder="AI/ML, remote, startup" /></div>
          <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} rows={3} /></div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>{job ? 'Update' : 'Add'}</button></div>
      </div>
    </div>
  )
}
