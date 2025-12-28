
'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface DateFilterContextType {
  globalDate: Date | null;
  setGlobalDate: (date: Date) => void;
  clearGlobalDate: () => void;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

export const DateFilterProvider = ({ children }: { children: ReactNode }) => {
  const [globalDate, setGlobalDateState] = useState<Date | null>(null);

  useEffect(() => {
    const storedDate = localStorage.getItem('global-date');
    if (storedDate) {
      const date = new Date(storedDate);
      if (!isNaN(date.getTime())) {
        setGlobalDateState(date);
      }
    }
  }, []);

  const setGlobalDate = (date: Date) => {
    setGlobalDateState(date);
    localStorage.setItem('global-date', date.toISOString());
  };

  const clearGlobalDate = () => {
    setGlobalDateState(null);
    localStorage.removeItem('global-date');
  };

  return (
    <DateFilterContext.Provider value={{ globalDate, setGlobalDate, clearGlobalDate }}>
      {children}
    </DateFilterContext.Provider>
  );
};

export const useDateFilter = () => {
  const context = useContext(DateFilterContext);
  if (context === undefined) {
    throw new Error('useDateFilter must be used within a DateFilterProvider');
  }
  return context;
};
