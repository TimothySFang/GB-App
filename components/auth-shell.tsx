'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';

type AuthShellProps =
  | { mode: 'sign_in' }
  | { mode: 'access_denied'; email: string };

export function AuthShell(props: AuthShellProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const signIn = async () => {
    setPending(true);
    setError('');

    const supabase = createBrowserSupabaseClient();
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || window.location.origin;
    const redirectTo = `${origin}/auth/callback?next=/`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });

    if (authError) {
      setError(authError.message);
      setPending(false);
    }
  };

  const signOut = async () => {
    setPending(true);
    setError('');

    const supabase = createBrowserSupabaseClient();
    const { error: authError } = await supabase.auth.signOut();

    if (authError) {
      setError(authError.message);
      setPending(false);
      return;
    }

    router.refresh();
    setPending(false);
  };

  const title = props.mode === 'sign_in' ? 'Sign in to GB App' : 'Access denied';
  const subtitle =
    props.mode === 'sign_in'
      ? 'Use Google to open the climbing dashboard.'
      : `${props.email} is authenticated, but it is not on the approved access list for this app.`;

  return (
    <div className="auth-page">
      <div className="card auth-card col">
        <div className="col">
          <span className="badge auth-badge">Google OAuth</span>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        {error ? <div className="card auth-error">{error}</div> : null}
        <div className="col">
          {props.mode === 'sign_in' ? (
            <button className="button" type="button" disabled={pending} onClick={signIn}>
              {pending ? 'Redirecting…' : 'Continue with Google'}
            </button>
          ) : (
            <>
              <button className="button secondary" type="button" disabled={pending} onClick={signOut}>
                {pending ? 'Signing out…' : 'Sign out'}
              </button>
              <button className="button" type="button" disabled={pending} onClick={signIn}>
                {pending ? 'Redirecting…' : 'Try another Google account'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
