import { Component, ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error } }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('ErrorBoundary:', error, info) }
  render() {
    if (this.state.hasError) return this.props.fallback ?? (
      <div className="empty-state">
        <div className="empty-state-icon">⚠</div>
        <div>Something went wrong</div>
        <button className="btn btn-sm mt-3" onClick={() => this.setState({ hasError: false })}>Try again</button>
      </div>
    )
    return this.props.children
  }
}
