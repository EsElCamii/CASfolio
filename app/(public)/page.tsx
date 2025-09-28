import AuthForm from '../components/AuthForm';
import { createSupabaseServerClient } from '../../lib/supabaseServer';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface LandingPageProps {
  searchParams?: { signup?: string };
}

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect('/index.html');
  }

  const rawSignup = searchParams?.signup;
  const wantsSignup =
    rawSignup !== undefined ? !['0', 'false', 'login'].includes(rawSignup.toLowerCase()) : false;
  const initialMode = wantsSignup ? 'signup' : 'login';

  return (
    <section
      className="section"
      aria-labelledby="auth-title"
      style={{
        minHeight: 'calc(100vh - 5rem)',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(37,99,235,0.04))',
      }}
    >
      <div className="container" style={{ maxWidth: '640px' }}>
        <div className="card" style={{ padding: '2.5rem', boxShadow: 'var(--shadow-lg)' }}>
          <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <h1 id="auth-title" className="section-title" style={{ marginBottom: '0.5rem' }}>
              CASfolio Secure Access
            </h1>
            <p className="section-subtitle">
              Sign in or create an account to start building your IB Creativity, Activity &amp; Service portfolio.
            </p>
          </header>
          <AuthForm initialMode={initialMode} />
        </div>
      </div>
    </section>
  );
}
