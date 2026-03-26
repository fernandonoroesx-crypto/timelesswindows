import { supabase } from '@/integrations/supabase/client';
import type { Client, Supplier, Project, PricingData } from '@/lib/types';
import { DEFAULT_PRICING } from '@/lib/context';

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
    projectManagers: (row.project_managers as any[]) || [],
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

// ── Projects ─────────────────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    date: row.date || '',
    client: row.client || '',
    clientId: row.client_id || undefined,
    projectManagerId: row.project_manager_id || undefined,
    projectManagerName: row.project_manager_name || '',
    projectRef: row.project_ref || '',
    settings: row.settings as any,
    lineItems: (row.line_items as any[]) || [],
    pricing: row.pricing as PricingData | undefined,
    status: (row.status as Project['status']) || 'draft',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function upsertProject(project: Project): Promise<void> {
  const { error } = await supabase.from('projects').upsert({
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
  });
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
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
    const val = data.value as unknown as Record<string, unknown>;
    return { ...DEFAULT_PRICING, ...val } as PricingData;
  }
  return DEFAULT_PRICING;
}

export async function saveGlobalPricing(pricing: PricingData): Promise<void> {
  const { error } = await supabase.from('global_settings').upsert({
    key: 'pricing',
    value: pricing as any,
  }, { onConflict: 'key' });
  if (error) throw error;
}
