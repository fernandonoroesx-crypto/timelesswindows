import React, { useState, useEffect, useRef } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { useApp, createNewProject, createNewLineItem, getProjectPricing, generateQuoteRef, DEFAULT_PRICING } from '@/lib/context';
import { calculateItemSelling, calculateItemCost, calculateQuoteSummary, formatCurrency, getItemSellingBreakdown, getItemCostBreakdown } from '@/lib/pricing';
import type { Project, QuoteLineItem, WindowType, ExtraType, ProjectSettings, PricingData, ProjectManager, ArchitraveType, TrimsType, MdfRevealType, MdfWidthType, Supplier, ManagedProject } from '@/lib/types';
import type { PriceBreakdown } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save, FileDown, Copy, ChevronDown, ChevronUp, Calculator, Send, SlidersHorizontal } from 'lucide-react';
import PricingEditor from '@/components/PricingEditor';
import { toast } from 'sonner';
import { exportQuotePdf, exportInstallationPdf } from '@/lib/pdf-export';
import { exportQuoteExcel } from '@/lib/excel-export';

import PdfImportDialog from '@/components/PdfImportDialog';

const WINDOW_TYPES: WindowType[] = [
  'Casement', 'Casement Flag', 'Box Sash', 'Fix Sash', 'Spring Sash',
  'Door', 'Door + Top Light', 'French Door', 'Patio Door',
];

const EXTRA_TYPES: ExtraType[] = ['Recess of reveal', 'Shutters', 'Cut Out of work top'];

export default function QuoteBuilder() {
  const { currentProject, setCurrentProject, projects, setProjects, clients, suppliers, saveProjectToDb, saveManagedProjectToDb, globalPricing, loading } = useApp();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project>(() => {
    if (currentProject) return currentProject;
    const p = createNewProject();
    p.pricing = { ...globalPricing };
    return p;
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showWonConfirm, setShowWonConfirm] = useState(false);
  const hasInitializedPricing = useRef(!!currentProject);

  useEffect(() => {
    if (currentProject) setProject(currentProject);
  }, [currentProject]);

  // Sync pricing with saved global settings once they load (for new quotes only)
  useEffect(() => {
    if (!hasInitializedPricing.current && !currentProject && !loading) {
      setProject(prev => ({ ...prev, pricing: { ...globalPricing } }));
      hasInitializedPricing.current = true;
    }
  }, [loading, globalPricing, currentProject]);

  const updateProject = (updates: Partial<Project>) => {
    setProject(prev => ({ ...prev, ...updates, updatedAt: new Date().toISOString() }));
  };

  const updateSettings = (key: string, value: any) => {
    updateProject({ settings: { ...project.settings, [key]: value } });
  };
  const updatePricing = (path: string, value: number) => {
    const keys = path.split('.');
    setProject(prev => {
      const pricing = { ...(prev.pricing || quotePricing) } as any;
      if (keys.length === 2) {
        pricing[keys[0]] = { ...pricing[keys[0]], [keys[1]]: value };
      } else {
        pricing[keys[0]] = value;
      }
      return { ...prev, pricing };
    });
  };


  const selectClient = (clientId: string) => {
    if (clientId === '_none') {
      updateProject({ clientId: undefined, client: '', projectRef: '', projectManagerId: undefined, projectManagerName: '' });
      return;
    }
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const ref = generateQuoteRef(client.name, projects);
      updateProject({ clientId: client.id, client: client.name, projectRef: ref, projectManagerId: undefined, projectManagerName: '' });
    }
  };

  const selectedClient = clients.find(c => c.id === project.clientId);
  const clientPMs: ProjectManager[] = selectedClient?.projectManagers || [];

  const selectPM = (pmId: string) => {
    if (pmId === '_none') {
      const defaultPricing = { ...globalPricing };
      updateProject({ projectManagerId: undefined, projectManagerName: '', pricing: defaultPricing });
      return;
    }
    const pm = clientPMs.find(p => p.id === pmId);
    if (pm) {
      const pricing = pm.pricing ? { ...pm.pricing } : { ...globalPricing };
      updateProject({ projectManagerId: pm.id, projectManagerName: pm.name, pricing });
    }
  };

  const addLineItem = () => {
    const newItem = createNewLineItem();
    newItem.itemRef = `${project.projectRef || 'ITEM'}-${project.lineItems.length + 1}`;
    updateProject({ lineItems: [newItem, ...project.lineItems] });
    setEditingItemId(newItem.id);
  };

  const updateLineItem = (id: string, updates: Partial<QuoteLineItem>) => {
    updateProject({
      lineItems: project.lineItems.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ),
    });
  };

  const removeLineItem = (id: string) => {
    updateProject({ lineItems: project.lineItems.filter(item => item.id !== id) });
  };

  const duplicateLineItem = (id: string) => {
    const item = project.lineItems.find(i => i.id === id);
    if (item) {
      const newItem = { ...item, id: crypto.randomUUID(), itemRef: `${item.itemRef}-copy` };
      updateProject({ lineItems: [...project.lineItems, newItem] });
    }
  };

  const saveProject = async () => {
    try {
      await saveProjectToDb(project);
      setCurrentProject(project);
      toast.success('Quote saved successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save quote');
    }
  };

  const quotePricing = project.pricing || getProjectPricing(project);
  const summary = calculateQuoteSummary(project.lineItems, project.settings, quotePricing);

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Quote Builder</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {project.projectRef || 'New quote'} — {project.client || 'No client'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={saveProject} className="bg-primary text-primary-foreground">
            <Save className="w-4 h-4 mr-2" /> Save
          </Button>
          <Button
            variant="outline"
            className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
            onClick={async () => {
              const now = new Date().toISOString();
              updateProject({ status: 'sent', sentAt: now });
              setTimeout(() => saveProject(), 100);
              toast.success('Quote marked as sent');
            }}
          >
            <Send className="w-4 h-4 mr-2" /> Send
          </Button>
          <Button variant="outline" onClick={async () => {
            const client = clients.find(c => c.id === project.clientId);
            await exportQuotePdf(project, client?.address);
            toast.success('Quote PDF exported');
          }}>
            <FileDown className="w-4 h-4 mr-2" /> Quote PDF
          </Button>
          <Button variant="outline" onClick={async () => {
            await exportInstallationPdf(project);
            toast.success('Installation report exported');
          }}>
            <FileDown className="w-4 h-4 mr-2" /> Installation PDF
          </Button>
          <Button variant="outline" onClick={async () => {
            await exportQuoteExcel(project);
            toast.success('Excel report exported');
          }}>
            <FileDown className="w-4 h-4 mr-2" /> Excel Report
          </Button>
        </div>
      </div>

      {/* Project details */}
      <div className="elevated-card rounded-xl p-6">
        <h2 className="font-heading text-lg font-semibold mb-4">Project Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>Date</Label>
            <Input type="date" value={project.date} onChange={e => updateProject({ date: e.target.value })} />
          </div>
          <div>
            <Label>Client</Label>
            {clients.length > 0 ? (
              <Select value={project.clientId || '_none'} onValueChange={selectClient}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— No client —</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={project.client} onChange={e => updateProject({ client: e.target.value })} placeholder="Client name" />
            )}
          </div>
          <div>
            <Label>Project Manager</Label>
            {clientPMs.length > 0 ? (
              <Select value={project.projectManagerId || '_none'} onValueChange={selectPM}>
                <SelectTrigger><SelectValue placeholder="Select PM" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {clientPMs.map(pm => <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input disabled placeholder={project.clientId ? 'No PMs registered' : 'Select client first'} />
            )}
          </div>
          <div>
            <Label>Project Ref</Label>
            <Input value={project.projectRef} onChange={e => updateProject({ projectRef: e.target.value })} placeholder="AD123 - Address" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={project.status} onValueChange={(v) => {
              if (v === 'won') {
                setShowWonConfirm(true);
              } else {
                updateProject({ status: v as Project['status'] });
              }
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-6 mt-4 pt-4 border-t">
          <ToggleSetting label="Waste Disposal" checked={project.settings.includeWasteDisposal} onChange={v => updateSettings('includeWasteDisposal', v)} />
          <ToggleSetting label="Internal Making Good" checked={project.settings.includeInternalMakingGood} onChange={v => updateSettings('includeInternalMakingGood', v)} />
          <ToggleSetting label="External Making Good" checked={project.settings.includeExternalMakingGood} onChange={v => updateSettings('includeExternalMakingGood', v)} />
          <ToggleSetting label="Supply Only" checked={project.settings.supplyOnly} onChange={v => updateSettings('supplyOnly', v)} />
          {!project.settings.supplyOnly && (
            <div className="flex items-center gap-2 ml-auto border rounded-lg px-3 py-1.5 bg-muted/30">
              <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Est. Days</Label>
              <Input type="number" min="0" step="0.5" className="h-7 w-16 text-sm text-center border-0 bg-transparent p-0" value={project.settings.overheadDays}
                onChange={e => updateSettings('overheadDays', parseFloat(e.target.value) || 0)} />
            </div>
          )}
        </div>
      </div>

      {/* Summary at the top */}
      {project.lineItems.length > 0 && (
        <div className="elevated-card rounded-xl p-6 border-l-4 border-l-secondary">
          <h2 className="font-heading text-lg font-semibold mb-4">Quote Summary</h2>
          
          {(() => {
            const totals = { material: 0, installation: 0, internalMakingGood: 0, externalMakingGood: 0, architrave: 0, trims: 0, mdfReveal: 0, wasteDisposal: 0, deliveryStock: 0, fensaSurvey: 0, extras: 0, consumables: 0, overhead: 0 };
            const costTotals = { ...totals };
            for (const item of project.lineItems) {
              const sb = getItemSellingBreakdown(item, project.settings, quotePricing);
              const cb = getItemCostBreakdown(item, project.settings, quotePricing);
              for (const k of Object.keys(totals) as (keyof typeof totals)[]) {
                totals[k] += sb[k] * item.qty;
                costTotals[k] += cb[k] * item.qty;
              }
            }
            const overheadDays = project.settings.overheadDays * (quotePricing.overheadPerDay || 0);

            const labourSelling = totals.installation + totals.internalMakingGood + totals.externalMakingGood
              + totals.architrave + totals.trims + totals.mdfReveal;
            const labourCost = costTotals.installation + costTotals.internalMakingGood + costTotals.externalMakingGood
              + costTotals.architrave + costTotals.trims + costTotals.mdfReveal
              + costTotals.deliveryStock + costTotals.fensaSurvey
              + costTotals.consumables + costTotals.overhead;

            const summaryRows = [
              { label: 'Materials', selling: totals.material, cost: costTotals.material },
              ...(!project.settings.supplyOnly ? [
                { label: 'Labour', selling: labourSelling, cost: labourCost },
                ...(totals.wasteDisposal > 0 ? [{ label: 'Waste Disposal', selling: totals.wasteDisposal, cost: costTotals.wasteDisposal }] : []),
                ...(totals.extras > 0 ? [{ label: 'Extras', selling: totals.extras, cost: costTotals.extras }] : []),
                ...(overheadDays > 0 ? [{ label: `Overhead (${project.settings.overheadDays} days)`, selling: 0, cost: overheadDays }] : []),
              ] : []),
            ];

            const detailRows = [
              { label: 'Materials', selling: totals.material, cost: costTotals.material },
              ...(!project.settings.supplyOnly ? [
                { label: 'Installation', selling: totals.installation, cost: costTotals.installation },
                ...(totals.internalMakingGood > 0 ? [{ label: 'Internal Making Good', selling: totals.internalMakingGood, cost: costTotals.internalMakingGood }] : []),
                ...(totals.externalMakingGood > 0 ? [{ label: 'External Making Good', selling: totals.externalMakingGood, cost: costTotals.externalMakingGood }] : []),
                ...(totals.architrave > 0 ? [{ label: 'Architrave', selling: totals.architrave, cost: costTotals.architrave }] : []),
                ...(totals.trims > 0 ? [{ label: 'Trims', selling: totals.trims, cost: costTotals.trims }] : []),
                ...(totals.mdfReveal > 0 ? [{ label: 'MDF Reveal', selling: totals.mdfReveal, cost: costTotals.mdfReveal }] : []),
                ...(totals.wasteDisposal > 0 ? [{ label: 'Waste Disposal', selling: totals.wasteDisposal, cost: costTotals.wasteDisposal }] : []),
                ...(totals.extras > 0 ? [{ label: 'Extras', selling: totals.extras, cost: costTotals.extras }] : []),
                { label: 'Delivery & Stock', selling: 0, cost: costTotals.deliveryStock },
                { label: 'FENSA / Survey', selling: 0, cost: costTotals.fensaSurvey },
                { label: 'Consumables', selling: 0, cost: costTotals.consumables },
                { label: `Overhead (${project.settings.overheadDays} days)`, selling: 0, cost: overheadDays },
              ] : []),
            ];

            const BreakdownTable = ({ rows, title }: { rows: typeof summaryRows; title: string }) => (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</h3>
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 gap-y-1 text-sm">
                  <div className="text-xs font-medium text-muted-foreground">Category</div>
                  <div className="text-xs font-medium text-muted-foreground text-right">Selling</div>
                  <div className="text-xs font-medium text-muted-foreground text-right">Cost</div>
                  <div className="text-xs font-medium text-muted-foreground text-right">Margin</div>
                  {rows.map(row => {
                    const rowMargin = row.selling > 0 ? ((row.selling - row.cost) / row.selling) * 100 : 0;
                    return (
                      <React.Fragment key={row.label}>
                        <div className="text-muted-foreground">{row.label}</div>
                        <div className="text-right font-medium">{formatCurrency(row.selling)}</div>
                        <div className="text-right text-muted-foreground">{formatCurrency(row.cost)}</div>
                        <div className={`text-right font-medium ${rowMargin > 0 ? 'text-green-600' : rowMargin < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {row.selling > 0 ? `${rowMargin.toFixed(1)}%` : '—'}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );

            return (
              <div className="mb-4 space-y-4">
                <BreakdownTable rows={summaryRows} title="Summary" />
                <details className="group">
                  <summary className="cursor-pointer text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors">
                    ▸ Full Breakdown
                  </summary>
                  <div className="mt-2">
                    <BreakdownTable rows={detailRows} title="" />
                  </div>
                </details>
              </div>
            );
          })()}

          <div className="border-t pt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Total Items" value={summary.totalItems.toString()} />
            <SummaryCard label="Total SM" value={summary.totalSm.toFixed(2)} />
            <SummaryCard label="Selling Price" value={formatCurrency(summary.sellingPrice.total)} highlight />
            <SummaryCard label="Cost" value={formatCurrency(summary.costPrice.total)} />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <SummaryCard label="Profit" value={formatCurrency(summary.profit)} highlight={summary.profit > 0} />
            <SummaryCard label="Margin" value={`${summary.margin.toFixed(1)}%`} highlight={summary.margin > 0} />
          </div>
        </div>
      )}

      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">Line Items ({project.lineItems.length})</TabsTrigger>
          <TabsTrigger value="pricing"><SlidersHorizontal className="w-4 h-4 mr-1 inline" />Pricing</TabsTrigger>
         </TabsList>

        <TabsContent value="items" className="space-y-6">
          <div className="elevated-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-semibold">Line Items</h2>
              <div className="flex gap-2">
                <PdfImportDialog
                  projectRef={project.projectRef}
                  existingCount={project.lineItems.length}
                  onImport={(items) => updateProject({ lineItems: [...project.lineItems, ...items] })}
                />
                <Button onClick={addLineItem} size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  <Plus className="w-4 h-4 mr-2" /> Add Item
                </Button>
              </div>
            </div>

            {/* New item being added - show full card at top */}
            {editingItemId && project.lineItems.length > 0 && project.lineItems[0]?.id === editingItemId && (
              <div className="mb-4">
                <LineItemCard
                  item={project.lineItems[0]}
                  index={0}
                  settings={project.settings}
                  quotePricing={quotePricing}
                  suppliers={suppliers}
                  onUpdate={(updates) => updateLineItem(editingItemId, updates)}
                  onRemove={() => { removeLineItem(editingItemId); setEditingItemId(null); }}
                  onDuplicate={() => duplicateLineItem(editingItemId)}
                />
                <div className="flex justify-end mt-2">
                  <Button size="sm" onClick={() => setEditingItemId(null)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                    Done
                  </Button>
                </div>
              </div>
            )}

            {project.lineItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No items yet. Click "Add Item" to start building your quote.</p>
              </div>
            ) : (
              <div className="overflow-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Ref</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Qty</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">W×H (mm)</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Selling</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Cost</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Margin</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.lineItems.map((item, index) => {
                      // Skip the item being edited as new (shown above)
                      if (item.id === editingItemId && index === 0) return null;
                      const sb = getItemSellingBreakdown(item, project.settings, quotePricing);
                      const cb = getItemCostBreakdown(item, project.settings, quotePricing);
                      const lineSelling = sb.total * item.qty;
                      const lineCost = cb.total * item.qty;
                      const lineMargin = lineSelling > 0 ? ((lineSelling - lineCost) / lineSelling) * 100 : 0;
                      const isEditing = editingItemId === item.id;
                      return (
                        <React.Fragment key={item.id}>
                          <tr
                            className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => setEditingItemId(isEditing ? null : item.id)}
                          >
                            <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{index + 1}</td>
                            <td className="px-3 py-2 font-medium">{item.itemRef || '—'}</td>
                            <td className="px-3 py-2">{item.type}</td>
                            <td className="px-3 py-2 text-right">{item.qty}</td>
                            <td className="px-3 py-2 text-right">{item.widthMm}×{item.heightMm}</td>
                            <td className="px-3 py-2 text-right font-medium">{formatCurrency(lineSelling)}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(lineCost)}</td>
                            <td className={`px-3 py-2 text-right font-medium ${lineMargin > 0 ? 'text-green-600' : lineMargin < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {lineMargin.toFixed(1)}%
                            </td>
                            <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                              <div className="flex justify-center gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => duplicateLineItem(item.id)}><Copy className="w-3.5 h-3.5" /></Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeLineItem(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                              </div>
                            </td>
                          </tr>
                          {isEditing && (
                            <tr>
                              <td colSpan={9} className="p-0">
                                <div className="p-4 bg-muted/20 border-b">
                                  <LineItemCard
                                    item={item}
                                    index={index}
                                    settings={project.settings}
                                    quotePricing={quotePricing}
                                    suppliers={suppliers}
                                    onUpdate={(updates) => updateLineItem(item.id, updates)}
                                    onRemove={() => { removeLineItem(item.id); setEditingItemId(null); }}
                                    onDuplicate={() => duplicateLineItem(item.id)}
                                  />
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pricing">
          <div className="elevated-card rounded-xl p-6">
            <PricingEditor pricing={quotePricing} onUpdate={updatePricing} />
          </div>
        </TabsContent>

      </Tabs>

      <AlertDialog open={showWonConfirm} onOpenChange={setShowWonConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this quote as Won?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a linked Project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              const wonProject = { ...project, status: 'won' as const, updatedAt: new Date().toISOString() };
              setProject(wonProject);
              setShowWonConfirm(false);
              try {
                await saveProjectToDb(wonProject);
                // Find client to get address
                const client = clients.find(c => c.id === wonProject.clientId);
                const mp: ManagedProject = {
                  id: crypto.randomUUID(),
                  quoteId: wonProject.id,
                  quoteRef: wonProject.projectRef,
                  clientName: wonProject.client,
                  address: client?.address || '',
                  projectType: wonProject.settings.supplyOnly ? 'supply-only' : 'standard',
                  currentStage: 'won',
                  keyDates: {},
                  assignedTeam: [],
                  notes: [],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                await saveManagedProjectToDb(mp);
                toast.success('Quote marked as Won — Project created');
              } catch {
                toast.error('Failed to save');
              }
            }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


function LineItemCard({
  item, index, settings, quotePricing, suppliers, onUpdate, onRemove, onDuplicate,
}: {
  item: QuoteLineItem;
  index: number;
  settings: ProjectSettings;
  quotePricing: PricingData;
  suppliers: Supplier[];
  onUpdate: (updates: Partial<QuoteLineItem>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const safeUplift = quotePricing.uplift || DEFAULT_PRICING.uplift;

  const sellingBreakdown = getItemSellingBreakdown(item, settings, quotePricing);
  const costBreakdown = getItemCostBreakdown(item, settings, quotePricing);

  return (
    <div className="border rounded-xl p-4 bg-card transition-all">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-left flex-1">
          <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
          <span className="font-medium text-sm">{item.type} — {item.widthMm}×{item.heightMm}mm</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          <span className="text-sm font-semibold text-primary ml-auto mr-4">{formatCurrency(sellingBreakdown.total)}</span>
        </button>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setShowBreakdown(!showBreakdown)} title="Show formula">
            <Calculator className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDuplicate}><Copy className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="sm" onClick={onRemove} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      {expanded && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3 pt-3 border-t">
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={item.type} onValueChange={(v: WindowType) => onUpdate({ type: v })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WINDOW_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Qty</Label>
            <Input type="number" min={1} className="h-9 text-xs" value={item.qty} onChange={e => onUpdate({ qty: parseInt(e.target.value) || 1 })} />
          </div>
          <div>
            <Label className="text-xs">Width (mm)</Label>
            <Input type="number" className="h-9 text-xs" value={item.widthMm} onChange={e => onUpdate({ widthMm: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <Label className="text-xs">Height (mm)</Label>
            <Input type="number" className="h-9 text-xs" value={item.heightMm} onChange={e => onUpdate({ heightMm: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <Label className="text-xs">Supplier</Label>
            <Select
              value={item.supplier || '__none__'}
              onValueChange={v => {
                if (v === '__none__') {
                  onUpdate({ supplier: '', manufactureCurrency: 'GBP' });
                } else {
                  const found = suppliers.find(s => s.name === v);
                  onUpdate({ supplier: v, manufactureCurrency: found?.currency || 'GBP' });
                }
              }}
            >
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— No supplier —</SelectItem>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.name}>{s.name} ({s.currency})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Price</Label>
            <Input type="number" step="0.01" className="h-9 text-xs" value={item.manufacturePrice} onChange={e => onUpdate({ manufacturePrice: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label className="text-xs">Uplift</Label>
            <Input type="number" step="0.1" className="h-9 text-xs"
              value={item.uplift != null && item.uplift !== 0 ? item.uplift : (safeUplift[item.type] || 1)}
              onChange={e => {
                const val = parseFloat(e.target.value) || 1;
                const defaultVal = safeUplift[item.type] || 1;
                onUpdate({ uplift: val === defaultVal ? 0 : val });
              }}
              placeholder="Auto"
            />
          </div>
          <div>
            <Label className="text-xs">Install Price</Label>
            <Input type="number" step="0.01" className="h-9 text-xs"
              value={item.installationOverride ?? quotePricing.installationSelling[item.type] ?? 0}
              onChange={e => {
                const val = parseFloat(e.target.value);
                const defaultVal = quotePricing.installationSelling[item.type] || 0;
                onUpdate({ installationOverride: val === defaultVal ? undefined : val });
              }}
              placeholder="Auto"
            />
          </div>
          <div>
            <Label className="text-xs">Install Type</Label>
            <Select value={item.installationType} onValueChange={(v: 'Internal' | 'External') => onUpdate({ installationType: v })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Internal">Internal</SelectItem>
                <SelectItem value="External">External</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Architrave</Label>
            <Select value={item.architraveType} onValueChange={(v: ArchitraveType) => onUpdate({ architraveType: v })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="baySide">Bay Side</SelectItem>
                <SelectItem value="bayCentral">Bay Central</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Trims</Label>
            <Select value={item.trimsType} onValueChange={(v: TrimsType) => onUpdate({ trimsType: v })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="baySide">Bay Side</SelectItem>
                <SelectItem value="bayCentral">Bay Central</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">MDF Reveal</Label>
            <Select value={item.mdfRevealType} onValueChange={(v: MdfRevealType) => onUpdate({ mdfRevealType: v })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="baySide">Bay Side</SelectItem>
                <SelectItem value="bayCentral">Bay Central</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {item.mdfRevealType !== 'none' && (
            <div>
              <Label className="text-xs">MDF Width</Label>
              <Select value={item.mdfWidthType || 'narrow'} onValueChange={(v: MdfWidthType) => onUpdate({ mdfWidthType: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="narrow">Narrow</SelectItem>
                  <SelectItem value="wide">Wide</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Extras 01</Label>
            <Select value={item.extra1 || 'none'} onValueChange={(v: string) => onUpdate({ extra1: v as any })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {EXTRA_TYPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Extras 02</Label>
            <Select value={item.extra2 || 'none'} onValueChange={(v: string) => onUpdate({ extra2: v as any })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {EXTRA_TYPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Extra (£)</Label>
            <Input type="number" step="0.01" className="h-9 text-xs" value={item.customExtra || 0} onChange={e => onUpdate({ customExtra: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
      )}

      {/* Formula breakdown */}
      {showBreakdown && (
        <div className="mt-4 pt-4 border-t bg-muted/30 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" /> Price Breakdown (per unit)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Selling side */}
            <div>
              <p className="text-xs font-semibold text-accent mb-2">Selling Price</p>
              <div className="space-y-1 text-xs">
                <FormulaRow label="Material" value={sellingBreakdown.material}
                  formula={item.manufactureCurrency === 'EUR'
                    ? `ROUND(${formatCurrency(item.manufacturePrice)} × ${settings.eurToGbpRate} × (1 + ${item.uplift}%))`
                    : `ROUND(${formatCurrency(item.manufacturePrice)} × (1 + ${item.uplift}%))`}
                />
                {!settings.supplyOnly && (
                  <>
                    <FormulaRow label="Installation" value={sellingBreakdown.installation}
                      formula={item.installationOverride != null ? 'Override' : `Rate for ${item.type}`} />
                    {sellingBreakdown.internalMakingGood > 0 && <FormulaRow label="Int. Making Good" value={sellingBreakdown.internalMakingGood} />}
                    {sellingBreakdown.externalMakingGood > 0 && <FormulaRow label="Ext. Making Good" value={sellingBreakdown.externalMakingGood} />}
                    {sellingBreakdown.architrave > 0 && <FormulaRow label={`Architrave (${item.architraveType})`} value={sellingBreakdown.architrave} formula={`LM × rate`} />}
                    {sellingBreakdown.trims > 0 && <FormulaRow label={`Trims (${item.trimsType})`} value={sellingBreakdown.trims} />}
                    {sellingBreakdown.mdfReveal > 0 && <FormulaRow label={`MDF Reveal (${item.mdfRevealType})`} value={sellingBreakdown.mdfReveal} />}
                    {sellingBreakdown.extras > 0 && <FormulaRow label="Extras" value={sellingBreakdown.extras} />}
                    {sellingBreakdown.extras > 0 && <FormulaRow label="Extras" value={sellingBreakdown.extras} />}
                    {sellingBreakdown.wasteDisposal > 0 && <FormulaRow label="Waste Disposal" value={sellingBreakdown.wasteDisposal} />}
                  </>
                )}
                <div className="border-t pt-1 mt-1 flex justify-between font-semibold">
                  <span>Unit Total</span>
                  <span>{formatCurrency(sellingBreakdown.unitTotal)}</span>
                </div>
                {item.qty > 1 && (
                  <div className="flex justify-between font-bold text-accent">
                    <span>× {item.qty} = Total</span>
                    <span>{formatCurrency(sellingBreakdown.total)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Cost side */}
            <div>
              <p className="text-xs font-semibold text-destructive mb-2">Cost Price</p>
              <div className="space-y-1 text-xs">
                <FormulaRow label="Material" value={costBreakdown.material}
                  formula={item.manufactureCurrency === 'EUR'
                    ? `${formatCurrency(item.manufacturePrice)} × ${settings.eurToGbpRate}`
                    : `${formatCurrency(item.manufacturePrice)}`}
                />
                {!settings.supplyOnly && (
                  <>
                    <FormulaRow label="Installation" value={costBreakdown.installation} />
                    {costBreakdown.internalMakingGood > 0 && <FormulaRow label="Int. Making Good" value={costBreakdown.internalMakingGood} />}
                    {costBreakdown.externalMakingGood > 0 && <FormulaRow label="Ext. Making Good" value={costBreakdown.externalMakingGood} />}
                    {costBreakdown.architrave > 0 && <FormulaRow label="Architrave" value={costBreakdown.architrave} />}
                    {costBreakdown.trims > 0 && <FormulaRow label="Trims" value={costBreakdown.trims} />}
                    {costBreakdown.mdfReveal > 0 && <FormulaRow label="MDF Reveal" value={costBreakdown.mdfReveal} />}
                    {costBreakdown.deliveryStock > 0 && <FormulaRow label="Delivery/Stock" value={costBreakdown.deliveryStock} />}
                    {costBreakdown.fensaSurvey > 0 && <FormulaRow label="FENSA/Survey" value={costBreakdown.fensaSurvey} />}
                    {costBreakdown.consumables > 0 && <FormulaRow label="Consumables" value={costBreakdown.consumables} />}
                    {costBreakdown.extras > 0 && <FormulaRow label="Extras" value={costBreakdown.extras} />}
                    {costBreakdown.wasteDisposal > 0 && <FormulaRow label="Waste Disposal" value={costBreakdown.wasteDisposal} />}
                  </>
                )}
                <div className="border-t pt-1 mt-1 flex justify-between font-semibold">
                  <span>Unit Total</span>
                  <span>{formatCurrency(costBreakdown.unitTotal)}</span>
                </div>
                {item.qty > 1 && (
                  <div className="flex justify-between font-bold">
                    <span>× {item.qty} = Total</span>
                    <span>{formatCurrency(costBreakdown.total)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profit per item */}
          <div className="mt-3 pt-3 border-t flex justify-between text-sm font-bold">
            <span>Item Profit</span>
            <span className={sellingBreakdown.total - costBreakdown.total > 0 ? 'text-accent' : 'text-destructive'}>
              {formatCurrency(sellingBreakdown.total - costBreakdown.total)}
              <span className="text-xs font-normal text-muted-foreground ml-2">
                ({sellingBreakdown.total > 0 ? ((sellingBreakdown.total - costBreakdown.total) / sellingBreakdown.total * 100).toFixed(1) : '0'}% margin)
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function FormulaRow({ label, value, formula }: { label: string; value: number; formula?: string }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <div>
        <span>{label}</span>
        {formula && <span className="block text-[10px] text-muted-foreground font-mono">{formula}</span>}
      </div>
      <span className="font-medium whitespace-nowrap">{formatCurrency(value)}</span>
    </div>
  );
}

function ToggleSetting({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Switch checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-heading font-bold mt-1 ${highlight ? 'text-accent' : ''}`}>{value}</p>
    </div>
  );
}
