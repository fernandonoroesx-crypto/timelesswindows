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
  mdfRevealType: 'narrow' | 'wide' | 'none';
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
  projectRef: string;
  settings: ProjectSettings;
  lineItems: QuoteLineItem[];
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

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
}

export interface PricingData {
  installationSelling: Record<string, number>;
  installationCost: Record<string, number>;
  makingGoodSelling: { intMkgInternal: number; extMkgInternal: number; intMkgExternal: number; extMkgExternal: number };
  makingGoodCost: { intMkgInternal: number; extMkgInternal: number; intMkgExternal: number; extMkgExternal: number };
  architraveSelling: number;
  architraveCost: number;
  trimsSelling: number;
  trimsCost: number;
  mdfSelling: { narrow: number; wide: number };
  mdfCost: { narrow: number; wide: number };
  extras: Record<string, number>;
  consumables: Record<string, number>;
  wasteDisposal: number;
  overheadPerDay: number;
}
