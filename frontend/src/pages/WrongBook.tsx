import { useState, useEffect } from 'react'
import { Check, X, Filter } from 'lucide-react'
import { api } from '../api'

type ViewProps = { showToast: (msg: string) => void }

export default function WrongBook({ showToast }: ViewProps) {
  const [items, setItems] = useState<any[]>([])
  const [tags, setTags] = useState<[string, number][]>([])
  const [stats, setStats] = useState<any>(null)
  const [tagFilter, setTagFilter] = useState('')
  const [showReviewed, setShowReviewed] = useState<boolean | undefined>(false)

  const load = async () => {
    try {
      const [d, t, s] = await Promise.all([
        api.wrongbook.list(tagFilter || undefined, showReviewed),
        api.wrongbook.tags(),
        api.wrongbook.stats()
      ])
      setItems(d); setTags(t); setStats(s)
    } catch { showToast('Failed to load wrong-book') }
  }

  useEffect(() => { load() }, [tagFilter, showReviewed])

  const markReviewed = async (id: number) => {
    try { await api.wrongbook.review(id); load(); showToast('Marked reviewed') }
    catch { showToast('Failed') }
  }

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="page-title">Wrong-Question Book</div>
            <div className="page-subtitle">
              {stats ? `${stats.total} total · ${stats.unreviewed} unreviewed · ${stats.reviewed} reviewed` : 'Loading...'}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-4 flex-wrap">
          <select className="form-input" style={{ width: 180 }} value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
            <option value="">All tags</option>
            {tags.map(([t, c]) => <option key={t} value={t}>{t} ({c})</option>)}
          </select>
          <select className="form-input" style={{ width: 160 }} value={String(showReviewed)} onChange={e => setShowReviewed(e.target.value === 'undefined' ? undefined : e.target.value === 'true')}>
            <option value="undefined">All status</option>
            <option value="false">Unreviewed</option>
            <option value="true">Reviewed</option>
          </select>
        </div>
      </div>
      <div className="page-body">
        {items.length === 0 && <div className="empty-state"><div className="empty-state-icon">📝</div><div>No wrong questions yet. Take an exam to start building your mistake collection.</div></div>}
        {items.map(w => (
          <div key={w.id} className={`card mb-3 ${w.reviewed ? 'opacity-60' : ''}`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="text-sm font-medium mb-1 whitespace-pre-wrap">{w.question}</div>
                <div className="bg-[var(--bg3)] rounded p-3 text-sm font-mono mt-2">
                  <div className="text-xs text-[var(--text3)] mb-1">Your answer:</div>
                  <div className="whitespace-pre-wrap text-xs">{w.user_answer || '(no answer)'}</div>
                </div>
                {w.correct_notes && (
                  <div className="bg-emerald-50 dark:bg-emerald-950 rounded p-3 text-sm mt-2">
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Correct notes:</div>
                    <div className="whitespace-pre-wrap text-xs">{w.correct_notes}</div>
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  {w.knowledge_tags?.map((t: string) => (
                    <span key={t} className="text-xs bg-[var(--bg3)] px-1.5 py-0.5 rounded cursor-pointer hover:bg-[var(--border)]" onClick={() => setTagFilter(t)}>{t}</span>
                  ))}
                  {w.reviewed && <span className="badge badge-done">Reviewed</span>}
                  {!w.reviewed && <span className="badge badge-warn">Pending</span>}
                </div>
              </div>
              {!w.reviewed && (
                <button className="btn btn-sm" onClick={() => markReviewed(w.id)}><Check size={14} /> Mark Reviewed</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
