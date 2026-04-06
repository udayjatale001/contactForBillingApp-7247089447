'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Defines the structure of an undoable action.
 */
interface UndoAction {
  label: string;
  undo: () => Promise<void>;
}

interface UndoContextType {
  lastAction: UndoAction | null;
  registerUndo: (label: string, undoFn: () => Promise<void>) => void;
  undo: () => Promise<void>;
  isUndoing: boolean;
}

const UndoContext = createContext<UndoContextType | undefined>(undefined);

/**
 * Provides a global state for the last undoable operation.
 */
export const UndoProvider = ({ children }: { children: ReactNode }) => {
  const [lastAction, setLastAction] = useState<UndoAction | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const { toast } = useToast();

  const registerUndo = (label: string, undoFn: () => Promise<void>) => {
    setLastAction({ label, undo: undoFn });
    
    // Auto-clear the undo option after 15 seconds to prevent stale undos
    setTimeout(() => {
      setLastAction(current => (current?.label === label ? null : current));
    }, 15000);
  };

  const undo = async () => {
    if (!lastAction || isUndoing) return;
    setIsUndoing(true);
    try {
      await lastAction.undo();
      toast({ 
        title: 'Action Reverted', 
        description: `Successfully undone: ${lastAction.label}` 
      });
      setLastAction(null);
    } catch (error) {
      console.error('Undo operation failed:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Undo Failed', 
        description: 'Could not revert the last action. The data might have changed.' 
      });
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <UndoContext.Provider value={{ lastAction, registerUndo, undo, isUndoing }}>
      {children}
    </UndoContext.Provider>
  );
};

export const useUndo = () => {
  const context = useContext(UndoContext);
  if (context === undefined) {
    throw new Error('useUndo must be used within an UndoProvider');
  }
  return context;
};
