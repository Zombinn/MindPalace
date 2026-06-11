/** Shared utilities — keep page code DRY (clean-code: no duplication). */

export function formatDate(s: string | null | undefined): string {
  if (!s) return ''
  return new Date(s).toISOString().slice(0, 10)
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isOverdue(t: { end_date?: string; status?: string }): boolean {
  if (!t.end_date) return false
  if (t.status === 'passed' || t.status === 'force_closed') return false
  return new Date(t.end_date) < new Date()
}

export type ViewProps = { showToast: (msg: string) => void }
