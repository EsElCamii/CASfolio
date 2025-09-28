import '../public/style.css';

import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'CASfolio | IB CAS Portfolio & Activity Tracker',
  description:
    'Build your IB CAS portfolio, document reflections, and track Creativity, Activity & Service hours.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
