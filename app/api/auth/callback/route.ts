import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { serverEnv } from '../../../../lib/env/server';

export async function POST(request: Request) {
  const { event, session } = await request.json();

  const cookieStore = cookies();
  const response = NextResponse.json({ received: true });

  const supabase = createServerClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        response.cookies.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });

  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (session) {
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    }
  }

  if (event === 'SIGNED_OUT') {
    await supabase.auth.signOut();
  }

  return response;
}
