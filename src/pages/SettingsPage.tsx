import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/pricing';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import type { PricingData } from '@/lib/types';
import { DEFAULT_PRICING } from '@/lib/context';
import { fetchGlobalPricing, saveGlobalPricing } from '@/lib/database';

const MDF_LABELS: Record<string, string> = {
  singleNarrow: 'Single · Narrow',
  sideNarrow: 'Side · Narrow',
  centralNarrow: 'Central · Narrow',
  singleWide: 'Single · Wide',
  sideWide: 'Side · Wide',
  centralWide: 'Central · Wide',
};

export default function SettingsPage() {
  const [pricing, setPricing] = useState<PricingData>(DEFAULT_PRICING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalPricing().then(p => {
      setPricing(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const update = (path: string, value: number) => {
    setPricing(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        if (obj[keys[i]] === undefined) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const handleSave = async () => {
    try {
      await saveGlobalPricing(pricing);
      toast.success('Pricing saved successfully');
    } catch {
      toast.error('Failed to save pricing');
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;

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
        {/* Uplift */}
        <div className="elevated-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Uplift (multiplier)</h2>
          <div className="space-y-2">
            {Object.entries(pricing.uplift || DEFAULT_PRICING.uplift).map(([type, val]) => (
              <EditRow key={type} label={type} value={val} onChange={v => update(`uplift.${type}`, v)} unit="×" />
            ))}
          </div>
        </div>

        {/* Installation selling */}
        <div className="elevated-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Installation — Selling</h2>
          <div className="space-y-2">
            {Object.entries(pricing.installationSelling).map(([type, price]) => (
              <EditRow key={type} label={type} value={price} onChange={v => update(`installationSelling.${type}`, v)} />
            ))}
          </div>
        </div>

        {/* Installation cost */}
        <div className="elevated-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Installation — Cost</h2>
          <div className="space-y-2">
            {Object.entries(pricing.installationCost).map(([type, price]) => (
              <EditRow key={type} label={type} value={price} onChange={v => update(`installationCost.${type}`, v)} />
            ))}
          </div>
        </div>

        {/* Making Good */}
        <div className="elevated-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Making Good — Selling</h2>
          <p className="text-xs text-muted-foreground mb-2">Internal Installation</p>
          <div className="space-y-2">
            <EditRow label="Internal MG" value={pricing.makingGoodSelling.intMkgInternal} onChange={v => update('makingGoodSelling.intMkgInternal', v)} />
            <EditRow label="External MG" value={pricing.makingGoodSelling.extMkgInternal} onChange={v => update('makingGoodSelling.extMkgInternal', v)} />
          </div>
          <p className="text-xs text-muted-foreground mb-2 mt-3">External Installation</p>
          <div className="space-y-2">
            <EditRow label="Internal MG" value={pricing.makingGoodSelling.intMkgExternal} onChange={v => update('makingGoodSelling.intMkgExternal', v)} />
            <EditRow label="External MG" value={pricing.makingGoodSelling.extMkgExternal} onChange={v => update('makingGoodSelling.extMkgExternal', v)} />
          </div>
        </div>

        <div className="elevated-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Making Good — Cost</h2>
          <p className="text-xs text-muted-foreground mb-2">Internal Installation</p>
          <div className="space-y-2">
            <EditRow label="Internal MG" value={pricing.makingGoodCost.intMkgInternal} onChange={v => update('makingGoodCost.intMkgInternal', v)} />
            <EditRow label="External MG" value={pricing.makingGoodCost.extMkgInternal} onChange={v => update('makingGoodCost.extMkgInternal', v)} />
          </div>
          <p className="text-xs text-muted-foreground mb-2 mt-3">External Installation</p>
          <div className="space-y-2">
            <EditRow label="Internal MG" value={pricing.makingGoodCost.intMkgExternal} onChange={v => update('makingGoodCost.intMkgExternal', v)} />
            <EditRow label="External MG" value={pricing.makingGoodCost.extMkgExternal} onChange={v => update('makingGoodCost.extMkgExternal', v)} />
          </div>
        </div>

        {/* MDF Reveal */}
        <div className="elevated-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">MDF Reveal — Selling</h2>
          <div className="space-y-2">
            {Object.entries(pricing.mdfSelling).map(([key, price]) => (
              <EditRow key={key} label={MDF_LABELS[key] || key} value={price} onChange={v => update(`mdfSelling.${key}`, v)} />
            ))}
          </div>
        </div>

        <div className="elevated-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">MDF Reveal — Cost</h2>
          <div className="space-y-2">
            {Object.entries(pricing.mdfCost).map(([key, price]) => (
              <EditRow key={key} label={MDF_LABELS[key] || key} value={price} onChange={v => update(`mdfCost.${key}`, v)} />
            ))}
          </div>
        </div>

        {/* Architrave */}
        <div className="elevated-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Architrave (per LM)</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground font-medium pb-1 border-b">
              <span>Type</span><span className="text-right">Selling</span><span className="text-right">Cost</span>
            </div>
            <DualEditRow label="Single" selling={pricing.architraveSelling.single} cost={pricing.architraveCost.single}
              onSelling={v => update('architraveSelling.single', v)} onCost={v => update('architraveCost.single', v)} />
            <DualEditRow label="Bay Side" selling={pricing.architraveSelling.baySide} cost={pricing.architraveCost.baySide}
              onSelling={v => update('architraveSelling.baySide', v)} onCost={v => update('architraveCost.baySide', v)} />
            <DualEditRow label="Bay Central" selling={pricing.architraveSelling.bayCentral} cost={pricing.architraveCost.bayCentral}
              onSelling={v => update('architraveSelling.bayCentral', v)} onCost={v => update('architraveCost.bayCentral', v)} />
          </div>
        </div>

        {/* Trims */}
        <div className="elevated-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Trims (per item)</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground font-medium pb-1 border-b">
              <span>Type</span><span className="text-right">Selling</span><span className="text-right">Cost</span>
            </div>
            <DualEditRow label="Single" selling={pricing.trimsSelling.single} cost={pricing.trimsCost.single}
              onSelling={v => update('trimsSelling.single', v)} onCost={v => update('trimsCost.single', v)} />
            <DualEditRow label="Bay Side" selling={pricing.trimsSelling.baySide} cost={pricing.trimsCost.baySide}
              onSelling={v => update('trimsSelling.baySide', v)} onCost={v => update('trimsCost.baySide', v)} />
            <DualEditRow label="Bay Central" selling={pricing.trimsSelling.bayCentral} cost={pricing.trimsCost.bayCentral}
              onSelling={v => update('trimsSelling.bayCentral', v)} onCost={v => update('trimsCost.bayCentral', v)} />
          </div>
        </div>

        {/* Add-ons & Logistics */}
        <div className="elevated-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Add-ons & Logistics</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground font-medium pb-1 border-b">
              <span>Item</span><span className="text-right">Selling</span><span className="text-right">Cost</span>
            </div>
            <DualEditRow label="Delivery/Stock (per SM)" selling={pricing.deliveryStockSelling} cost={pricing.deliveryStockCost}
              onSelling={v => update('deliveryStockSelling', v)} onCost={v => update('deliveryStockCost', v)} />
            <DualEditRow label="Fensa/Survey (per item)" selling={pricing.fensaSurveySelling} cost={pricing.fensaSurveyCost}
              onSelling={v => update('fensaSurveySelling', v)} onCost={v => update('fensaSurveyCost', v)} />
          </div>
        </div>

        {/* Extras */}
        <div className="elevated-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Extras & Overheads</h2>
          <div className="space-y-2">
            {Object.entries(pricing.extras).map(([name, price]) => (
              <EditRow key={name} label={name} value={price} onChange={v => update(`extras.${name}`, v)} />
            ))}
            <div className="pt-3 border-t space-y-2">
              <EditRow label="Waste Disposal (per item)" value={pricing.wasteDisposal} onChange={v => update('wasteDisposal', v)} />
              <EditRow label="Overhead / day" value={pricing.overheadPerDay} onChange={v => update('overheadPerDay', v)} />
            </div>
          </div>
        </div>

        {/* Consumables */}
        <div className="elevated-card rounded-xl p-6 lg:col-span-2">
          <h2 className="font-heading text-lg font-semibold mb-4">Consumables (per item — cost only)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {Object.entries(pricing.consumables).map(([name, price]) => (
              <div key={name} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                <span className="text-sm flex-1 truncate">{name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">£</span>
                  <Input type="number" step="0.001" className="h-7 w-20 text-xs text-right" value={price}
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

function EditRow({ label, value, onChange, unit }: { label: string; value: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm flex-1">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">{unit || '£'}</span>
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
