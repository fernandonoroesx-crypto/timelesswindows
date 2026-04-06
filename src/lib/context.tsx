import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import type { Project, ProjectSettings, QuoteLineItem, Client, PricingData, Supplier, ManagedProject } from '@/lib/types';
import { fetchClients, upsertClient, deleteClient as dbDeleteClient, fetchSuppliers, upsertSupplier, deleteSupplier as dbDeleteSupplier, fetchProjects, upsertProject, deleteProject as dbDeleteProject, fetchGlobalPricing, saveGlobalPricing, fetchManagedProjects, upsertManagedProject, deleteManagedProject as dbDeleteManagedProject } from '@/lib/database';
import { toast } from 'sonner';

export const DEFAULT_PRICING: PricingData = {
  uplift: {
    'Casement': 1, 'Casement Flag': 1, 'Box Sash': 1, 'Fix Sash': 1,
    'Spring Sash': 1, 'Door': 1, 'Door + Top Light': 1, 'French Door': 1, 'Patio Door': 1,
  },
  installationSelling: {
    'Casement': 90, 'Casement Flag': 50, 'Box Sash': 150, 'Fix Sash': 125,
    'Spring Sash': 125, 'Door': 125, 'Door + Top Light': 175, 'French Door': 175, 'Patio Door': 175,
  },
  installationCost: {
    'Casement': 90, 'Casement Flag': 50, 'Box Sash': 150, 'Fix Sash': 125,
    'Spring Sash': 125, 'Door': 125, 'Door + Top Light': 175, 'French Door': 175, 'Patio Door': 175,
  },
  makingGoodSelling: { intMkgInternal: 12.50, extMkgInternal: 16.00, intMkgExternal: 8.00, extMkgExternal: 12.00 },
  makingGoodCost: { intMkgInternal: 7.00, extMkgInternal: 8.00, intMkgExternal: 4.00, extMkgExternal: 6.00 },
  architraveSelling: { single: 6.50, baySide: 6.50, bayCentral: 6.50 },
  architraveCost: { single: 4.50, baySide: 4.50, bayCentral: 4.50 },
  trimsSelling: { single: 4.00, baySide: 4.00, bayCentral: 4.00 },
  trimsCost: { single: 1.00, baySide: 1.00, bayCentral: 1.00 },
  mdfSelling: { narrow: { single: 17.50, baySide: 17.50, bayCentral: 17.50 }, wide: { single: 17.50, baySide: 17.50, bayCentral: 17.50 } },
  mdfCost: { narrow: { single: 9.00, baySide: 9.00, bayCentral: 9.00 }, wide: { single: 9.00, baySide: 9.00, bayCentral: 9.00 } },
  extras: { 'Recess of reveal': 75, 'Shutters': 100, 'Cut Out of work top': 125 },
  consumables: {
    'Carpet protection': 6.40, 'Correx': 5.25,
    'Dust sheets': 1.20, 'Masking tape': 0.75, 'Blue paper': 0.76, 'Rubbish bag': 0.50,
    'Screws (brackets)': 0.64, 'Screws (windows)': 0.30, 'Packers': 0.70, 'Plugs': 1.15,
    'Foam': 4.20, 'DPC': 0.15, 'Silicone': 0.45, 'Caulk': 1.17,
  },
  wasteDisposal: 35.00,
  deliveryStockSelling: 40.00,
  deliveryStockCost: 40.00,
  fensaSurveySelling: 15.00,
  fensaSurveyCost: 15.00,
  overheadPerDay: 2000.00,
};

interface AppContextType {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  managedProjects: ManagedProject[];
  globalPricing: PricingData;
  setGlobalPricing: React.Dispatch<React.SetStateAction<PricingData>>;
  saveGlobalPricingToDb: (pricing: PricingData) => Promise<void>;
  loading: boolean;
  saveProjectToDb: (project: Project) => Promise<void>;
  deleteProjectFromDb: (id: string) => Promise<void>;
  saveClientToDb: (client: Client) => Promise<void>;
  deleteClientFromDb: (id: string) => Promise<void>;
  saveSupplierToDb: (supplier: Supplier) => Promise<void>;
  deleteSupplierFromDb: (id: string) => Promise<void>;
  saveManagedProjectToDb: (mp: ManagedProject) => Promise<void>;
  deleteManagedProjectFromDb: (id: string) => Promise<void>;
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
  if (project.pricing) return { ...DEFAULT_PRICING, ...project.pricing, uplift: project.pricing.uplift || DEFAULT_PRICING.uplift };
  return DEFAULT_PRICING;
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
  return {
    id,
    date: new Date().toISOString().split('T')[0],
    client: '',
    clientId: undefined,
    projectRef: '',
    settings: { ...DEFAULT_SETTINGS },
    lineItems: [],
    pricing: { ...DEFAULT_PRICING },
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
    widthMm: 0,
    heightMm: 0,
    manufactureCurrency: 'GBP',
    supplier: '',
    manufacturePrice: 0,
    uplift: 0,
    installationType: 'Internal',
    installationOverride: undefined,
    architraveType: 'none',
    trimsType: 'none',
    mdfRevealType: 'none',
    mdfWidthType: 'narrow',
    extra1: 'none',
    extra2: 'none',
    customExtra: 0,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [managedProjects, setManagedProjects] = useState<ManagedProject[]>([]);
  const [globalPricing, setGlobalPricing] = useState<PricingData>(DEFAULT_PRICING);
  const [loading, setLoading] = useState(true);

  // Load all data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [dbClients, dbSuppliers, dbProjects, dbPricing, dbManagedProjects] = await Promise.all([
          fetchClients(),
          fetchSuppliers(),
          fetchProjects(),
          fetchGlobalPricing(),
          fetchManagedProjects(),
        ]);
        setClients(dbClients);
        setSuppliers(dbSuppliers);
        setProjects(dbProjects);
        setGlobalPricing(dbPricing);
        setManagedProjects(dbManagedProjects);
      } catch (err) {
        console.error('Failed to load data from cloud:', err);
        toast.error('Failed to load data from cloud');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // DB operations that also update local state
  const saveProjectToDb = useCallback(async (project: Project) => {
    await upsertProject(project);
    setProjects(prev => {
      const exists = prev.find(p => p.id === project.id);
      return exists ? prev.map(p => p.id === project.id ? project : p) : [...prev, project];
    });
  }, []);

  const deleteProjectFromDb = useCallback(async (id: string) => {
    await dbDeleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  const saveClientToDb = useCallback(async (client: Client) => {
    await upsertClient(client);
    setClients(prev => {
      const exists = prev.find(c => c.id === client.id);
      return exists ? prev.map(c => c.id === client.id ? client : c) : [...prev, client];
    });
  }, []);

  const deleteClientFromDb = useCallback(async (id: string) => {
    await dbDeleteClient(id);
    setClients(prev => prev.filter(c => c.id !== id));
  }, []);

  const saveSupplierToDb = useCallback(async (supplier: Supplier) => {
    await upsertSupplier(supplier);
    setSuppliers(prev => {
      const exists = prev.find(s => s.id === supplier.id);
      return exists ? prev.map(s => s.id === supplier.id ? supplier : s) : [...prev, supplier];
    });
  }, []);

  const deleteSupplierFromDb = useCallback(async (id: string) => {
    await dbDeleteSupplier(id);
    setSuppliers(prev => prev.filter(s => s.id !== id));
  }, []);

  const saveManagedProjectToDb = useCallback(async (mp: ManagedProject) => {
    await upsertManagedProject(mp);
    setManagedProjects(prev => {
      const exists = prev.find(p => p.id === mp.id);
      return exists ? prev.map(p => p.id === mp.id ? mp : p) : [...prev, mp];
    });
  }, []);

  const deleteManagedProjectFromDb = useCallback(async (id: string) => {
    await dbDeleteManagedProject(id);
    setManagedProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  const saveGlobalPricingToDb = useCallback(async (p: PricingData) => {
    await saveGlobalPricing(p);
    setGlobalPricing(p);
  }, []);

  return (
    <AppContext.Provider value={{
      projects, setProjects, currentProject, setCurrentProject,
      clients, setClients, suppliers, setSuppliers,
      managedProjects, globalPricing, setGlobalPricing, saveGlobalPricingToDb, loading,
      saveProjectToDb, deleteProjectFromDb,
      saveClientToDb, deleteClientFromDb,
      saveSupplierToDb, deleteSupplierFromDb,
      saveManagedProjectToDb, deleteManagedProjectFromDb,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
