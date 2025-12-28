import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, error: auth0Error } = useAuth0();

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7248/ingest/f44644c5-d500-4fbd-a834-863cb4856614',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.tsx:14',message:'ProtectedRoute auth check',data:{isLoading,isAuthenticated,hasError:!!auth0Error,errorMessage:auth0Error?.message,errorName:auth0Error?.name,errorString:auth0Error ? String(auth0Error) : null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  }, [isLoading, isAuthenticated, auth0Error]);
  // #endregion

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // #region agent log
    fetch('http://127.0.0.1:7248/ingest/f44644c5-d500-4fbd-a834-863cb4856614',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.tsx:26',message:'Redirecting to login - not authenticated',data:{hasError:!!auth0Error,errorMessage:auth0Error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

