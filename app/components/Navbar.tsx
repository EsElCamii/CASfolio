import NavbarClient from './NavbarClient';
import { createSupabaseServerClient } from '../../lib/supabaseServer';

export default async function Navbar() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return <NavbarClient isAuthenticated={Boolean(session)} />;
}
