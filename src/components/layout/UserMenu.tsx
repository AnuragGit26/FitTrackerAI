import { useState, useRef, useEffect } from 'react';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClerk, useUser } from '@clerk/clerk-react';
import { useUserStore } from '@/store/userStore';
import { userContextManager } from '@/services/userContextManager';
import { cn } from '@/utils/cn';

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const { profile } = useUserStore();
  
  // Prefer Clerk user data, fallback to store profile
  const userName = clerkUser?.firstName || clerkUser?.username || profile?.name || 'User';
  const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;
  
  // Determine which profile picture to use (prioritize Supabase profile picture)
  const profilePictureUrl = profile?.profilePicture || clerkUser?.imageUrl;
  
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7248/ingest/f44644c5-d500-4fbd-a834-863cb4856614',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserMenu.tsx:21',message:'UserMenu rendered',data:{hasProfile:!!profile,profilePicture:profile?.profilePicture,clerkImageUrl:clerkUser?.imageUrl,usingProfilePicture:!!profile?.profilePicture,profilePictureUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  }, [profile?.profilePicture, clerkUser?.imageUrl, profile, clerkUser]);
  // #endregion

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const menuItems = [
    {
      icon: User,
      label: 'Profile',
      onClick: () => {
        navigate('/profile');
        setIsOpen(false);
      },
    },
    {
      icon: LogOut,
      label: 'Sign Out',
      onClick: async () => {
        setIsOpen(false);
        try {
          // Clear user context before signing out
          userContextManager.clear();
          await signOut();
          navigate('/login');
        } catch (error) {
          console.error('Failed to sign out:', error);
        }
      },
      className: 'text-red-500 dark:text-red-400',
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        aria-label="User menu"
      >
        <div className="relative">
          <div
            className={cn(
              'bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 ring-2 ring-primary/20 flex items-center justify-center',
              !profilePictureUrl && 'bg-gradient-to-br from-primary/20 to-primary/40'
            )}
            style={
              profilePictureUrl
                ? { backgroundImage: `url("${profilePictureUrl}")` }
                : undefined
            }
          >
            {!profilePictureUrl && (
              <span className="text-primary font-bold text-lg">
                {userName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="absolute bottom-0 right-0 size-3 bg-primary rounded-full border-2 border-background-dark"></div>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-slate-500 dark:text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-surface-dark rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {userName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {userEmail || (profile?.experienceLevel
                ? `${profile.experienceLevel.charAt(0).toUpperCase() + profile.experienceLevel.slice(1)} Level`
                : 'User')}
            </p>
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
                  item.className
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

