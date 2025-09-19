import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata = {
  title: 'IB CAS Portfolio',
  description:
    'IB CAS portfolio documenting creativity, activity, and service projects.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
