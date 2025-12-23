'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AppLayout } from './app-layout';
import type { Bill } from '@/lib/types';

// These paths do not have the main app layout (e.g., sidebar)
const noLayoutPaths = ['/login'];

interface AppContextType {
  bills: Bill[];
  addBill: (bill: Bill) => void;
}

// Create a context to hold the application's state
const AppContext = React.createContext<AppContextType | undefined>(undefined);

// Custom hook to use the AppContext
export function useAppContext() {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

// Main provider component
export function RootStateProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasLayout = !noLayoutPaths.includes(pathname);
  const [bills, setBills] = React.useState<Bill[]>([]);

  const addBill = (newBill: Bill) => {
    setBills((prevBills) => [newBill, ...prevBills]);
  };

  const contextValue = {
    bills,
    addBill,
  };

  const content = hasLayout ? <AppLayout>{children}</AppLayout> : <>{children}</>;

  return (
    <AppContext.Provider value={contextValue}>
      {content}
    </AppContext.Provider>
  );
}
