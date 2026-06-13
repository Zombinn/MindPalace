const BASE = '/api'
const DEFAULT_TIMEOUT = 30000

async function request<T>(url: string, opts?: RequestInit & { timeout?: number }): Promise<T> {
  const controller = new AbortController()
  const timeout = opts?.timeout ?? DEFAULT_TIMEOUT
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const r = await fetch(BASE + url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...opts,
    })
    clearTimeout(timer)
    if (!r.ok) {
      const e = await r.text().catch(() => r.statusText)
      throw new Error(e || `HTTP ${r.status}`)
    }
    return r.json()
  } catch (err: any) {
    clearTimeout(timer)
    if (err.name === 'AbortError') throw new Error('Request timed out')
    throw err
  }
}

export const api = {
  goals: {
    list: () => request<any[]>('/goals'),
    get: (id: number) => request<any>(`/goals/${id}`),
    create: (data: any) => request<any>('/goals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    archive: (id: number) => request<any>(`/goals/${id}`, { method: 'DELETE' }),
  },
  tasks: {
    list: (goalId: number) => request<any[]>(`/goals/${goalId}/tasks`),
    get: (id: number) => request<any>(`/tasks/${id}`),
    create: (goalId: number, data: any) => request<any>(`/goals/${goalId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/tasks/${id}`, { method: 'DELETE' }),
    del: (id: number) => request<any>(`/tasks/${id}`, { method: 'DELETE' }),
    decompose: (id: number) => request<any>(`/tasks/${id}/decompose`, { method: 'POST', timeout: 120000 }),
    confirmSubs: (taskId: number, data: any) => request<any>(`/tasks/${taskId}/subtasks:confirm`, { method: 'POST', body: JSON.stringify(data) }),
  },
  subtasks: {
    update: (id: number, data: any) => request<any>(`/subtasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  exams: {
    generate: (taskId: number) => request<any>(`/tasks/${taskId}/exam`, { method: 'POST', timeout: 120000 }),
    saveAnswers: (examId: number, data: any) => request<any>(`/exams/${examId}/answers`, { method: 'PUT', body: JSON.stringify(data) }),
    evaluate: (examId: number) => request<any>(`/exams/${examId}/evaluate`, { method: 'POST', timeout: 120000 }),
    override: (qId: number, data: any) => request<any>(`/questions/${qId}/override`, { method: 'POST', body: JSON.stringify(data) }),
    redecompose: (examId: number) => request<any>(`/exams/${examId}/redecompose`, { method: 'POST', timeout: 120000 }),
    applyRedecompose: (examId: number, data: any) => request<any>(`/exams/${examId}/redecompose:apply`, { method: 'POST', body: JSON.stringify(data) }),
  },
  notes: {
    list: (params?: string) => request<any[]>(`/notes${params || ''}`),
    create: (data: any) => request<any>('/notes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    del: (id: number) => request<any>(`/notes/${id}`, { method: 'DELETE' }),
  },
  dashboard: {
    summary: () => request<any>('/dashboard/summary'),
    weakPoints: () => request<any[]>('/dashboard/weak-points'),
    heatmap: (days = 30) => request<any[]>(`/dashboard/heatmap?days=${days}`),
    weeklyReport: () => request<any>('/dashboard/weekly-report'),
  },
  settings: {
    providers: () => request<any[]>('/settings/providers'),
    createProvider: (data: any) => request<any>('/settings/providers', { method: 'POST', body: JSON.stringify(data) }),
    updateProvider: (id: number, data: any) => request<any>(`/settings/providers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    pingProvider: (id: number) => request<any>(`/settings/providers/${id}/ping`, { method: 'POST', timeout: 15000 }),
    routes: () => request<any[]>('/settings/routes'),
    setRoute: (scene: string, data: any) => request<any>(`/settings/routes/${scene}`, { method: 'PUT', body: JSON.stringify(data) }),
    templates: () => request<any[]>('/settings/templates'),
    updateTemplate: (id: number, data: any) => request<any>(`/settings/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  wrongbook: {
    list: (tag?: string, reviewed?: boolean) => {
      const params = new URLSearchParams()
      if (tag) params.set('tag', tag)
      if (reviewed !== undefined) params.set('reviewed', String(reviewed))
      const qs = params.toString()
      return request<any[]>(`/wrongbook${qs ? '?' + qs : ''}`)
    },
    review: (id: number) => request<any>(`/wrongbook/${id}`, { method: 'PATCH' }),
    tags: () => request<[string, number][]>('/wrongbook/tags'),
    stats: () => request<{ total: number; reviewed: number; unreviewed: number }>('/wrongbook/stats'),
  },
  career: {
    jobs: (status?: string) => request<any[]>(`/career/jobs${status ? '?status=' + status : ''}`),
    createJob: (data: any) => request<any>('/career/jobs', { method: 'POST', body: JSON.stringify(data) }),
    updateJob: (id: number, data: any) => request<any>('/career/jobs/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteJob: (id: number) => request<any>('/career/jobs/' + id, { method: 'DELETE' }),
    pipeline: (status?: string) => request<any[]>(`/career/pipeline${status ? '?status=' + status : ''}`),
    addPipelineItem: (data: any) => request<any>('/career/pipeline', { method: 'POST', body: JSON.stringify(data) }),
    deletePipelineItem: (id: number) => request<any>('/career/pipeline/' + id, { method: 'DELETE' }),
    config: (key: string) => request<any>('/career/config/' + key),
    setConfig: (key: string, data: any) => request<any>('/career/config/' + key, { method: 'PUT', body: JSON.stringify(data) }),
    stats: () => request<any>('/career/stats'),
    states: () => request<any[]>('/career/states'),
  },
  scripts: {
    list: () => request<any[]>('/scripts'),
    create: (data: any) => request<any>('/scripts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>('/scripts/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
    del: (id: number, runId?: number) => request<any>(runId ? `/scripts/${id}/runs/${runId}` : '/scripts/' + id, { method: 'DELETE' }),
    generate: (data: any) => request<any>('/scripts/generate', { method: 'POST', body: JSON.stringify(data), timeout: 120000 }),
    run: (id: number) => request<any>('/scripts/' + id + '/run', { method: 'POST' }),
    runs: (id: number) => request<any[]>('/scripts/' + id + '/runs'),
  },
}
