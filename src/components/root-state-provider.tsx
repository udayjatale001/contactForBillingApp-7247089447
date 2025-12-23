'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AppLayout } from './app-layout';

// These paths do not have the main app layout (e.g., sidebar)
const noLayoutPaths = ['/login'];

// Main provider component
export function RootStateProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasLayout = !noLayoutPaths.includes(pathname);

  const content = hasLayout ? <AppLayout>{children}</AppLayout> : <>{children}</>;

  return <>{content}</>;
}
