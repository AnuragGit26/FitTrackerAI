import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { BottomNavigation } from './BottomNavigation';

interface LayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
}

export function Layout({ children, showBottomNav = true }: LayoutProps) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  if (location.pathname === '/onboarding') {
    return <>{children}</>;
  }

  return (
    <div className={`min-h-screen ${isHomePage ? 'bg-background-light dark:bg-background-dark' : 'bg-background-light dark:bg-background-dark'} pb-safe`}>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-background-dark focus:rounded-lg focus:font-bold focus:shadow-lg"
      >
        Skip to main content
      </a>
      <main id="main-content" className={isHomePage ? '' : 'pb-20'} tabIndex={-1}>
        {children}
      </main>
      {showBottomNav && <BottomNavigation />}
    </div>
  );
}

