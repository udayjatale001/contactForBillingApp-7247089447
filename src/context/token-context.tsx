
'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';
import type { Token } from '@/lib/types';

interface TokenContextType {
  tokenData: Token | null;
  setTokenData: (token: Token | null) => void;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export const TokenProvider = ({ children }: { children: ReactNode }) => {
  const [tokenData, setTokenData] = useState<Token | null>(null);

  return (
    <TokenContext.Provider value={{ tokenData, setTokenData }}>
      {children}
    </TokenContext.Provider>
  );
};

export const useToken = () => {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error('useToken must be used within a TokenProvider');
  }
  return context;
};
