import { supabase } from '@/integrations/supabase/client';
import type { Client, Supplier, Project, PricingData, ManagedProject } from '@/lib/types';
import { DEFAULT_PRICING } from '@/lib/context';
import { normalizePricingData } from '@/lib/pricing-normalize';

// ── Clients ──────────────────────────────────────────────

export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    notes: row.notes || '',
    projectManagers: ((row.project_managers as any[]) || []).map((pm: any) => 
      pm.pricing ? { ...pm, pricing: normalizePricingData(pm.pricing) } : pm
    ),
    createdAt: row.created_at,
  }));
}

export async function upsertClient(client: Client): Promise<void> {
  const { error } = await supabase.from('clients').upsert({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    address: client.address,
    notes: client.notes,
    project_managers: client.projectManagers as any,
  });
  if (error) throw error;
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}

// ── Suppliers ────────────────────────────────────────────

export async function fetchSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    currency: row.currency as 'GBP' | 'EUR',
    contactName: row.contact_name || '',
    email: row.email || '',
    phone: row.phone || '',
    notes: row.notes || '',
    createdAt: row.created_at,
  }));
}

export async function upsertSupplier(supplier: Supplier): Promise<void> {
  const { error } = await supabase.from('suppliers').upsert({
    id: supplier.id,
    name: supplier.name,
    currency: supplier.currency,
    contact_name: supplier.contactName,
    email: supplier.email,
    phone: supplier.phone,
    notes: supplier.notes,
  });
  if (error) throw error;
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) throw error;
}

// ── Quotes (was Projects) ────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    date: row.date || '',
    client: row.client || '',
    clientId: row.client_id || undefined,
    projectManagerId: row.project_manager_id || undefined,
    projectManagerName: row.project_manager_name || '',
    projectRef: row.project_ref || '',
    settings: row.settings as any,
    lineItems: (row.line_items as any[]) || [],
    pricing: row.pricing ? normalizePricingData(row.pricing as unknown as Partial<PricingData>) : undefined,
    status: (row.status as Project['status']) || 'draft',
    sentAt: row.sent_at || undefined,
    supplierPdfOriginal: row.supplier_pdf_original || undefined,
    supplierPdfClean: row.supplier_pdf_clean || undefined,
    supplierPdfName: row.supplier_pdf_name || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function upsertProject(project: Project): Promise<void> {
  const { error } = await supabase.from('quotes').upsert({
    id: project.id,
    date: project.date,
    client: project.client,
    client_id: project.clientId || null,
    project_manager_id: project.projectManagerId || null,
    project_manager_name: project.projectManagerName || '',
    project_ref: project.projectRef,
    settings: project.settings as any,
    line_items: project.lineItems as any,
    pricing: project.pricing as any,
    status: project.status,
    sent_at: project.sentAt || null,
    supplier_pdf_original: project.supplierPdfOriginal || null,
    supplier_pdf_clean: project.supplierPdfClean || null,
    supplier_pdf_name: project.supplierPdfName || null,
  } as any);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('quotes').delete().eq('id', id);
  if (error) throw error;
}

// ── Global Pricing ───────────────────────────────────────

export async function fetchGlobalPricing(): Promise<PricingData> {
  const { data, error } = await supabase
    .from('global_settings')
    .select('value')
    .eq('key', 'pricing')
    .maybeSingle();
  if (error) throw error;
  if (data?.value) {
    return normalizePricingData(data.value as unknown as Partial<PricingData>);
  }
  return JSON.parse(JSON.stringify(DEFAULT_PRICING));
}

export async function saveGlobalPricing(pricing: PricingData): Promise<void> {
  const { error } = await supabase.from('global_settings').upsert({
    key: 'pricing',
    value: pricing as any,
  }, { onConflict: 'key' });
  if (error) throw error;
}

// ── Managed Projects ────────────────────────────────────

export async function fetchManagedProjects(): Promise<ManagedProject[]> {
  const { data, error } = await supabase
    .from('managed_projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    quoteId: row.quote_id,
    quoteRef: row.quote_ref || '',
    clientName: row.client_name || '',
    address: row.address || '',
    projectType: row.project_type || 'standard',
    currentStage: row.current_stage || 'won',
    keyDates: {
      surveyDate: row.survey_date || undefined,
      orderDate: row.order_date || undefined,
      expectedDelivery: row.expected_delivery || undefined,
      installationDate: row.installation_date || undefined,
      completionDate: row.completion_date || undefined,
    },
    assignedTeam: (row.assigned_team as any[]) || [],
    notes: (row.notes as any[]) || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function upsertManagedProject(mp: ManagedProject): Promise<void> {
  const { error } = await supabase.from('managed_projects').upsert({
    id: mp.id,
    quote_id: mp.quoteId,
    quote_ref: mp.quoteRef,
    client_name: mp.clientName,
    address: mp.address,
    project_type: mp.projectType,
    current_stage: mp.currentStage,
    survey_date: mp.keyDates.surveyDate || null,
    order_date: mp.keyDates.orderDate || null,
    expected_delivery: mp.keyDates.expectedDelivery || null,
    installation_date: mp.keyDates.installationDate || null,
    completion_date: mp.keyDates.completionDate || null,
    assigned_team: mp.assignedTeam as any,
    notes: mp.notes as any,
  } as any);
  if (error) throw error;
}

export async function deleteManagedProject(id: string): Promise<void> {
  const { error } = await supabase.from('managed_projects').delete().eq('id', id);
  if (error) throw error;
}
