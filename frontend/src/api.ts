const BASE = '/api'

async function request<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(BASE + url, { headers: { 'Content-Type': 'application/json' }, ...opts })
  if (!r.ok) { const e = await r.text(); throw new Error(e || r.statusText) }
  return r.json()
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
    decompose: (id: number) => request<any>(`/tasks/${id}/decompose`, { method: 'POST' }),
    confirmSubs: (taskId: number, data: any) => request<any>(`/tasks/${taskId}/subtasks:confirm`, { method: 'POST', body: JSON.stringify(data) }),
  },
  subtasks: {
    update: (id: number, data: any) => request<any>(`/subtasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  exams: {
    generate: (taskId: number) => request<any>(`/tasks/${taskId}/exam`, { method: 'POST' }),
    saveAnswers: (examId: number, data: any) => request<any>(`/exams/${examId}/answers`, { method: 'PUT', body: JSON.stringify(data) }),
    evaluate: (examId: number) => request<any>(`/exams/${examId}/evaluate`, { method: 'POST' }),
    override: (qId: number, data: any) => request<any>(`/questions/${qId}/override`, { method: 'POST', body: JSON.stringify(data) }),
    redecompose: (examId: number) => request<any>(`/exams/${examId}/redecompose`, { method: 'POST' }),
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
  },
  settings: {
    providers: () => request<any[]>('/settings/providers'),
    createProvider: (data: any) => request<any>('/settings/providers', { method: 'POST', body: JSON.stringify(data) }),
    updateProvider: (id: number, data: any) => request<any>(`/settings/providers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    pingProvider: (id: number) => request<any>(`/settings/providers/${id}/ping`, { method: 'POST' }),
    routes: () => request<any[]>('/settings/routes'),
    setRoute: (scene: string, data: any) => request<any>(`/settings/routes/${scene}`, { method: 'PUT', body: JSON.stringify(data) }),
    templates: () => request<any[]>('/settings/templates'),
    updateTemplate: (id: number, data: any) => request<any>(`/settings/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
}
