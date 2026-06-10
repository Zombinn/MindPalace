import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'
import { Home, Calendar, BookOpen, Settings, Plus, Edit3, Check, Circle, AlertTriangle, X, Sun, Moon, Menu, ChevronRight } from 'lucide-react'
import { api } from '../api'

type ViewProps = { showToast: (msg: string) => void }

function formatDate(s: string) { if (!s) return ''; return new Date(s).toISOString().slice(0, 10) }
function today() { return new Date().toISOString().slice(0, 10) }


export default function SettingsView({ showToast }: ViewProps) {
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
