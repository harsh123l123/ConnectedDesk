import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--background, #0f172a)',
          color: 'white',
          textAlign: 'center',
          padding: '2rem',
          gap: '1.5rem'
        }}>
          <div style={{ fontSize: '4rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>Something went wrong</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '400px', margin: 0 }}>
            An unexpected error occurred. Please refresh the page to continue.
          </p>
          <pre style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.75rem',
            color: '#fca5a5',
            maxWidth: '500px',
            overflow: 'auto',
            textAlign: 'left'
          }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.8rem 2rem',
              background: 'linear-gradient(135deg, #6366f1, #ec4899)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
