'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '../../lib/supabaseBrowser';

interface NavbarClientProps {
  isAuthenticated: boolean;
}

export default function NavbarClient({ isAuthenticated }: NavbarClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      await fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, session }),
      });
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out', error.message);
        return;
      }
      router.push('/');
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <nav className="nav" aria-label="Primary navigation">
      <div className="container nav-container">
        <Link className="nav-brand" href="/">
          <span aria-label="CASfolio home">CASfolio</span>
        </Link>
        <div className="nav-actions">
          <Link className="btn btn-ghost" href="/">
            Home
          </Link>
          {isAuthenticated ? (
            <>
              <Link className="btn btn-ghost" href="/dashboard">
                Dashboard
              </Link>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleLogout}
                disabled={isLoading}
              >
                {isLoading ? 'Logging out…' : 'Logout'}
              </button>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost" href="/login">
                Login
              </Link>
              <Link className="btn btn-primary" href="/?signup=1">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
