import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'
import { Home, Calendar, BookOpen, Settings, Plus, Edit3, Check, Circle, AlertTriangle, X, Sun, Moon, Menu, ChevronRight } from 'lucide-react'
import { api } from '../api'
import { formatDate, today, type ViewProps } from '../utils'
import { useLocale } from '../i18n'


export default function ExamView({ showToast }: ViewProps) {
  const { t } = useLocale()
  const { id } = useParams()
  const navigate = useNavigate()
  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [evaluating, setEvaluating] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    api.tasks.get(Number(id)).then((t: any) => {
      if (t.exams?.length) {
        const e = t.exams[0]
        setExam(e)
        api.exams.generate(Number(id)).then((r: any) => setQuestions(r.questions || []))
      }
    }).catch(() => showToast(t('common.loadFailed')))
  }, [id])

  const submit = async () => {
    setEvaluating(true)
    try {
      await api.exams.saveAnswers(Number(id), { answers })
      const r = await api.exams.evaluate(Number(id))
      setResult(r)
    } catch { showToast(t('exam.evalFailed')) }
    setEvaluating(false)
  }

  if (!exam) return <div className="page-body"><div className="empty-state">{t('exam.loading')}</div></div>

  return (
    <>
      <div className="page-header">
        <div className="page-title">{t('exam.title')}</div>
        <div className="page-subtitle">{t('exam.status')}: {exam.status} {exam.total_score != null ? `· ${t('exam.score')}: ${exam.total_score}` : ''} {exam.passed ? `· ${t('exam.passed')}` : exam.passed === false ? `· ${t('exam.notPassed')}` : ''}</div>
      </div>
      <div className="page-body">
        {result ? (
          <div>
            <div className={`card mb-4 ${result.passed ? 'border-[var(--accent)]' : 'border-[var(--danger)]'}`}>
              <h3 className="font-semibold">{result.passed ? t('exam.passed') : t('exam.notPassed')}</h3>
              <p className="text-sm mt-1">{t('exam.score')}: {result.total_score} / {t('exam.passScore')}: {result.pass_score}</p>
              {result.ai_summary && <p className="text-sm text-[var(--text2)] mt-2">{result.ai_summary}</p>}
            </div>
            <div className="flex gap-2">
              <button className="btn" onClick={() => navigate(`/tasks/${exam.stage_task_id}`)}>{t('exam.backToTask')}</button>
            </div>
          </div>
        ) : (
          <div>
            {questions.map((q: any) => (
              <div key={q.id} className="exam-question">
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-sm">{q.question}</span>
                  <span className="text-xs text-[var(--text3)]">{q.qtype} · {q.max_score}pts</span>
                </div>
                {q.options?.length > 0 && (
                  <div className="flex flex-col gap-1 mb-2">
                    {q.options.map((o: any, i: number) => (
                      <label key={i} className="flex items-center gap-2 text-sm">
                        <input type={q.qtype === 'multi' ? 'checkbox' : 'radio'} name={`q-${q.id}`}
                          checked={answers[q.id] === o.key}
                          onChange={() => setAnswers({ ...answers, [q.id]: o.key })} />
                        {o.key}: {o.text}
                      </label>
                    ))}
                  </div>
                )}
                {(q.qtype === 'short_answer' || q.qtype === 'code') && (
                  <textarea className="exam-answer" value={answers[q.id] || ''}
                    onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder={t('exam.answerPlaceholder')} />
                )}
              </div>
            ))}
            <button className="btn btn-primary w-full mt-4" onClick={submit} disabled={evaluating}>
              {evaluating ? t('exam.evaluating') : t('exam.submit')}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
