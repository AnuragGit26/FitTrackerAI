import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { analytics } from '@/utils/analytics';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to console in development
        if (import.meta.env.DEV) {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }

        // Call optional error handler
        this.props.onError?.(error, errorInfo);

        // Store error info for display
        this.setState({
            error,
            errorInfo,
        });

        // Track error with analytics
        analytics.trackError(error, {
            componentStack: errorInfo.componentStack,
            context: 'error_boundary',
        });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const isDevelopment = import.meta.env.DEV;

            return (
                <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-md w-full bg-white dark:bg-surface-dark rounded-2xl shadow-lg border border-gray-200 dark:border-border-dark p-6"
                    >
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
                                <AlertTriangle className="w-8 h-8 text-error" />
                            </div>

                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    Something went wrong
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400">
                                    We&apos;re sorry, but something unexpected happened. Please try refreshing the page or return to the home page.
                                </p>
                            </div>

                            {isDevelopment && this.state.error && (
                                <div className="w-full mt-4 p-4 bg-gray-100 dark:bg-surface-dark-light rounded-lg text-left">
                                    <p className="text-sm font-mono text-error mb-2">
                                        {this.state.error.toString()}
                                    </p>
                                    {this.state.errorInfo && (
                                        <details className="text-xs text-gray-600 dark:text-gray-400">
                                            <summary className="cursor-pointer mb-2">Stack Trace</summary>
                                            <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 w-full mt-6">
                                <button
                                    onClick={this.handleGoHome}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    <Home className="w-4 h-4" />
                                    Go Home
                                </button>
                                <button
                                    onClick={this.handleReset}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-background-dark rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            );
        }

        return this.props.children;
    }
}

