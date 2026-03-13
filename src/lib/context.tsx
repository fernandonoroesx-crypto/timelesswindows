import { useState, createContext, useContext } from 'react';
import type { Project, ProjectSettings, QuoteLineItem } from '@/lib/types';

interface AppContextType {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_SETTINGS: ProjectSettings = {
  eurToGbpRate: 0.90,
  includeWasteDisposal: true,
  includeInternalMakingGood: true,
  includeExternalMakingGood: true,
  supplyOnly: false,
  overheadDays: 0,
};

export function createNewProject(): Project {
  const id = crypto.randomUUID();
  return {
    id,
    date: new Date().toISOString().split('T')[0],
    client: '',
    projectRef: '',
    settings: { ...DEFAULT_SETTINGS },
    lineItems: [],
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createNewLineItem(): QuoteLineItem {
  return {
    id: crypto.randomUUID(),
    itemRef: '',
    type: 'Casement',
    qty: 1,
    widthMm: 600,
    heightMm: 900,
    manufactureCurrency: 'GBP',
    supplier: '',
    manufacturePrice: 0,
    uplift: 0,
    installationType: 'Internal',
    includeArchitrave: true,
    includeTrims: true,
    includeMdfReveal: false,
    mdfRevealType: 'none',
    extras: [],
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('quote-projects');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  const saveProjects = (newProjects: Project[] | ((prev: Project[]) => Project[])) => {
    setProjects(prev => {
      const result = typeof newProjects === 'function' ? newProjects(prev) : newProjects;
      localStorage.setItem('quote-projects', JSON.stringify(result));
      return result;
    });
  };

  return (
    <AppContext.Provider value={{ projects, setProjects: saveProjects, currentProject, setCurrentProject }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
