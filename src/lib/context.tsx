import { useState, createContext, useContext } from 'react';
import type { Project, ProjectSettings, QuoteLineItem, Client, PricingData } from '@/lib/types';

export const DEFAULT_PRICING: PricingData = {
  installationSelling: {
    'Casement': 90, 'Casement Flag': 50, 'Box Sash': 150, 'Fix Sash': 125,
    'Spring Sash': 125, 'Door': 125, 'Door + Top Light': 175, 'French Door': 175, 'Patio Door': 175,
  },
  installationCost: {
    'Casement': 45, 'Casement Flag': 25, 'Box Sash': 75, 'Fix Sash': 62.5,
    'Spring Sash': 62.5, 'Door': 62.5, 'Door + Top Light': 87.5, 'French Door': 87.5, 'Patio Door': 87.5,
  },
  makingGoodSelling: { intMkgInternal: 65.00, extMkgInternal: 20.00, intMkgExternal: 65.00, extMkgExternal: 20.00 },
  makingGoodCost: { intMkgInternal: 35.00, extMkgInternal: 10.00, intMkgExternal: 35.00, extMkgExternal: 10.00 },
  architraveSelling: { single: 6.50, baySide: 6.50, bayCentral: 6.50 },
  architraveCost: { single: 4.50, baySide: 4.50, bayCentral: 4.50 },
  trimsSelling: { single: 4.00, baySide: 4.00, bayCentral: 4.00 },
  trimsCost: { single: 1.00, baySide: 1.00, bayCentral: 1.00 },
  mdfSelling: { narrow: 9.00, wide: 18.00 },
  mdfCost: { narrow: 5.00, wide: 10.00 },
  extras: { 'Recess of reveal': 75, 'Shutters': 100, 'Cut Out of work top': 125 },
  consumables: {
    'Carpet protection': 6.40, 'Correx': 5.25,
    'Dust sheets': 1.20, 'Masking tape': 0.725, 'Blue paper': 0.763, 'Rubbish bag': 0.431,
    'Screws (brackets)': 0.640, 'Screws (windows)': 0.302, 'Packers': 0.699, 'Plugs': 1.145,
    'Foam': 4.200, 'DPC': 0.120, 'Silicone': 0.448, 'Caulk': 1.167,
  },
  wasteDisposal: 35.00,
  deliveryStockSelling: 40.00,
  deliveryStockCost: 20.00,
  fensaSurveySelling: 15.00,
  fensaSurveyCost: 8.00,
  overheadPerDay: 1500.00,
};

interface AppContextType {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
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

export function getProjectPricing(project: Project): PricingData {
  if (project.pricing) return project.pricing;
  const saved = localStorage.getItem('quote-pricing');
  return saved ? { ...DEFAULT_PRICING, ...JSON.parse(saved) } : DEFAULT_PRICING;
}

export function generateQuoteRef(clientName: string, existingProjects: Project[]): string {
  const cleaned = clientName.replace(/[^a-zA-Z]/g, '');
  const prefix = (cleaned.length >= 3 ? cleaned.slice(0, 3) : cleaned.padEnd(3, 'X')).toUpperCase() || 'QTE';
  const existing = existingProjects.filter(p => p.projectRef.startsWith(prefix + '-'));
  const maxNum = existing.reduce((max, p) => {
    const num = parseInt(p.projectRef.split('-')[1], 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `${prefix}-${String(maxNum + 1).padStart(6, '0')}`;
}

export function createNewProject(): Project {
  const id = crypto.randomUUID();
  const saved = localStorage.getItem('quote-pricing');
  const pricing = saved ? { ...DEFAULT_PRICING, ...JSON.parse(saved) } : { ...DEFAULT_PRICING };
  return {
    id,
    date: new Date().toISOString().split('T')[0],
    client: '',
    clientId: undefined,
    projectRef: '',
    settings: { ...DEFAULT_SETTINGS },
    lineItems: [],
    pricing,
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
    installationOverride: undefined,
    architraveType: 'single',
    trimsType: 'single',
    mdfRevealType: 'none',
    extra1: 'none',
    extra2: 'none',
    customExtra: 0,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('quote-projects');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('quote-clients');
    return saved ? JSON.parse(saved) : [];
  });

  const saveProjects = (newProjects: Project[] | ((prev: Project[]) => Project[])) => {
    setProjects(prev => {
      const result = typeof newProjects === 'function' ? newProjects(prev) : newProjects;
      localStorage.setItem('quote-projects', JSON.stringify(result));
      return result;
    });
  };

  const saveClients = (newClients: Client[] | ((prev: Client[]) => Client[])) => {
    setClients(prev => {
      const result = typeof newClients === 'function' ? newClients(prev) : newClients;
      localStorage.setItem('quote-clients', JSON.stringify(result));
      return result;
    });
  };

  return (
    <AppContext.Provider value={{ projects, setProjects: saveProjects, currentProject, setCurrentProject, clients, setClients: saveClients }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
