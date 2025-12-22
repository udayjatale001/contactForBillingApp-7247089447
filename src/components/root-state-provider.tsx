// src/components/root-state-provider.tsx
'use client';

import { usePathname } from 'next/navigation';
import { AppLayout } from './app-layout';

// These paths do not have the main app layout (e.g., sidebar)
const noLayoutPaths = ['/login'];

export function RootStateProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasLayout = !noLayoutPaths.includes(pathname);

  if (hasLayout) {
    return <AppLayout>{children}</AppLayout>;
  }

  return <>{children}</>;
}
