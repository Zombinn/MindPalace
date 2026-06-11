import React from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Home, Calendar, BookOpen, Settings, Sun, Moon, Menu, Briefcase, AlertCircle, Code, Languages } from 'lucide-react'
import { ToastProvider, useToast } from './components/Toast'
import { ThemeProvider, useTheme } from './components/Theme'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LocaleProvider, useLocale } from './i18n'

import Dashboard from './pages/Dashboard'
import GoalList from './pages/GoalList'
import GoalDetail from './pages/GoalDetail'
import TaskDetail from './pages/TaskDetail'
import ExamView from './pages/ExamView'
import { NoteList, NoteEditor } from './pages/NoteList'
import SettingsView from './pages/SettingsView'
import Career from './pages/Career'
import WrongBook from './pages/WrongBook'
import Scripts from './pages/Scripts'

const NAV = [
  { path: '/', labelKey: 'nav.dashboard', icon: Home },
  { path: '/goals', labelKey: 'nav.goals', icon: Calendar },
  { path: '/notes', labelKey: 'nav.notes', icon: BookOpen },
  { path: '/settings', labelKey: 'nav.settings', icon: Settings },
  { path: '/career', labelKey: 'nav.career', icon: Briefcase },
  { path: '/wrongbook', labelKey: 'nav.wrongbook', icon: AlertCircle },
  { path: '/scripts', labelKey: 'nav.scripts', icon: Code },
]

function AppShell() {
  const { dark, toggle } = useTheme()
  const { t, locale, setLocale } = useLocale()
  const { showToast } = useToast()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  return (
    <div className="flex min-h-screen">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo"><span>MP</span>MindPalace</div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(n => (
            <Link key={n.path} to={n.path}
              className={`nav-item${location.pathname === n.path ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}>
              <n.icon size={18} />{t(n.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button
            onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
            className="btn btn-ghost btn-sm"
            title={locale === 'en' ? '切换到中文' : 'Switch to English'}
          >
            <Languages size={16} />
            <span className="text-xs ml-1">{locale === 'en' ? '中文' : 'EN'}</span>
          </button>
          <button onClick={toggle} className="btn btn-ghost btn-sm">
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <span>v1.0</span>
        </div>
      </aside>
      <main className="main-content">
        <button className="btn btn-ghost btn-sm fixed top-3 left-3 z-50 lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu size={20} />
        </button>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Dashboard showToast={showToast} />} />
            <Route path="/goals" element={<GoalList showToast={showToast} />} />
            <Route path="/goals/:id" element={<GoalDetail showToast={showToast} />} />
            <Route path="/tasks/:id" element={<TaskDetail showToast={showToast} />} />
            <Route path="/exams/:id" element={<ExamView showToast={showToast} />} />
            <Route path="/notes" element={<NoteList showToast={showToast} />} />
            <Route path="/notes/:id" element={<NoteEditor showToast={showToast} />} />
            <Route path="/settings" element={<SettingsView showToast={showToast} />} />
            <Route path="/career" element={<Career showToast={showToast} />} />
            <Route path="/wrongbook" element={<WrongBook showToast={showToast} />} />
            <Route path="/scripts" element={<Scripts showToast={showToast} />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <LocaleProvider>
      <ThemeProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </ThemeProvider>
    </LocaleProvider>
  )
}
