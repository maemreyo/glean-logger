// Root layout with providers
import type { Metadata } from 'next';
import { Providers } from './providers';
import { Logger } from '@zaob/glean-logger/react';

export const metadata: Metadata = {
  title: 'Next.js Logging Demo',
  description: 'Comprehensive logging example with @zaob/glean-logger',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <Logger>
          <Providers>{children}</Providers>
        </Logger>
      </body>
    </html>
  );
}
