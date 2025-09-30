'use client';
import { ThirdwebProvider } from 'thirdweb/react';
import type { ReactNode, JSX } from 'react';

export function Providers({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ThirdwebProvider>
      {children}
    </ThirdwebProvider>
  );
}