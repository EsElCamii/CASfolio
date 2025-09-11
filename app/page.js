import { redirect } from 'next/navigation';

export default function Page() {
  // Redirect root to the static HTML now served from /public
  redirect('/index.html');
}

