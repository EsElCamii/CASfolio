'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '../../lib/supabaseBrowser';

interface AuthFormProps {
  initialMode?: 'login' | 'signup';
}

type MessageState = { kind: 'error' | 'success'; text: string } | null;

export default function AuthForm({ initialMode = 'login' }: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const heading = useMemo(
    () => (mode === 'login' ? 'Sign in to CASfolio' : 'Create your CASfolio account'),
    [mode]
  );

  const description = useMemo(
    () =>
      mode === 'login'
        ? 'Use your CASfolio credentials to access the portfolio dashboard.'
        : 'Sign up with your school email. You may need to confirm your inbox before logging in.',
    [mode]
  );

  const resetMessage = () => setMessage(null);

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

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const hint = error.message.toLowerCase().includes('invalid')
        ? 'Incorrect email or password. Please try again.'
        : error.message;
      setMessage({ kind: 'error', text: hint });
      return;
    }
    router.push('/index.html');
    router.refresh();
  };

  const handleSignup = async () => {
    if (password.length < 6) {
      setMessage({ kind: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ kind: 'error', text: 'Passwords do not match.' });
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage({ kind: 'error', text: error.message });
      return;
    }

    if (data.user) {
      const upsertResult = await supabase
        .from('users')
        .upsert({ id: data.user.id, email: data.user.email, display_name: displayName || null });
      if (upsertResult.error) {
        setMessage({ kind: 'error', text: upsertResult.error.message });
        return;
      }
    }

    if (data.session) {
      router.push('/index.html');
      router.refresh();
      return;
    }

    setMessage({
      kind: 'success',
      text: 'Account created. Please check your email to confirm your address before signing in.',
    });
    setMode('login');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessage();

    if (!email || !password) {
      setMessage({ kind: 'error', text: 'Email and password are required.' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await handleLogin();
      } else {
        await handleSignup();
      }
    } catch (error) {
      console.error(error);
      setMessage({ kind: 'error', text: 'Unexpected error. Please try again later.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabButtonBase = {
    flex: 1,
    padding: '0.65rem 1rem',
    borderRadius: '999px',
    border: '1px solid rgba(59,130,246,0.25)',
    fontWeight: 600,
    background: 'transparent',
    cursor: 'pointer' as const,
    transition: 'all 0.2s ease',
  };

  const activeTabStyle = {
    background: 'rgba(59,130,246,0.12)',
    color: 'var(--primary)',
    boxShadow: '0 0 0 4px rgba(59,130,246,0.08)',
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          margin: '0 auto 1.75rem',
          maxWidth: '320px',
        }}
        role="tablist"
        aria-label="Authentication mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          style={{ ...tabButtonBase, ...(mode === 'login' ? activeTabStyle : {}) }}
          onClick={() => {
            resetMessage();
            setMode('login');
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          style={{ ...tabButtonBase, ...(mode === 'signup' ? activeTabStyle : {}) }}
          onClick={() => {
            resetMessage();
            setMode('signup');
          }}
        >
          Create Account
        </button>
      </div>

      <h2 className="section-title" style={{ marginBottom: '0.75rem', textAlign: 'center' }}>
        {heading}
      </h2>
      <p className="section-subtitle" style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
        {description}
      </p>

      <form className="modal-form" onSubmit={handleSubmit} noValidate>
        {mode === 'signup' && (
          <div className="form-group">
            <label htmlFor="displayName">Display name (optional)</label>
            <input
              id="displayName"
              type="text"
              name="displayName"
              placeholder="Alex Johnson"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
              style={{ paddingRight: '2.75rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: '0.75rem',
                background: 'none',
                border: 'none',
                color: 'var(--muted-foreground)',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} aria-hidden="true" />
            </button>
          </div>
        </div>

        {mode === 'signup' && (
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm password</label>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                required
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted-foreground)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <i className={showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {message && (
          <div
            role="alert"
            style={{
              marginBottom: '1.5rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius)',
              background:
                message.kind === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.12)',
              color: message.kind === 'error' ? '#b91c1c' : '#166534',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
            }}
          >
            <i
              className={
                message.kind === 'error'
                  ? 'fas fa-exclamation-circle'
                  : 'fas fa-check-circle'
              }
              aria-hidden="true"
            />
            <span>{message.text}</span>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
          <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
            {isSubmitting ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
