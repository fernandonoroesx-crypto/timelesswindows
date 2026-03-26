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

export type MdfRevealType = 'singleNarrow' | 'sideNarrow' | 'centralNarrow' | 'singleWide' | 'sideWide' | 'centralWide' | 'none';

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
  includeArchitrave: boolean;
  includeTrims: boolean;
  includeMdfReveal: boolean;
  mdfRevealType: MdfRevealType;
  extras: ExtraType[];
}

export type ExtraType = 'Recess of reveal' | 'Shutters' | 'Cut Out of work top';

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
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
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

export interface MdfPricing {
  singleNarrow: number;
  sideNarrow: number;
  centralNarrow: number;
  singleWide: number;
  sideWide: number;
  centralWide: number;
}

export interface MakingGoodPricing {
  intMkgInternal: number;  // Internal MG when Internal install
  extMkgInternal: number;  // External MG when Internal install
  intMkgExternal: number;  // Internal MG when External install
  extMkgExternal: number;  // External MG when External install
}

export interface PricingData {
  installationSelling: Record<string, number>;
  installationCost: Record<string, number>;
  makingGoodSelling: MakingGoodPricing;
  makingGoodCost: MakingGoodPricing;
  architraveSelling: number;
  architraveCost: number;
  trimsSelling: number;
  trimsCost: number;
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
