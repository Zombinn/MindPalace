import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'
import { Home, Calendar, BookOpen, Settings, Plus, Edit3, Check, Circle, AlertTriangle, X, Sun, Moon, Menu, ChevronRight } from 'lucide-react'
import { api } from '../api'

type ViewProps = { showToast: (msg: string) => void }

function formatDate(s: string) { if (!s) return ''; return new Date(s).toISOString().slice(0, 10) }
function today() { return new Date().toISOString().slice(0, 10) }


export function NoteList({ showToast }: ViewProps) {
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

export function NoteEditor({ showToast }: ViewProps) {
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
