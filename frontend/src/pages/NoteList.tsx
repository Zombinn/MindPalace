import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'
import { Home, Calendar, BookOpen, Settings, Plus, Edit3, Check, Circle, AlertTriangle, X, Sun, Moon, Menu, ChevronRight } from 'lucide-react'
import { api } from '../api'
import { formatDate, today, type ViewProps } from '../utils'
import { useLocale } from '../i18n'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

function MarkdownPreview({ content, t }: { content: string; t: (k: string) => string }) {
  if (!content) return <div className="text-[var(--text3)] text-sm italic">{t('notes.preview')}</div>
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ node, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '')
          if (match) {
            return (
              <pre className="bg-[var(--bg3)] rounded p-3 overflow-x-auto text-xs"><code className={className}>{children}</code></pre>
            )
          }
          return <code className="bg-[var(--bg3)] px-1 rounded text-xs" {...props}>{children}</code>
        }
      }}
    >
      {content}
    </ReactMarkdown>
  )
}


export function NoteList({ showToast }: ViewProps) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [notes, setNotes] = useState<any[]>([])
  const [search, setSearch] = useState('')

  const load = () => api.notes.list(search ? `?q=${encodeURIComponent(search)}` : '').then(setNotes).catch(() => {})
  useEffect(() => { load() }, [search])

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div><div className="page-title">{t('notes.title')}</div><div className="page-subtitle">{t('notes.count', { n: notes.length })}</div></div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/notes/new')}><Plus size={14} /> {t('notes.new')}</button>
        </div>
      </div>
      <div className="page-body">
        <input className="form-input mb-4" placeholder={t('notes.search')} value={search} onChange={e => setSearch(e.target.value)} />
        {notes.length === 0 && <div className="empty-state"><div>{t('notes.empty')}</div></div>}
        {notes.map(n => (
          <div key={n.id} className="goal-card cursor-pointer" onClick={() => navigate(`/notes/${n.id}`)}>
            <div className="font-medium text-sm">{n.title || t('notes.untitled')}</div>
            <div className="text-xs text-[var(--text3)] mt-1">{n.content?.slice(0, 120)}</div>
            {n.tags?.length > 0 && <div className="flex gap-1 mt-2">{n.tags.map((tg: string) => <span key={tg} className="text-xs bg-[var(--bg3)] px-1 rounded">{tg}</span>)}</div>}
          </div>
        ))}
      </div>
    </>
  )
}

export function NoteEditor({ showToast }: ViewProps) {
  const { t } = useLocale()
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
      showToast(t('notes.saved'))
      navigate('/notes')
    } catch { showToast(t('common.saveFailed')) }
  }

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <input className="form-input text-xl font-semibold border-0 bg-transparent outline-none flex-1" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('notes.titlePlaceholder')} />
          <button className="btn btn-primary btn-sm" onClick={save}>{t('common.save')}</button>
        </div>
      </div>
      <div className="page-body">
        <div className="flex gap-4" style={{ minHeight: '450px' }}>
          <textarea className="form-textarea flex-1" style={{ fontFamily: 'monospace', fontSize: '0.85rem', resize: 'none' }}
            value={content} onChange={e => setContent(e.target.value)}
            placeholder={t('notes.editorPlaceholder')} />
          <div className="flex-1 prose prose-sm dark:prose-invert max-w-none overflow-y-auto p-4 border border-[var(--border)] rounded-lg bg-[var(--bg)]">
            <MarkdownPreview content={content} t={t} />
          </div>
        </div>
      </div>
    </>
  )
}
