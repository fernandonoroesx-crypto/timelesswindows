import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/pricing';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

interface PricingData {
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

const DEFAULT_PRICING: PricingData = {
  installationSelling: {
    'Casement': 90, 'Casement Flag': 50, 'Box Sash': 150, 'Fix Sash': 125,
    'Spring Sash': 125, 'Door': 125, 'Door + Top Light': 175, 'French Door': 175, 'Patio Door': 175,
  },
  installationCost: {
    'Casement': 45, 'Casement Flag': 25, 'Box Sash': 75, 'Fix Sash': 62.5,
    'Spring Sash': 62.5, 'Door': 62.5, 'Door + Top Light': 87.5, 'French Door': 87.5, 'Patio Door': 87.5,
  },
  makingGoodSelling: { intMkgInternal: 12.50, extMkgInternal: 16.00, intMkgExternal: 8.00, extMkgExternal: 12.00 },
  makingGoodCost: { intMkgInternal: 7.00, extMkgInternal: 8.00, intMkgExternal: 4.00, extMkgExternal: 6.00 },
  architraveSelling: 6.50,
  architraveCost: 4.50,
  trimsSelling: 4.00,
  trimsCost: 1.00,
  mdfSelling: { narrow: 17.50, wide: 35.00 },
  mdfCost: { narrow: 9.00, wide: 18.00 },
  extras: { 'Recess of reveal': 75, 'Shutters': 100, 'Cut Out of work top': 125 },
  consumables: {
    'Survey': 15.00, 'Delivery Stock': 40.00, 'Carpet protection': 6.40, 'Correx': 5.25,
    'Dust Sheets': 1.20, 'Masking tape': 0.75, 'Blue paper': 0.76, 'Rubbish bag': 0.50,
    'Screws for Brackets': 0.64, 'Screws for Windows': 0.30, 'Packer': 0.70, 'Plugs': 1.15,
    'Foam': 4.20, 'DPC': 0.15, 'Silicone': 0.45, 'Caulk': 1.17,
  },
  wasteDisposal: 35.00,
  overheadPerDay: 2000.00,
};

function loadPricing(): PricingData {
  const saved = localStorage.getItem('quote-pricing');
  return saved ? { ...DEFAULT_PRICING, ...JSON.parse(saved) } : DEFAULT_PRICING;
}

export function savePricing(data: PricingData) {
  localStorage.setItem('quote-pricing', JSON.stringify(data));
}

export function getPricing(): PricingData {
  return loadPricing();
}

export default function SettingsPage() {
  const [pricing, setPricing] = useState<PricingData>(loadPricing);

  const update = (path: string, value: number) => {
    setPricing(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const handleSave = () => {
    savePricing(pricing);
    toast.success('Pricing saved successfully');
  };

  return (
    <div className="space-y-8 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Pricing Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Edit your selling and cost prices</p>
        </div>
        <Button onClick={handleSave} className="bg-primary text-primary-foreground">
          <Save className="w-4 h-4 mr-2" /> Save Pricing
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Installation selling */}
        <div className="elevated-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Installation — Selling</h2>
          <div className="space-y-2">
            {Object.entries(pricing.installationSelling).map(([type, price]) => (
              <div key={type} className="flex items-center justify-between gap-3">
                <span className="text-sm flex-1">{type}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">£</span>
                  <Input type="number" step="0.01" className="h-8 w-24 text-xs text-right" value={price}
                    onChange={e => update(`installationSelling.${type}`, parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Installation cost */}
        <div className="elevated-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Installation — Cost</h2>
          <div className="space-y-2">
            {Object.entries(pricing.installationCost).map(([type, price]) => (
              <div key={type} className="flex items-center justify-between gap-3">
                <span className="text-sm flex-1">{type}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">£</span>
                  <Input type="number" step="0.01" className="h-8 w-24 text-xs text-right" value={price}
                    onChange={e => update(`installationCost.${type}`, parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Making Good */}
        <div className="elevated-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Making Good — Selling</h2>
          <div className="space-y-2">
            <EditRow label="Internal → Int. Mkg" value={pricing.makingGoodSelling.intMkgInternal} onChange={v => update('makingGoodSelling.intMkgInternal', v)} />
            <EditRow label="Internal → Ext. Mkg" value={pricing.makingGoodSelling.extMkgInternal} onChange={v => update('makingGoodSelling.extMkgInternal', v)} />
            <EditRow label="External → Int. Mkg" value={pricing.makingGoodSelling.intMkgExternal} onChange={v => update('makingGoodSelling.intMkgExternal', v)} />
            <EditRow label="External → Ext. Mkg" value={pricing.makingGoodSelling.extMkgExternal} onChange={v => update('makingGoodSelling.extMkgExternal', v)} />
          </div>
        </div>

        <div className="elevated-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Making Good — Cost</h2>
          <div className="space-y-2">
            <EditRow label="Internal → Int. Mkg" value={pricing.makingGoodCost.intMkgInternal} onChange={v => update('makingGoodCost.intMkgInternal', v)} />
            <EditRow label="Internal → Ext. Mkg" value={pricing.makingGoodCost.extMkgInternal} onChange={v => update('makingGoodCost.extMkgInternal', v)} />
            <EditRow label="External → Int. Mkg" value={pricing.makingGoodCost.intMkgExternal} onChange={v => update('makingGoodCost.intMkgExternal', v)} />
            <EditRow label="External → Ext. Mkg" value={pricing.makingGoodCost.extMkgExternal} onChange={v => update('makingGoodCost.extMkgExternal', v)} />
          </div>
        </div>

        {/* Add-ons */}
        <div className="elevated-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Add-ons</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground font-medium pb-1 border-b">
              <span>Item</span><span className="text-right">Selling</span><span className="text-right">Cost</span>
            </div>
            <DualEditRow label="Architrave" selling={pricing.architraveSelling} cost={pricing.architraveCost}
              onSelling={v => update('architraveSelling', v)} onCost={v => update('architraveCost', v)} />
            <DualEditRow label="Trims" selling={pricing.trimsSelling} cost={pricing.trimsCost}
              onSelling={v => update('trimsSelling', v)} onCost={v => update('trimsCost', v)} />
            <DualEditRow label="MDF Narrow" selling={pricing.mdfSelling.narrow} cost={pricing.mdfCost.narrow}
              onSelling={v => update('mdfSelling.narrow', v)} onCost={v => update('mdfCost.narrow', v)} />
            <DualEditRow label="MDF Wide" selling={pricing.mdfSelling.wide} cost={pricing.mdfCost.wide}
              onSelling={v => update('mdfSelling.wide', v)} onCost={v => update('mdfCost.wide', v)} />
          </div>
        </div>

        {/* Extras */}
        <div className="elevated-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Extras</h2>
          <div className="space-y-2">
            {Object.entries(pricing.extras).map(([name, price]) => (
              <EditRow key={name} label={name} value={price} onChange={v => update(`extras.${name}`, v)} />
            ))}
            <div className="pt-3 border-t space-y-2">
              <EditRow label="Waste Disposal" value={pricing.wasteDisposal} onChange={v => update('wasteDisposal', v)} />
              <EditRow label="Overhead / day" value={pricing.overheadPerDay} onChange={v => update('overheadPerDay', v)} />
            </div>
          </div>
        </div>

        {/* Consumables */}
        <div className="elevated-card rounded-xl p-6 lg:col-span-2">
          <h2 className="font-heading text-lg font-semibold mb-4">Consumables (per item)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {Object.entries(pricing.consumables).map(([name, price]) => (
              <div key={name} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                <span className="text-sm flex-1 truncate">{name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">£</span>
                  <Input type="number" step="0.01" className="h-7 w-20 text-xs text-right" value={price}
                    onChange={e => update(`consumables.${name}`, parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Total per item: {formatCurrency(Object.values(pricing.consumables).reduce((a, b) => a + b, 0))}
          </p>
        </div>
      </div>
    </div>
  );
}

function EditRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm flex-1">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">£</span>
        <Input type="number" step="0.01" className="h-8 w-24 text-xs text-right" value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)} />
      </div>
    </div>
  );
}

function DualEditRow({ label, selling, cost, onSelling, onCost }: {
  label: string; selling: number; cost: number; onSelling: (v: number) => void; onCost: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 items-center">
      <span className="text-sm">{label}</span>
      <Input type="number" step="0.01" className="h-8 text-xs text-right" value={selling}
        onChange={e => onSelling(parseFloat(e.target.value) || 0)} />
      <Input type="number" step="0.01" className="h-8 text-xs text-right" value={cost}
        onChange={e => onCost(parseFloat(e.target.value) || 0)} />
    </div>
  );
}
