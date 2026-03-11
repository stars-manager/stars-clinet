import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from 'tdesign-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h2 style={{ margin: 0, color: '#333' }}>出错了</h2>
          <p style={{ margin: 0, color: '#666', maxWidth: '400px' }}>
            {this.state.error?.message || '页面遇到了一些问题，请刷新页面重试'}
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button onClick={this.handleReset}>重试</Button>
            <Button
              theme="primary"
              onClick={() => window.location.reload()}
            >
              刷新页面
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 高阶组件包装器
export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `WithErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithErrorBoundaryComponent;
};
