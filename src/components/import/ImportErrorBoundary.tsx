import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { logger } from '@/utils/logger';
import { Modal } from '@/components/common/Modal';

interface Props {
  children: ReactNode;
  onError?: (error: Error) => void;
  onReset?: () => void;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ImportErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('[ImportErrorBoundary] Caught error in import flow:', error, {
      componentStack: errorInfo.componentStack,
    });

    this.props.onError?.(error);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Modal
          isOpen={true}
          onClose={this.handleReset}
          title={this.props.fallbackTitle || 'Import Error'}
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Something went wrong during import
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  The import process encountered an unexpected error. Your data has been preserved
                  and you can try again.
                </p>
                {import.meta.env.DEV && this.state.error && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-xs font-mono text-red-800 dark:text-red-400">
                      {this.state.error.message}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 dark:bg-surface-dark-light text-gray-900 dark:text-gray-100 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-surface-dark transition-colors"
              >
                <X className="w-4 h-4" />
                Close
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-[#E67E22] text-black rounded-xl font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>
            </div>
          </div>
        </Modal>
      );
    }

    return this.props.children;
  }
}
