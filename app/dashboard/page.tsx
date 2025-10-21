import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabaseServer';
import DashboardClient from './components/DashboardClient';
import { ToastProvider } from './components/ToastProvider';

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login?redirect=/dashboard');
  }

  return (
    <ToastProvider>
      <DashboardClient studentId={session.user.id} />
    </ToastProvider>
  );
}
