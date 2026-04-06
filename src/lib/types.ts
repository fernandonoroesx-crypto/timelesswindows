export type WindowType =
  | 'Casement'
  | 'Casement Flag'
  | 'Box Sash'
  | 'Fix Sash'
  | 'Spring Sash'
  | 'Door'
  | 'Door + Top Light'
  | 'French Door'
  | 'Patio Door';

export type InstallationType = 'Internal' | 'External';

export type Currency = 'GBP' | 'EUR';

export type ArchitraveType = 'none' | 'single' | 'baySide' | 'bayCentral';
export type TrimsType = 'none' | 'single' | 'baySide' | 'bayCentral';
export type MdfRevealType = 'none' | 'single' | 'baySide' | 'bayCentral';
export type MdfWidthType = 'narrow' | 'wide';

export type ExtraType = 'Recess of reveal' | 'Shutters' | 'Cut Out of work top';

export interface QuoteLineItem {
  id: string;
  itemRef: string;
  type: WindowType;
  qty: number;
  widthMm: number;
  heightMm: number;
  manufactureCurrency: Currency;
  supplier: string;
  manufacturePrice: number;
  uplift: number;
  installationType: InstallationType;
  installationOverride?: number;
  architraveType: ArchitraveType;
  trimsType: TrimsType;
  mdfRevealType: MdfRevealType;
  mdfWidthType: MdfWidthType;
  extra1: ExtraType | 'none';
  extra2: ExtraType | 'none';
  customExtra: number;
}

export interface ProjectSettings {
  eurToGbpRate: number;
  includeWasteDisposal: boolean;
  includeInternalMakingGood: boolean;
  includeExternalMakingGood: boolean;
  supplyOnly: boolean;
  overheadDays: number;
}

export interface Project {
  id: string;
  date: string;
  client: string;
  clientId?: string;
  projectManagerId?: string;
  projectManagerName?: string;
  projectRef: string;
  settings: ProjectSettings;
  lineItems: QuoteLineItem[];
  pricing?: PricingData;
  status: 'draft' | 'sent' | 'won' | 'lost' | 'on-hold';
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CostBreakdown {
  material: number;
  installation: number;
  internalMakingGood: number;
  externalMakingGood: number;
  architrave: number;
  trims: number;
  mdfReveal: number;
  wasteDisposal: number;
  deliveryStock: number;
  fensaSurvey: number;
  extras: number;
  consumables: number;
  overhead: number;
  total: number;
}

export interface QuoteSummary {
  sellingPrice: CostBreakdown;
  costPrice: CostBreakdown;
  profit: number;
  margin: number;
  totalItems: number;
  totalSm: number;
}

export interface ProjectManager {
  id: string;
  name: string;
  email: string;
  phone: string;
  pricing?: PricingData;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  projectManagers: ProjectManager[];
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  currency: Currency;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: string;
}

export interface ProjectNote {
  timestamp: string;
  author: string;
  text: string;
}

export type ProjectStage = 'won' | 'survey' | 'ordered' | 'in-production' | 'out-for-delivery' | 'delivered' | 'on-site' | 'installed' | 'invoiced' | 'complete';

export interface ManagedProject {
  id: string;
  quoteId: string | null;
  quoteRef: string;
  clientName: string;
  address: string;
  projectType: 'standard' | 'supply-only';
  currentStage: ProjectStage;
  keyDates: {
    surveyDate?: string;
    orderDate?: string;
    expectedDelivery?: string;
    installationDate?: string;
    completionDate?: string;
  };
  assignedTeam: string[];
  notes: ProjectNote[];
  createdAt: string;
  updatedAt: string;
}

export interface ArchitravePricing {
  single: number;
  baySide: number;
  bayCentral: number;
}

export interface TrimsPricing {
  single: number;
  baySide: number;
  bayCentral: number;
}

export interface MdfPricing {
  single: number;
  baySide: number;
  bayCentral: number;
}

export interface MakingGoodPricing {
  intMkgInternal: number;
  extMkgInternal: number;
  intMkgExternal: number;
  extMkgExternal: number;
}

export interface PricingData {
  uplift: Record<string, number>;
  installationSelling: Record<string, number>;
  installationCost: Record<string, number>;
  makingGoodSelling: MakingGoodPricing;
  makingGoodCost: MakingGoodPricing;
  architraveSelling: ArchitravePricing;
  architraveCost: ArchitravePricing;
  trimsSelling: TrimsPricing;
  trimsCost: TrimsPricing;
  mdfSelling: MdfPricing;
  mdfCost: MdfPricing;
  extras: Record<string, number>;
  consumables: Record<string, number>;
  wasteDisposal: number;
  deliveryStockSelling: number;
  deliveryStockCost: number;
  fensaSurveySelling: number;
  fensaSurveyCost: number;
  overheadPerDay: number;
}
