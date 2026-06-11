import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Locale = 'en' | 'zh'

const LOCALE_KEY = 'mindpalace-locale'

type TranslationMap = Record<string, Record<Locale, string>>

export const translations: TranslationMap = {
  // ── Shell / Nav ──
  'nav.dashboard': { en: 'Dashboard', zh: '仪表盘' },
  'nav.goals': { en: 'Goals', zh: '目标' },
  'nav.notes': { en: 'Notes', zh: '笔记' },
  'nav.settings': { en: 'Settings', zh: '设置' },
  'nav.career': { en: 'Career', zh: '求职' },
  'nav.wrongbook': { en: 'Wrong Book', zh: '错题本' },
  'nav.scripts': { en: 'Scripts', zh: '脚本' },

  // ── Common ──
  'common.loading': { en: 'Loading...', zh: '加载中...' },
  'common.save': { en: 'Save', zh: '保存' },
  'common.cancel': { en: 'Cancel', zh: '取消' },
  'common.create': { en: 'Create', zh: '创建' },
  'common.update': { en: 'Update', zh: '更新' },
  'common.edit': { en: 'Edit', zh: '编辑' },
  'common.delete': { en: 'Delete', zh: '删除' },
  'common.archive': { en: 'Archive', zh: '归档' },
  'common.add': { en: 'Add', zh: '添加' },
  'common.close': { en: 'Close', zh: '关闭' },
  'common.configure': { en: 'Configure', zh: '配置' },
  'common.saveFailed': { en: 'Save failed', zh: '保存失败' },
  'common.loadFailed': { en: 'Failed to load', zh: '加载失败' },
  'common.confirm': { en: 'Confirm', zh: '确认' },
  'common.discard': { en: 'Discard', zh: '丢弃' },
  'common.ping': { en: 'Ping', zh: '测试' },
  'common.test': { en: 'Test', zh: '测试' },
  'common.enable': { en: 'Enable', zh: '启用' },
  'common.disable': { en: 'Disable', zh: '禁用' },
  'common.name': { en: 'Name', zh: '名称' },
  'common.description': { en: 'Description', zh: '描述' },
  'common.start': { en: 'Start', zh: '开始' },
  'common.end': { en: 'End', zh: '结束' },
  'common.priority': { en: 'Priority', zh: '优先级' },
  'common.status': { en: 'Status', zh: '状态' },
  'common.title': { en: 'Title', zh: '标题' },
  'common.tags': { en: 'Tags', zh: '标签' },

  // ── GoalList ──
  'goals.title': { en: 'Goals', zh: '目标' },
  'goals.count': { en: '{n} goals', zh: '{n} 个目标' },
  'goals.new': { en: 'New Goal', zh: '新建目标' },
  'goals.empty': { en: 'No goals yet.', zh: '暂无目标' },
  'goals.edit': { en: 'Edit Goal', zh: '编辑目标' },
  'goals.newGoal': { en: 'New Goal', zh: '新建目标' },
  'goals.nameRequired': { en: 'Name required', zh: '请填写名称' },
  'goals.namePlaceholder': { en: 'e.g., Get ML/Algorithm Offer', zh: '例如：拿到机器学习/算法岗' },
  'goals.loadFailed': { en: 'Failed to load goals', zh: '加载目标失败' },
  'goals.p0': { en: 'P0 — Critical', zh: 'P0 — 关键' },
  'goals.p1': { en: 'P1 — High', zh: 'P1 — 高' },
  'goals.p2': { en: 'P2 — Medium', zh: 'P2 — 中' },

  // ── Status badges ──
  'status.active': { en: 'Active', zh: '进行中' },
  'status.done': { en: 'Done', zh: '已完成' },
  'status.archived': { en: 'Archived', zh: '已归档' },
  'status.inProgress': { en: 'In Progress', zh: '进行中' },
  'status.passed': { en: 'Passed', zh: '已通过' },
  'status.delayed': { en: 'Delayed', zh: '已延期' },
  'status.overdue': { en: 'Overdue', zh: '已逾期' },
  'status.mastered': { en: 'Mastered', zh: '已掌握' },
  'status.weak': { en: 'Weak', zh: '薄弱' },
  'status.pending': { en: 'Pending', zh: '待处理' },
  'status.reviewed': { en: 'Reviewed', zh: '已复习' },
  'status.builtin': { en: 'Built-in', zh: '内置' },
  'status.custom': { en: 'Custom', zh: '自定义' },
  'status.default': { en: 'Default', zh: '默认' },
  'status.notConfigured': { en: 'Not configured', zh: '未配置' },
  'status.disabled': { en: 'Disabled', zh: '已禁用' },

  // ── GoalDetail ──
  'goalDetail.tasks': { en: 'Stage Tasks ({n})', zh: '阶段任务 ({n})' },
  'goalDetail.newTask': { en: 'New Task', zh: '新建任务' },
  'goalDetail.emptyTasks': { en: 'No tasks yet', zh: '暂无任务' },
  'goalDetail.archiveConfirm': { en: 'Archive this goal?', zh: '确认归档此目标？' },
  'goalDetail.newStageTask': { en: 'New Stage Task', zh: '新建阶段任务' },
  'goalDetail.titleRequired': { en: 'Title required', zh: '请填写标题' },
  'goalDetail.titlePlaceholder': { en: 'e.g., Master DETR architecture', zh: '例如：掌握 DETR 架构' },
  'goalDetail.objective': { en: 'Learning Objective', zh: '学习目标' },
  'goalDetail.objectivePlaceholder': { en: 'What exactly to learn and to what level?', zh: '具体学什么、到什么程度？' },

  // ── TaskDetail ──
  'taskDetail.subtasks': { en: 'Sub-tasks ({n})', zh: '子任务 ({n})' },
  'taskDetail.redecompose': { en: 'Re-decompose', zh: '重新分解' },
  'taskDetail.aiDecompose': { en: 'AI Decompose', zh: 'AI 分解' },
  'taskDetail.decomposing': { en: 'Decomposing...', zh: 'AI 分解中...' },
  'taskDetail.aiDraft': { en: 'AI Draft – Review before confirming', zh: 'AI 草稿 — 请确认后保存' },
  'taskDetail.confirmSave': { en: 'Confirm & Save', zh: '确认并保存' },
  'taskDetail.takeExam': { en: 'Take Exam', zh: '参加考试' },
  'taskDetail.examConfig': { en: 'Exam: {n} questions · pass {p}% · max {d} delays', zh: '考试：{n} 题 · 通过线 {p}% · 最多 {d} 次延期' },
  'taskDetail.questions': { en: 'Questions', zh: '题数' },
  'taskDetail.passPercent': { en: 'Pass %', zh: '通过%' },
  'taskDetail.maxDelays': { en: 'Max delays', zh: '最大延期' },
  'taskDetail.examConfigSaved': { en: 'Exam config saved', zh: '考试配置已保存' },
  'taskDetail.decomposeFailed': { en: 'Decomposition failed. Check AI config.', zh: 'AI 分解失败，请检查 AI 配置' },
  'taskDetail.subsConfirmed': { en: 'Sub-tasks confirmed!', zh: '子任务已确认！' },
  'taskDetail.examGenFailed': { en: 'Exam generation failed. Check AI config.', zh: '考试生成失败，请检查 AI 配置' },

  // ── Dashboard ──
  'dashboard.title': { en: 'Dashboard', zh: '仪表盘' },
  'dashboard.activeGoals': { en: 'Active Goals', zh: '活跃目标' },
  'dashboard.inProgress': { en: 'In Progress', zh: '进行中' },
  'dashboard.dueToday': { en: 'Due Today', zh: '今日到期' },
  'dashboard.delays': { en: 'Delays', zh: '延期' },
  'dashboard.dueTodayTitle': { en: 'Due Today', zh: '今日到期' },
  'dashboard.weakPoints': { en: 'Weak Points', zh: '薄弱知识点' },
  'dashboard.heatmap': { en: 'Activity Heatmap (35 days)', zh: '活动热力图（35天）' },

  // ── Notes ──
  'notes.title': { en: 'Notes', zh: '笔记' },
  'notes.count': { en: '{n} notes', zh: '{n} 条笔记' },
  'notes.new': { en: 'New Note', zh: '新建笔记' },
  'notes.search': { en: 'Search notes...', zh: '搜索笔记...' },
  'notes.empty': { en: 'No notes yet', zh: '暂无笔记' },
  'notes.untitled': { en: 'Untitled', zh: '无标题' },
  'notes.preview': { en: 'Preview appears here...', zh: '预览将显示在这里...' },
  'notes.titlePlaceholder': { en: 'Note title...', zh: '笔记标题...' },
  'notes.editorPlaceholder': { en: 'Write your note in Markdown...', zh: '用 Markdown 书写笔记...' },
  'notes.saved': { en: 'Saved!', zh: '已保存！' },

  // ── Exam ──
  'exam.title': { en: 'Exam', zh: '考试' },
  'exam.loading': { en: 'Loading exam...', zh: '加载考试中...' },
  'exam.status': { en: 'Status', zh: '状态' },
  'exam.passed': { en: 'Exam Passed!', zh: '考试通过！' },
  'exam.notPassed': { en: 'Exam Not Passed', zh: '考试未通过' },
  'exam.score': { en: 'Score', zh: '得分' },
  'exam.passScore': { en: 'Pass', zh: '及格线' },
  'exam.backToTask': { en: 'Back to Task', zh: '返回任务' },
  'exam.answerPlaceholder': { en: 'Type your answer...', zh: '输入你的答案...' },
  'exam.evaluating': { en: 'Evaluating...', zh: '评估中...' },
  'exam.submit': { en: 'Submit & Evaluate', zh: '提交并评估' },
  'exam.evalFailed': { en: 'Evaluation failed', zh: '评估失败' },

  // ── Settings ──
  'settings.title': { en: 'Settings', zh: '设置' },
  'settings.providers': { en: 'AI Providers', zh: 'AI 供应商' },
  'settings.routes': { en: 'Scene Routes', zh: '场景路由' },
  'settings.templates': { en: 'Prompt Templates', zh: 'Prompt 模板' },
  'settings.addProvider': { en: 'Add Provider', zh: '添加供应商' },
  'settings.editProvider': { en: 'Edit Provider', zh: '编辑供应商' },
  'settings.addProviderTitle': { en: 'Add Provider', zh: '添加供应商' },
  'settings.baseUrl': { en: 'Base URL', zh: '基础 URL' },
  'settings.apiKey': { en: 'API Key', zh: 'API Key' },
  'settings.apiKeyHint': { en: '(empty to keep)', zh: '（留空保持不变）' },
  'settings.defaultModel': { en: 'Default Model', zh: '默认模型' },
  'settings.setDefault': { en: 'Set as default', zh: '设为默认' },
  'settings.fillAll': { en: 'Fill all fields', zh: '请填写所有字段' },
  'settings.pingOk': { en: 'OK! {n} models', zh: '连接成功！{n} 个模型可用' },
  'settings.pingFail': { en: 'Failed: ', zh: '连接失败：' },
  'settings.routeTitle': { en: 'Route: {s}', zh: '路由：{s}' },
  'settings.provider': { en: 'Provider', zh: '供应商' },
  'settings.model': { en: 'Model', zh: '模型' },
  'settings.temperature': { en: 'Temperature ({t})', zh: '温度 ({t})' },
  'settings.templateTitle': { en: 'Template: {s}', zh: '模板：{s}' },

  // ── WrongBook ──
  'wrongbook.title': { en: 'Wrong-Question Book', zh: '错题本' },
  'wrongbook.stats': { en: '{t} total · {u} unreviewed · {r} reviewed', zh: '共 {t} 题 · {u} 未复习 · {r} 已复习' },
  'wrongbook.allTags': { en: 'All tags', zh: '所有标签' },
  'wrongbook.allStatus': { en: 'All status', zh: '所有状态' },
  'wrongbook.unreviewed': { en: 'Unreviewed', zh: '未复习' },
  'wrongbook.reviewed': { en: 'Reviewed', zh: '已复习' },
  'wrongbook.empty': { en: 'No wrong questions yet. Take an exam to start building your mistake collection.', zh: '暂无错题。参加考试后会自动收录错题。' },
  'wrongbook.yourAnswer': { en: 'Your answer:', zh: '你的答案：' },
  'wrongbook.noAnswer': { en: '(no answer)', zh: '（未作答）' },
  'wrongbook.correctNotes': { en: 'Correct notes:', zh: '正确注释：' },
  'wrongbook.markReviewed': { en: 'Mark Reviewed', zh: '标记已复习' },
  'wrongbook.markedReviewed': { en: 'Marked reviewed', zh: '已标记为复习' },
  'wrongbook.loadFailed': { en: 'Failed to load wrong-book', zh: '加载错题本失败' },

  // ── Career ──
  'career.title': { en: 'Career Pipeline', zh: '求职管道' },
  'career.stats': { en: '{n} applications · {p} inbox', zh: '{n} 个申请 · 收件箱 {p}' },
  'career.addJob': { en: 'Add Job', zh: '添加申请' },
  'career.board': { en: 'Board', zh: '看板' },
  'career.inbox': { en: 'Inbox ({n})', zh: '收件箱 ({n})' },
  'career.avgScore': { en: 'Avg score: {n}/5', zh: '平均分：{n}/5' },
  'career.noScores': { en: 'No scores yet', zh: '暂无评分' },
  'career.inboxTitle': { en: 'Pipeline Inbox — Pending URLs', zh: '待处理 URL 收件箱' },
  'career.addUrl': { en: 'Add URL', zh: '添加链接' },
  'career.emptyInbox': { en: 'No URLs in pipeline. Paste job posting links to process them.', zh: '暂无待处理链接。粘贴招聘链接来处理。' },
  'career.editJob': { en: 'Edit Job', zh: '编辑申请' },
  'career.addJobTitle': { en: 'Add Job', zh: '添加申请' },
  'career.company': { en: 'Company', zh: '公司' },
  'career.role': { en: 'Role', zh: '职位' },
  'career.url': { en: 'URL', zh: '链接' },
  'career.score': { en: 'Score (0-5)', zh: '评分 (0-5)' },
  'career.location': { en: 'Location', zh: '地点' },
  'career.appliedDate': { en: 'Applied Date', zh: '投递日期' },
  'career.tagsHint': { en: 'Tags (comma-separated)', zh: '标签（逗号分隔）' },
  'career.notes': { en: 'Notes', zh: '备注' },
  'career.companyRequired': { en: 'Company name required', zh: '请填写公司名称' },
  'career.loadFailed': { en: 'Failed to load career data', zh: '加载求职数据失败' },
  'career.updateFailed': { en: 'Failed to update status', zh: '更新状态失败' },
  'career.deleteConfirm': { en: 'Delete this application?', zh: '确认删除此申请？' },
  'career.deleteFailed': { en: 'Delete failed', zh: '删除失败' },
  'career.jobUrlPrompt': { en: 'Job posting URL:', zh: '招聘链接：' },
  'career.addedToInbox': { en: 'Added to pipeline inbox', zh: '已添加到收件箱' },
  'career.addFailed': { en: 'Failed to add', zh: '添加失败' },
  'career.careerStates': {
    en: JSON.stringify([
      { id: 'evaluated', label: 'Evaluated' },
      { id: 'applied', label: 'Applied' },
      { id: 'responded', label: 'Responded' },
      { id: 'interview', label: 'Interview' },
      { id: 'offer', label: 'Offer' },
      { id: 'rejected', label: 'Rejected' },
      { id: 'discarded', label: 'Discarded' },
      { id: 'skip', label: 'SKIP' },
    ]),
    zh: JSON.stringify([
      { id: 'evaluated', label: '待评估' },
      { id: 'applied', label: '已投递' },
      { id: 'responded', label: '有回复' },
      { id: 'interview', label: '面试中' },
      { id: 'offer', label: '收到 Offer' },
      { id: 'rejected', label: '已拒绝' },
      { id: 'discarded', label: '已放弃' },
      { id: 'skip', label: '跳过' },
    ]),
  },

  // ── Scripts ──
  'scripts.title': { en: 'Scripts', zh: '脚本' },
  'scripts.subtitle': { en: '{n} scripts · AI-generated automation', zh: '{n} 个脚本 · AI 生成的自动化' },
  'scripts.new': { en: 'New Script', zh: '新建脚本' },
  'scripts.empty': { en: 'No scripts yet. Create an AI-generated automation script with a cron schedule.', zh: '暂无脚本。创建一个带 cron 计划的 AI 自动化脚本。' },
  'scripts.active': { en: 'Active', zh: '运行中' },
  'scripts.disabled': { en: 'Disabled', zh: '已禁用' },
  'scripts.showRuns': { en: 'Show runs', zh: '显示执行记录' },
  'scripts.hideRuns': { en: 'Hide runs', zh: '隐藏执行记录' },
  'scripts.noRuns': { en: 'No runs yet', zh: '暂无执行记录' },
  'scripts.loadFailed': { en: 'Failed to load scripts', zh: '加载脚本失败' },
  'scripts.testQueued': { en: 'Test run queued — check runner logs', zh: '测试已排队 — 请查看 runner 日志' },
  'scripts.testFailed': { en: 'Failed to queue test run', zh: '排队测试失败' },
  'scripts.edit': { en: 'Edit Script', zh: '编辑脚本' },
  'scripts.newScript': { en: 'New Script', zh: '新建脚本' },
  'scripts.nameRequired': { en: 'Name required', zh: '请填写名称' },
  'scripts.namePlaceholder': { en: 'Daily job scraper', zh: '每日职位抓取' },
  'scripts.requirement': { en: 'Requirement (describe what the script should do)', zh: '需求描述（描述脚本要做什么）' },
  'scripts.requirementPlaceholder': { en: 'e.g., Fetch latest AI/ML jobs from example.com and save to JSON', zh: '例如：从 example.com 抓取最新 AI/ML 岗位并保存为 JSON' },
  'scripts.aiGenerate': { en: 'AI Generate', zh: 'AI 生成' },
  'scripts.generating': { en: 'Generating...', zh: '生成中...' },
  'scripts.fillRequirement': { en: 'Fill in the requirement first', zh: '请先填写需求描述' },
  'scripts.generated': { en: 'AI code generated!', zh: 'AI 代码已生成！' },
  'scripts.genFailed': { en: 'Generation failed. Check AI config.', zh: '生成失败，请检查 AI 配置' },
  'scripts.code': { en: 'Code', zh: '代码' },
  'scripts.cron': { en: 'Cron Expression', zh: 'Cron 表达式' },
  'scripts.cronPlaceholder': { en: '0 8 * * * (leave empty for manual only)', zh: '0 8 * * *（留空表示手动触发）' },
  'scripts.cronEveryHour': { en: 'Every hour', zh: '每小时' },
  'scripts.cronDaily8': { en: 'Daily 08:00', zh: '每天 08:00' },
  'scripts.cronDaily20': { en: 'Daily 20:00', zh: '每天 20:00' },
  'scripts.cronWeekdays': { en: 'Weekdays 09:00', zh: '工作日 09:00' },
  'scripts.cronMonday': { en: 'Monday 08:00', zh: '周一 08:00' },
}

const LocaleContext = createContext<{
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}>({
  locale: 'en',
  setLocale: () => {},
  t: (k) => k,
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = localStorage.getItem(LOCALE_KEY)
    return stored === 'en' ? 'en' : 'zh'
  })

  useEffect(() => {
    localStorage.setItem(LOCALE_KEY, locale)
    document.documentElement.lang = locale
  }, [locale])

  const t = (key: string, vars?: Record<string, string | number>): string => {
    const entry = translations[key]
    let text: string
    if (!entry) {
      text = key
    } else {
      text = entry[locale] ?? entry.en
    }
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(`{${k}}`, String(v))
      }
    }
    return text
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
