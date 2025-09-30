'use client';
import { MiniKitProvider } from '@coinbase/onchainkit/minikit';
import { base } from 'wagmi/chains';
import type { ReactNode, JSX } from 'react';

export function Providers({ children }: { children: ReactNode }): JSX.Element {
  return (
    <MiniKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
      config={{
        appearance: {
          mode: 'auto',
          theme: 'default',
          name: 'OSINT Mini',
          logo: '/favicon.ico',
        },
      }}
    >
      {children}
    </MiniKitProvider>
  );
}