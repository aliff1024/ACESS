// app/providers/AppContext.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type View = 'landing' | 'learner' | 'educator' | 'admin';

interface AppContextType {
  currentView: View;
  setCurrentView: (view: View) => void;
  isDemoModalOpen: boolean;
  setIsDemoModalOpen: (isOpen: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  return (
    <AppContext.Provider value={{
      currentView,
      setCurrentView,
      isDemoModalOpen,
      setIsDemoModalOpen,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}