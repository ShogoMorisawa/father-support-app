'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import Nav from './nav';

export default function RootLayout({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient());
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900">
        <QueryClientProvider client={qc}>
          <Nav />
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
