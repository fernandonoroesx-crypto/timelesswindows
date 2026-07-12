import { supabase } from '@/integrations/supabase/client';
import type { Client, Supplier, Project, PricingData, ManagedProject, Employee, LabourAssignment, LabourBooking } from '@/lib/types';
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

// ── Employees ────────────────────────────────────────────

export async function fetchEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees' as any)
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return ((data as any[]) || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    role: row.role || '',
    dayRate: Number(row.day_rate) || 0,
    active: row.active ?? true,
    createdAt: row.created_at,
  }));
}

export async function upsertEmployee(emp: Employee): Promise<void> {
  const { error } = await supabase.from('employees' as any).upsert({
    id: emp.id,
    name: emp.name,
    role: emp.role,
    day_rate: emp.dayRate,
    active: emp.active,
  } as any);
  if (error) throw error;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from('employees' as any).delete().eq('id', id);
  if (error) throw error;
}

// ── Labour Assignments ───────────────────────────────────

export async function fetchLabourAssignments(): Promise<LabourAssignment[]> {
  const { data, error } = await supabase
    .from('labour_assignments' as any)
    .select('*')
    .order('work_date', { ascending: false });
  if (error) throw error;
  return ((data as any[]) || []).map((row: any) => ({
    id: row.id,
    workDate: row.work_date,
    kind: (row.kind as 'item' | 'extra' | 'day') || 'item',
    quoteId: row.quote_id,
    quoteRef: row.quote_ref || '',
    clientName: row.client_name || '',
    lineItemId: row.line_item_id ?? null,
    unitIndex: row.unit_index ?? null,
    itemDesc: row.item_desc || '',
    employeeId: row.employee_id,
    labourAmount: Number(row.labour_amount) || 0,
    createdAt: row.created_at,
  }));
}

export async function insertLabourAssignments(assignments: LabourAssignment[]): Promise<void> {
  const { error } = await supabase.from('labour_assignments' as any).insert(
    assignments.map(a => ({
      id: a.id,
      work_date: a.workDate,
      kind: a.kind,
      quote_id: a.quoteId,
      quote_ref: a.quoteRef,
      client_name: a.clientName,
      line_item_id: a.lineItemId,
      unit_index: a.unitIndex,
      item_desc: a.itemDesc,
      employee_id: a.employeeId,
      labour_amount: a.labourAmount,
    })) as any
  );
  if (error) throw error;
}

export async function deleteLabourAssignment(id: string): Promise<void> {
  const { error } = await supabase.from('labour_assignments' as any).delete().eq('id', id);
  if (error) throw error;
}

// ── Labour Bookings ──────────────────────────────────────

export async function fetchLabourBookings(): Promise<LabourBooking[]> {
  const { data, error } = await supabase
    .from('labour_bookings' as any)
    .select('*')
    .order('book_date', { ascending: true });
  if (error) throw error;
  return ((data as any[]) || []).map((row: any) => ({
    id: row.id,
    bookDate: row.book_date,
    quoteId: row.quote_id,
    quoteRef: row.quote_ref || '',
    clientName: row.client_name || '',
    employeeIds: row.employee_ids || [],
    note: row.note || '',
    createdAt: row.created_at,
  }));
}

export async function insertLabourBooking(b: LabourBooking): Promise<void> {
  const { error } = await supabase.from('labour_bookings' as any).insert({
    id: b.id,
    book_date: b.bookDate,
    quote_id: b.quoteId,
    quote_ref: b.quoteRef,
    client_name: b.clientName,
    employee_ids: b.employeeIds,
    note: b.note,
  } as any);
  if (error) throw error;
}

export async function deleteLabourBooking(id: string): Promise<void> {
  const { error } = await supabase.from('labour_bookings' as any).delete().eq('id', id);
  if (error) throw error;
}
