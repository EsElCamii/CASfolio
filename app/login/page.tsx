import AuthForm from '../components/AuthForm';

export default function LoginPage() {
  return (
    <section className="section" aria-labelledby="login-title">
      <div className="container" style={{ maxWidth: '520px' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 id="login-title" className="section-title">
            Sign in to CASfolio
          </h1>
          <p className="section-subtitle">
            Welcome back. Enter your CASfolio credentials or switch to the create account tab to get started.
          </p>
        </div>
        <AuthForm initialMode="login" />
      </div>
    </section>
  );
}
