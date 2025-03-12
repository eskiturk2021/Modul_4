// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can also log the error to an error reporting service
    console.error('ErrorBoundary caught an error', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // Here you could send the error to your error tracking service
    // e.g., Sentry, LogRocket, etc.
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-12">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mx-auto">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900">Something went wrong</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  An error has occurred in the application. Please try again or contact support if the issue persists.
                </p>
              </div>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mt-4 bg-gray-50 p-4 rounded overflow-x-auto text-left">
                  <p className="text-sm font-medium text-gray-800">Error:</p>
                  <pre className="mt-1 text-xs text-gray-600">{this.state.error.toString()}</pre>

                  {this.state.errorInfo && (
                    <>
                      <p className="mt-3 text-sm font-medium text-gray-800">Component Stack:</p>
                      <pre className="mt-1 text-xs text-gray-600">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              )}
              <div className="mt-5 flex justify-center">
                <Button
                  onClick={this.handleRetry}
                  className="inline-flex items-center"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;