// Root layout with providers
import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Next.js Logging Demo',
  description: 'Comprehensive logging example with @zaob/glean-logger',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
