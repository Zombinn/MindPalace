import { useState, useEffect } from 'react'
import { Plus, X, Play, Square, Code, Clock } from 'lucide-react'
import { api } from '../api'

type ViewProps = { showToast: (msg: string) => void }

export default function Scripts({ showToast }: ViewProps) {
  const [scripts, setScripts] = useState<any[]>([])
  const [runs, setRuns] = useState<Record<number, any[]>>({})
  const [showForm, setShowForm] = useState(false)
  const [editScript, setEditScript] = useState<any>(null)
  const [activeScript, setActiveScript] = useState<number | null>(null)

  const load = async () => {
    try {
      const s = await api.scripts.list()
      setScripts(s)
    } catch { showToast('Failed to load scripts') }
  }
  useEffect(() => { load() }, [])

  const loadRuns = async (scriptId: number) => {
    try {
      const r = await api.scripts.runs(scriptId)
      setRuns(prev => ({ ...prev, [scriptId]: r }))
    } catch {}
  }

  const toggleEnabled = async (s: any) => {
    try {
      await api.scripts.update(s.id, { enabled: !s.enabled })
      load()
      showToast(s.enabled ? 'Disabled' : 'Enabled')
    } catch { showToast('Failed') }
  }

  const testRun = async (scriptId: number) => {
    try {
      await api.scripts.run(scriptId)
      showToast('Test run queued — check runner logs')
      setTimeout(() => loadRuns(scriptId), 2000)
    } catch { showToast('Failed to queue test run') }
  }

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="page-title">Scripts</div>
            <div className="page-subtitle">{scripts.length} scripts · AI-generated automation</div>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditScript(null); setShowForm(true) }}><Plus size={14} /> New Script</button>
        </div>
      </div>
      <div className="page-body">
        {scripts.length === 0 && <div className="empty-state"><div className="empty-state-icon">⚡</div><div>No scripts yet. Create an AI-generated automation script with a cron schedule.</div></div>}
        {scripts.map(s => (
          <div key={s.id} className="card mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code size={16} className="text-[var(--text3)]" />
                <span className="font-medium">{s.name}</span>
                {s.enabled ? <span className="badge badge-active">Active</span> : <span className="badge badge-done">Disabled</span>}
                {s.cron_expr && <span className="text-xs text-[var(--text3)]"><Clock size={12} className="inline mr-1" />{s.cron_expr}</span>}
              </div>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm" onClick={() => testRun(s.id)}><Play size={14} /> Test</button>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleEnabled(s)}>{s.enabled ? <Square size={14} /> : <Play size={14} />} {s.enabled ? 'Disable' : 'Enable'}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditScript(s); setShowForm(true) }}>Edit</button>
              </div>
            </div>
            {s.requirement && <div className="text-xs text-[var(--text2)] mt-2">{s.requirement}</div>}
            <button className="text-xs text-[var(--accent)] mt-2" onClick={() => { setActiveScript(activeScript === s.id ? null : s.id); loadRuns(s.id) }}>
              {activeScript === s.id ? 'Hide runs' : 'Show runs'}
            </button>
            {activeScript === s.id && runs[s.id] && (
              <div className="mt-3">
                {runs[s.id].length === 0 && <div className="text-xs text-[var(--text3)]">No runs yet</div>}
                {runs[s.id].map((r: any) => (
                  <div key={r.id} className="border-t border-[var(--border)] pt-2 mt-2 text-xs">
                    <div className="flex justify-between">
                      <span className={r.status === 'success' ? 'text-emerald-600' : r.status === 'failed' ? 'text-red-600' : 'text-[var(--text2)]'}>
                        {r.status} · {r.trigger}
                      </span>
                      <span className="text-[var(--text3)]">{new Date(r.started_at).toLocaleString()}</span>
                    </div>
                    {(r.stdout || r.stderr) && (
                      <pre className="bg-[var(--bg3)] rounded p-2 mt-1 text-xs overflow-x-auto max-h-40">{r.stdout}{r.stderr}</pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {showForm && <ScriptForm script={editScript} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} showToast={showToast} />}
    </>
  )
}

function ScriptForm({ script, onClose, onSaved, showToast }: any) {
  const [name, setName] = useState(script?.name || '')
  const [requirement, setReq] = useState(script?.requirement || '')
  const [code, setCode] = useState(script?.code || '# Python script\nimport requests\n\ndef main():\n    print("Hello from script")\n\nif __name__ == "__main__":\n    main()\n')
  const [cronExpr, setCron] = useState(script?.cron_expr || '')
  const [generating, setGenerating] = useState(false)

  const generateAI = async () => {
    if (!requirement.trim()) return showToast('Fill in the requirement first')
    setGenerating(true)
    try {
      const r = await api.scripts.generate({ requirement })
      setCode(r.code)
      showToast('AI code generated!')
    } catch { showToast('Generation failed. Check AI config.') }
    setGenerating(false)
  }

  const save = async () => {
    if (!name.trim()) return showToast('Name required')
    try {
      const data = { name, requirement, code, cron_expr: cronExpr || null }
      if (script) await api.scripts.update(script.id, data)
      else await api.scripts.create(data)
      onSaved()
    } catch { showToast('Save failed') }
  }

  const CRON_PRESETS = [
    { label: 'Every hour', expr: '0 * * * *' },
    { label: 'Daily 08:00', expr: '0 8 * * *' },
    { label: 'Daily 20:00', expr: '0 20 * * *' },
    { label: 'Weekdays 09:00', expr: '0 9 * * 1-5' },
    { label: 'Monday 08:00', expr: '0 8 * * 1' },
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <div className="modal-header"><span className="font-semibold">{script ? 'Edit' : 'New'} Script</span><button onClick={onClose}><X size={16} /></button></div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Daily job scraper" /></div>
          </div>
          <div className="form-group">
            <label className="form-label">Requirement (describe what the script should do)</label>
            <div className="flex gap-2">
              <textarea className="form-textarea flex-1" value={requirement} onChange={e => setReq(e.target.value)} placeholder="e.g., Fetch latest AI/ML jobs from example.com and save to JSON" rows={2} />
              <button className="btn btn-sm" onClick={generateAI} disabled={generating}>{generating ? 'Generating...' : 'AI Generate'}</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Code</label>
            <textarea className="form-textarea" style={{ fontFamily: 'monospace', fontSize: '0.8rem', minHeight: 200 }} value={code} onChange={e => setCode(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Cron Expression</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {CRON_PRESETS.map(p => (
                <button key={p.expr} className={`btn btn-sm ${cronExpr === p.expr ? 'btn-primary' : ''}`} onClick={() => setCron(p.expr)}>{p.label}</button>
              ))}
            </div>
            <input className="form-input" value={cronExpr} onChange={e => setCron(e.target.value)} placeholder="0 8 * * * (leave empty for manual only)" />
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>{script ? 'Update' : 'Create'}</button></div>
      </div>
    </div>
  )
}
