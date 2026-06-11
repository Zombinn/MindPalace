import { useState, useEffect } from 'react'
import { Plus, X, Play, Square, Code, Clock, ChevronRight, ExternalLink, Trash2 } from 'lucide-react'
import { api } from '../api'
import { useLocale } from '../i18n'

type ViewProps = { showToast: (msg: string) => void }

export default function Scripts({ showToast }: ViewProps) {
  const { t } = useLocale()
  const [scripts, setScripts] = useState<any[]>([])
  const [runs, setRuns] = useState<Record<number, any[]>>({})
  const [showForm, setShowForm] = useState(false)
  const [editScript, setEditScript] = useState<any>(null)
  const [activeScript, setActiveScript] = useState<number | null>(null)
  const [selectedRun, setSelectedRun] = useState<any>(null)
  const [runsPage, setRunsPage] = useState<Record<number, number>>({})
  const [runsTotal, setRunsTotal] = useState<Record<number, number>>({})

  const load = async () => {
    try {
      const s = await api.scripts.list()
      setScripts(s)
    } catch { showToast(t('scripts.loadFailed')) }
  }
  useEffect(() => { load() }, [])

  const loadRuns = async (scriptId: number, page: number = 1) => {
    try {
      const r: any = await api.scripts.runs(scriptId)
      setRuns(prev => ({ ...prev, [scriptId]: r.items || r }))
      setRunsPage(prev => ({ ...prev, [scriptId]: page }))
      setRunsTotal(prev => ({ ...prev, [scriptId]: r.total || 0 }))
    } catch {}
  }

  const toggleEnabled = async (s: any) => {
    try {
      await api.scripts.update(s.id, { enabled: !s.enabled })
      load()
      showToast(s.enabled ? t('common.disable') : t('common.enable'))
    } catch { showToast(t('common.saveFailed')) }
  }

  const testRun = async (scriptId: number) => {
    try {
      const result = await api.scripts.run(scriptId)
      showToast(result.status === 'success' ? 'Execution OK' : result.status === 'timeout' ? 'Timed out' : 'Execution failed')
      loadRuns(scriptId, 1)
    } catch { showToast(t('scripts.testFailed')) }
  }

  const deleteRun = async (scriptId: number, runId: number) => {
    try {
      await api.scripts.del(scriptId, runId)
      setRuns(prev => ({
        ...prev,
        [scriptId]: (prev[scriptId] || []).filter((r: any) => r.id !== runId)
      }))
      setRunsTotal(prev => ({ ...prev, [scriptId]: (prev[scriptId] || 1) - 1 }))
      setSelectedRun(null)
    } catch { showToast(t('common.saveFailed')) }
  }

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="page-title">{t('scripts.title')}</div>
            <div className="page-subtitle">{t('scripts.subtitle', { n: scripts.length })}</div>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditScript(null); setShowForm(true) }}><Plus size={14} /> {t('scripts.new')}</button>
        </div>
      </div>
      <div className="page-body">
        {scripts.length === 0 && <div className="empty-state"><div className="empty-state-icon">⚡</div><div>{t('scripts.empty')}</div></div>}
        {scripts.map(s => (
          <div key={s.id} className="card mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code size={16} className="text-[var(--text3)]" />
                <span className="font-medium">{s.name}</span>
                {s.enabled ? <span className="badge badge-active">{t('scripts.active')}</span> : <span className="badge badge-done">{t('scripts.disabled')}</span>}
                {s.cron_expr && <span className="text-xs text-[var(--text3)]"><Clock size={12} className="inline mr-1" />{s.cron_expr}</span>}
              </div>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm" onClick={() => testRun(s.id)}><Play size={14} /> {t('common.test')}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleEnabled(s)}>{s.enabled ? <Square size={14} /> : <Play size={14} />} {s.enabled ? t('common.disable') : t('common.enable')}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditScript(s); setShowForm(true) }}>{t('common.edit')}</button>
              </div>
            </div>
            {s.requirement && <div className="text-xs text-[var(--text2)] mt-2">{s.requirement}</div>}
            <button className="text-xs text-[var(--accent)] mt-2" onClick={() => { setActiveScript(activeScript === s.id ? null : s.id); loadRuns(s.id) }}>
              {activeScript === s.id ? t('scripts.hideRuns') : t('scripts.showRuns')}
            </button>
            {activeScript === s.id && runs[s.id] && (
              <div className="mt-3">
                {runs[s.id].length === 0 && <div className="text-xs text-[var(--text3)]">{t('scripts.noRuns')}</div>}
                {runs[s.id].map((r: any) => (
                  <div key={r.id}
                    className="border-t border-[var(--border)] pt-2 mt-2 text-xs cursor-pointer hover:bg-[var(--bg3)] rounded px-1"
                    onClick={() => setSelectedRun(r)}
                  >
                    <div className="flex justify-between items-center">
                      <span className={r.status === 'success' ? 'text-emerald-600' : r.status === 'failed' ? 'text-red-600' : 'text-[var(--text2)]'}>
                        {r.status} · {r.trigger}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--text3)]">{new Date(r.started_at).toLocaleString()}</span>
                        <ChevronRight size={12} className="text-[var(--text3)]" />
                      </div>
                    </div>
                    {(r.stdout || r.stderr) && (
                      <pre className="bg-[var(--bg3)] rounded p-2 mt-1 text-xs overflow-x-auto max-h-16 overflow-hidden">{r.stdout}{r.stderr}</pre>
                    )}
                  </div>
                ))}
                {(runsTotal[s.id] || 0) > 10 && (
                  <div className="flex justify-center gap-2 mt-3 pt-2 border-t border-[var(--border)]">
                    <button className="btn btn-sm btn-ghost" disabled={(runsPage[s.id] || 1) <= 1}
                      onClick={() => loadRuns(s.id, Math.max(1, (runsPage[s.id] || 1) - 1))}>← Prev</button>
                    <span className="text-xs text-[var(--text3)] self-center">
                      Page {runsPage[s.id] || 1} / {Math.ceil((runsTotal[s.id] || 0) / 10)}
                    </span>
                    <button className="btn btn-sm btn-ghost" disabled={(runsPage[s.id] || 1) * 10 >= (runsTotal[s.id] || 0)}
                      onClick={() => loadRuns(s.id, (runsPage[s.id] || 1) + 1)}>Next →</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {selectedRun && (
        <div className="modal-overlay" onClick={() => setSelectedRun(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '90vh' }}>
            <div className="modal-header">
              <div>
                <span className="font-semibold text-sm">Run #{selectedRun.id}</span>
                <span className={`ml-2 badge text-xs ${selectedRun.status === 'success' ? 'badge-active' : selectedRun.status === 'failed' ? 'badge-overdue' : ''}`}>
                  {selectedRun.status}
                </span>
                <span className="text-xs text-[var(--text3)] ml-2">{selectedRun.trigger}</span>
              </div>
              <button onClick={() => setSelectedRun(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="text-xs text-[var(--text3)] mb-3">
                Started: {new Date(selectedRun.started_at).toLocaleString()}
                {selectedRun.finished_at && <> · Finished: {new Date(selectedRun.finished_at).toLocaleString()}</>}
              </div>
              {selectedRun.stdout && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">stdout</div>
                  <pre className="bg-[var(--bg3)] rounded p-3 text-xs overflow-auto max-h-60 whitespace-pre-wrap">{selectedRun.stdout}</pre>
                </div>
              )}
              {selectedRun.stderr && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">stderr</div>
                  <pre className="bg-[var(--bg3)] rounded p-3 text-xs overflow-auto max-h-60 whitespace-pre-wrap text-red-600 dark:text-red-400">{selectedRun.stderr}</pre>
                </div>
              )}
              {!selectedRun.stdout && !selectedRun.stderr && (
                <div className="text-sm text-[var(--text3)] italic text-center py-8">No output captured</div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => { deleteRun(scripts.find((s: any) => runs[s.id]?.some((r: any) => r.id === selectedRun.id))?.id || 0, selectedRun.id) }}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedRun(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {showForm && <ScriptForm script={editScript} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} showToast={showToast} />}
    </>
  )
}

function ScriptForm({ script, onClose, onSaved, showToast }: any) {
  const { t } = useLocale()
  const [name, setName] = useState(script?.name || '')
  const [requirement, setReq] = useState(script?.requirement || '')
  const [code, setCode] = useState(script?.code || '# Python script\nimport requests\n\ndef main():\n    print("Hello from script")\n\nif __name__ == "__main__":\n    main()\n')
  const [cronExpr, setCron] = useState(script?.cron_expr || '')
  const [generating, setGenerating] = useState(false)

  const generateAI = async () => {
    if (!requirement.trim()) return showToast(t('scripts.fillRequirement'))
    setGenerating(true)
    try {
      const r = await api.scripts.generate({ requirement })
      setCode(r.code)
      showToast(t('scripts.generated'))
    } catch { showToast(t('scripts.genFailed')) }
    setGenerating(false)
  }

  const save = async () => {
    if (!name.trim()) return showToast(t('scripts.nameRequired'))
    try {
      const data = { name, requirement, code, cron_expr: cronExpr || null }
      if (script) await api.scripts.update(script.id, data)
      else await api.scripts.create(data)
      onSaved()
    } catch { showToast(t('common.saveFailed')) }
  }

  const CRON_PRESETS = [
    { labelKey: 'scripts.cronEveryHour', expr: '0 * * * *' },
    { labelKey: 'scripts.cronDaily8', expr: '0 8 * * *' },
    { labelKey: 'scripts.cronDaily20', expr: '0 20 * * *' },
    { labelKey: 'scripts.cronWeekdays', expr: '0 9 * * 1-5' },
    { labelKey: 'scripts.cronMonday', expr: '0 8 * * 1' },
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <div className="modal-header"><span className="font-semibold">{script ? t('scripts.edit') : t('scripts.newScript')}</span><button onClick={onClose}><X size={16} /></button></div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group"><label className="form-label">{t('common.name')} *</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder={t('scripts.namePlaceholder')} /></div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('scripts.requirement')}</label>
            <div className="flex gap-2">
              <textarea className="form-textarea flex-1" value={requirement} onChange={e => setReq(e.target.value)} placeholder={t('scripts.requirementPlaceholder')} rows={2} />
              <button className="btn btn-sm" onClick={generateAI} disabled={generating}>{generating ? t('scripts.generating') : t('scripts.aiGenerate')}</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('scripts.code')}</label>
            <textarea className="form-textarea" style={{ fontFamily: 'monospace', fontSize: '0.8rem', minHeight: 200 }} value={code} onChange={e => setCode(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{t('scripts.cron')}</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {CRON_PRESETS.map(p => (
                <button key={p.expr} className={`btn btn-sm ${cronExpr === p.expr ? 'btn-primary' : ''}`} onClick={() => setCron(p.expr)}>{t(p.labelKey)}</button>
              ))}
            </div>
            <input className="form-input" value={cronExpr} onChange={e => setCron(e.target.value)} placeholder={t('scripts.cronPlaceholder')} />
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button><button className="btn btn-primary" onClick={save}>{script ? t('common.update') : t('common.create')}</button></div>
      </div>
    </div>
  )
}
