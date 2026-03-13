import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, createNewProject, createNewLineItem } from '@/lib/context';
import { calculateItemSelling, calculateQuoteSummary, formatCurrency, WINDOW_INSTALLATION_SELLING } from '@/lib/pricing';
import type { Project, QuoteLineItem, WindowType, ExtraType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Save, FileDown, Copy } from 'lucide-react';
import { toast } from 'sonner';

const WINDOW_TYPES: WindowType[] = [
  'Casement', 'Casement Flag', 'Box Sash', 'Fix Sash', 'Spring Sash',
  'Door', 'Door + Top Light', 'French Door', 'Patio Door',
];

const EXTRA_TYPES: ExtraType[] = ['Recess of reveal', 'Shutters', 'Cut Out of work top'];

export default function QuoteBuilder() {
  const { currentProject, setCurrentProject, projects, setProjects } = useApp();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project>(() => currentProject || createNewProject());

  useEffect(() => {
    if (currentProject) setProject(currentProject);
  }, [currentProject]);

  const updateProject = (updates: Partial<Project>) => {
    setProject(prev => ({ ...prev, ...updates, updatedAt: new Date().toISOString() }));
  };

  const updateSettings = (key: string, value: any) => {
    updateProject({ settings: { ...project.settings, [key]: value } });
  };

  const addLineItem = () => {
    const newItem = createNewLineItem();
    newItem.itemRef = `${project.projectRef || 'ITEM'}-${project.lineItems.length + 1}`;
    updateProject({ lineItems: [...project.lineItems, newItem] });
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

  const saveProject = () => {
    const exists = projects.find(p => p.id === project.id);
    if (exists) {
      setProjects(prev => prev.map(p => p.id === project.id ? project : p));
    } else {
      setProjects(prev => [...prev, project]);
    }
    setCurrentProject(project);
    toast.success('Quote saved successfully');
  };

  const summary = calculateQuoteSummary(project.lineItems, project.settings);

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Quote Builder</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {project.projectRef || 'New quote'} — {project.client || 'No client'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={saveProject} className="bg-primary text-primary-foreground">
            <Save className="w-4 h-4 mr-2" /> Save
          </Button>
          <Button variant="outline" onClick={() => toast.info('PDF export coming soon')}>
            <FileDown className="w-4 h-4 mr-2" /> Export PDF
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
            <Input value={project.client} onChange={e => updateProject({ client: e.target.value })} placeholder="Client name" />
          </div>
          <div>
            <Label>Project Ref</Label>
            <Input value={project.projectRef} onChange={e => updateProject({ projectRef: e.target.value })} placeholder="AD123 - Address" />
          </div>
          <div>
            <Label>EUR → GBP Rate</Label>
            <Input type="number" step="0.01" value={project.settings.eurToGbpRate} onChange={e => updateSettings('eurToGbpRate', parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t">
          <ToggleSetting label="Waste Disposal" checked={project.settings.includeWasteDisposal} onChange={v => updateSettings('includeWasteDisposal', v)} />
          <ToggleSetting label="Internal Making Good" checked={project.settings.includeInternalMakingGood} onChange={v => updateSettings('includeInternalMakingGood', v)} />
          <ToggleSetting label="External Making Good" checked={project.settings.includeExternalMakingGood} onChange={v => updateSettings('includeExternalMakingGood', v)} />
          <ToggleSetting label="Supply Only" checked={project.settings.supplyOnly} onChange={v => updateSettings('supplyOnly', v)} />
        </div>
      </div>

      {/* Line items */}
      <div className="elevated-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold">Line Items ({project.lineItems.length})</h2>
          <Button onClick={addLineItem} size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        </div>

        {project.lineItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No items yet. Click "Add Item" to start building your quote.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {project.lineItems.map((item, index) => (
              <LineItemCard
                key={item.id}
                item={item}
                index={index}
                settings={project.settings}
                onUpdate={(updates) => updateLineItem(item.id, updates)}
                onRemove={() => removeLineItem(item.id)}
                onDuplicate={() => duplicateLineItem(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {project.lineItems.length > 0 && (
        <div className="elevated-card rounded-xl p-6 border-l-4 border-l-secondary">
          <h2 className="font-heading text-lg font-semibold mb-4">Quote Summary</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Total Items" value={summary.totalItems.toString()} />
            <SummaryCard label="Total SM" value={summary.totalSm.toFixed(2)} />
            <SummaryCard label="Selling Price" value={formatCurrency(summary.sellingPrice.total)} highlight />
            <SummaryCard label="Cost" value={formatCurrency(summary.costPrice.total)} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <SummaryCard label="Profit" value={formatCurrency(summary.profit)} highlight={summary.profit > 0} />
            <SummaryCard label="Margin" value={`${summary.margin.toFixed(1)}%`} highlight={summary.margin > 0} />
          </div>
        </div>
      )}
    </div>
  );
}

function LineItemCard({
  item, index, settings, onUpdate, onRemove, onDuplicate,
}: {
  item: QuoteLineItem;
  index: number;
  settings: any;
  onUpdate: (updates: Partial<QuoteLineItem>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const itemTotal = calculateItemSelling(item, settings);

  return (
    <div className="border rounded-xl p-4 bg-card transition-all">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-left flex-1">
          <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
          <span className="font-medium text-sm">{item.type} — {item.widthMm}×{item.heightMm}mm</span>
          <span className="text-sm font-semibold text-primary ml-auto mr-4">{formatCurrency(itemTotal)}</span>
        </button>
        <div className="flex gap-1">
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
            <Input className="h-9 text-xs" value={item.supplier} onChange={e => onUpdate({ supplier: e.target.value })} placeholder="Supplier" />
          </div>
          <div>
            <Label className="text-xs">Price ({item.manufactureCurrency})</Label>
            <Input type="number" step="0.01" className="h-9 text-xs" value={item.manufacturePrice} onChange={e => onUpdate({ manufacturePrice: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label className="text-xs">Currency</Label>
            <Select value={item.manufactureCurrency} onValueChange={(v: 'GBP' | 'EUR') => onUpdate({ manufactureCurrency: v })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Uplift %</Label>
            <Input type="number" step="1" className="h-9 text-xs" value={item.uplift} onChange={e => onUpdate({ uplift: parseFloat(e.target.value) || 0 })} />
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
            <Label className="text-xs">MDF Reveal</Label>
            <Select value={item.mdfRevealType} onValueChange={(v: 'narrow' | 'wide' | 'none') => onUpdate({ mdfRevealType: v, includeMdfReveal: v !== 'none' })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="narrow">Narrow</SelectItem>
                <SelectItem value="wide">Wide</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={item.includeArchitrave} onCheckedChange={v => onUpdate({ includeArchitrave: v })} />
              Architrave
            </label>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={item.includeTrims} onCheckedChange={v => onUpdate({ includeTrims: v })} />
              Trims
            </label>
          </div>
        </div>
      )}
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
