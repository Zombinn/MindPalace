import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'
import { Home, Calendar, BookOpen, Settings, Plus, Edit3, Check, Circle, AlertTriangle, X, Sun, Moon, Menu, ChevronRight } from 'lucide-react'
import { api } from '../api'
import { formatDate, today, type ViewProps } from '../utils'
import { useLocale } from '../i18n'


export default function Dashboard({ showToast }: ViewProps) {
  const { t } = useLocale()
  const [data, setData] = useState<any>(null)
  const [weak, setWeak] = useState<any[]>([])

  useEffect(() => {
    api.dashboard.summary().then(setData).catch(() => {})
    api.dashboard.weakPoints().then(setWeak).catch(() => {})
  }, [])

  if (!data) return <div className="page-body"><div className="empty-state">{t('common.loading')}</div></div>

  return (
    <>
      <div className="page-header">
        <div className="page-title">{t('dashboard.title')}</div>
        <div className="page-subtitle">{today()}</div>
      </div>
      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-value">{data.goals_active}</div><div className="stat-label">{t('dashboard.activeGoals')}</div><div className="stat-sub">{data.goals_done}/{data.goals_total} done</div></div>
          <div className="stat-card"><div className="stat-value">{data.tasks_in_progress}</div><div className="stat-label">{t('dashboard.inProgress')}</div><div className="stat-sub">{data.tasks_passed}/{data.tasks_total} passed</div></div>
          <div className="stat-card"><div className="stat-value">{data.subs_done}</div><div className="stat-label">Sub-tasks</div><div className="stat-sub">{data.subs_todo} remaining of {data.subs_total}</div></div>
          <div className="stat-card"><div className="stat-value">{data.tasks_due_today}</div><div className="stat-label">{t('dashboard.dueToday')}</div><div className="stat-sub">{data.delay_count} delays</div></div>
        </div>
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-value">{data.scripts_active}</div><div className="stat-label">Active Scripts</div><div className="stat-sub">of {data.scripts_total} total</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: 'var(--accent)' }}>{data.runs_success}</div><div className="stat-label">Script Runs OK</div><div className="stat-sub">{data.runs_total} total · {data.runs_failed} failed</div></div>
          <div className="stat-card"><div className="stat-value">{data.tasks_exam_pending}</div><div className="stat-label">Exam Pending</div></div>
          <div className="stat-card"><div className="stat-value">{data.weak_points?.length || 0}</div><div className="stat-label">Weak Areas</div></div>
        </div>

        {data.due_tasks?.length > 0 && (
          <div className="card mb-4">
            <h3 className="font-semibold mb-3">{t('dashboard.dueTodayTitle')}</h3>
            {data.due_tasks.map((task: any) => (
              <div key={task.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <Link to={`/tasks/${task.id}`} className="text-sm hover:text-[var(--accent)]">{task.title}</Link>
                {task.is_overdue && <span className="badge badge-overdue">{t('status.overdue')}</span>}
              </div>
            ))}
          </div>
        )}

        {weak.length > 0 && (
          <div className="card">
            <h3 className="font-semibold mb-3">{t('dashboard.weakPoints')}</h3>
            <div className="flex flex-wrap gap-2">
              {weak.slice(0, 10).map(w => (
                <span key={w.tag} className="text-xs bg-[var(--bg3)] px-2 py-1 rounded">{w.tag} ({w.count})</span>
              ))}
            </div>
          </div>
        )}

        <Heatmap />
      </div>
    </>
  )
}

function Heatmap() {
  const { t } = useLocale()
  const [data, setData] = useState<any[]>([])
  useEffect(() => {
    api.dashboard.heatmap(35).then(setData).catch(() => {})
  }, [])

  if (!data.length) return null

  const getColor = (count: number) => {
    if (count === 0) return 'bg-[var(--bg3)]'
    if (count <= 2) return 'bg-emerald-200 dark:bg-emerald-900'
    if (count <= 5) return 'bg-emerald-400 dark:bg-emerald-700'
    return 'bg-emerald-600 dark:bg-emerald-500'
  }

  return (
    <div className="card">
      <h3 className="font-semibold mb-3">{t('dashboard.heatmap')}</h3>
      <div className="flex flex-wrap gap-1">
        {data.map(d => (
          <div key={d.date} className={`w-3 h-3 rounded-sm ${getColor(d.count)}`}
            title={`${d.date}: ${d.count} activities${d.is_today ? ' (today)' : ''}`}
          />
        ))}
      </div>
    </div>
  )
}
