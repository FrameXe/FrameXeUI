import { Component } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[UI ErrorBoundary Caught Error]:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 12,
          margin: 20,
          textAlign: 'center',
          gap: 12
        }}>
          <AlertTriangle size={36} style={{ color: '#ef4444' }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            Component Render Error
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 450, margin: 0 }}>
            {this.state.error?.message || 'An unexpected error occurred while rendering this page.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            style={{
              marginTop: 8,
              padding: '8px 16px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <RefreshCw size={14} /> Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
