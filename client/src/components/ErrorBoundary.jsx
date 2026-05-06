import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected application error' };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#07080e', color: '#f5f7ff', padding: 24 }}>
          <div style={{ maxWidth: 640, textAlign: 'center' }}>
            <h2 style={{ marginBottom: 12 }}>Something went wrong</h2>
            <p style={{ color: '#a8b0cc', marginBottom: 16 }}>
              The UI encountered an unexpected error and could not continue rendering safely.
            </p>
            <p style={{ color: '#ff809f', marginBottom: 24 }}>{this.state.message}</p>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #0066ff, #8f00ff)',
                color: '#fff',
                fontWeight: 600,
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
