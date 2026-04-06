import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/pricing';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Users, PoundSterling } from 'lucide-react';
import { toast } from 'sonner';
import type { PricingData } from '@/lib/types';
import { DEFAULT_PRICING } from '@/lib/context';
import { useAuth } from '@/lib/auth';
import { useApp } from '@/lib/context';
import UserManagement from '@/components/UserManagement';


type SettingsCategory = 'users' | 'pricing';

export default function SettingsPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [category, setCategory] = useState<SettingsCategory>(isAdmin ? 'users' : 'pricing');
  const { globalPricing, saveGlobalPricingToDb, loading } = useApp();
  const [pricing, setPricing] = useState<PricingData>(globalPricing);

  useEffect(() => {
    setPricing(globalPricing);
  }, [globalPricing]);

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
      await saveGlobalPricingToDb(pricing);
      toast.success('Pricing saved successfully');
    } catch {
      toast.error('Failed to save pricing');
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;

  return (
    <div className="space-y-6 animate-slide-in">
      {/* ── Category Switcher ── */}
      <div className="flex items-center gap-2 border-b border-border pb-4">
        {isAdmin && (
          <button
            onClick={() => setCategory('users')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              category === 'users'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Users className="w-4 h-4" />
            Team & Users
          </button>
        )}
        <button
          onClick={() => setCategory('pricing')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            category === 'pricing'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <PoundSterling className="w-4 h-4" />
          Pricing & Costs
        </button>
      </div>

      {/* ── Users Category ── */}
      {category === 'users' && isAdmin && <UserManagement />}

      {/* ── Pricing Category ── */}
      {category === 'pricing' && (
        <Tabs defaultValue="selling" className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="selling">Selling Prices</TabsTrigger>
              <TabsTrigger value="cost">Cost Prices</TabsTrigger>
              <TabsTrigger value="general">General</TabsTrigger>
            </TabsList>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground">
              <Save className="w-4 h-4 mr-2" /> Save Pricing
            </Button>
          </div>

          {/* ── SELLING TAB ── */}
          <TabsContent value="selling">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="elevated-card rounded-xl p-6">
                <h2 className="font-heading text-lg font-semibold mb-4">Installation — Selling</h2>
                <div className="space-y-2">
                  {Object.entries(pricing.installationSelling).map(([type, price]) => (
                    <EditRow key={type} label={type} value={price} onChange={v => update(`installationSelling.${type}`, v)} />
                  ))}
                </div>
              </div>

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
                <h2 className="font-heading text-lg font-semibold mb-4">MDF Reveal — Selling (per LM)</h2>
                <p className="text-xs text-muted-foreground mb-2">Narrow</p>
                <div className="space-y-2">
                  <EditRow label="Single" value={pricing.mdfSelling?.narrow?.single ?? 0} onChange={v => update('mdfSelling.narrow.single', v)} />
                  <EditRow label="Bay Side" value={pricing.mdfSelling?.narrow?.baySide ?? 0} onChange={v => update('mdfSelling.narrow.baySide', v)} />
                  <EditRow label="Bay Central" value={pricing.mdfSelling?.narrow?.bayCentral ?? 0} onChange={v => update('mdfSelling.narrow.bayCentral', v)} />
                </div>
                <p className="text-xs text-muted-foreground mb-2 mt-3">Wide</p>
                <div className="space-y-2">
                  <EditRow label="Single" value={pricing.mdfSelling?.wide?.single ?? 0} onChange={v => update('mdfSelling.wide.single', v)} />
                  <EditRow label="Bay Side" value={pricing.mdfSelling?.wide?.baySide ?? 0} onChange={v => update('mdfSelling.wide.baySide', v)} />
                  <EditRow label="Bay Central" value={pricing.mdfSelling?.wide?.bayCentral ?? 0} onChange={v => update('mdfSelling.wide.bayCentral', v)} />
                </div>
              </div>

              <div className="elevated-card rounded-xl p-6">
                <h2 className="font-heading text-lg font-semibold mb-4">Architrave — Selling (per LM)</h2>
                <div className="space-y-2">
                  <EditRow label="Single" value={pricing.architraveSelling.single} onChange={v => update('architraveSelling.single', v)} />
                  <EditRow label="Bay Side" value={pricing.architraveSelling.baySide} onChange={v => update('architraveSelling.baySide', v)} />
                  <EditRow label="Bay Central" value={pricing.architraveSelling.bayCentral} onChange={v => update('architraveSelling.bayCentral', v)} />
                </div>
              </div>

              <div className="elevated-card rounded-xl p-6">
                <h2 className="font-heading text-lg font-semibold mb-4">Trims — Selling (per item)</h2>
                <div className="space-y-2">
                  <EditRow label="Single" value={pricing.trimsSelling.single} onChange={v => update('trimsSelling.single', v)} />
                  <EditRow label="Bay Side" value={pricing.trimsSelling.baySide} onChange={v => update('trimsSelling.baySide', v)} />
                  <EditRow label="Bay Central" value={pricing.trimsSelling.bayCentral} onChange={v => update('trimsSelling.bayCentral', v)} />
                </div>
              </div>

            </div>
          </TabsContent>

          {/* ── COST TAB ── */}
          <TabsContent value="cost">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="elevated-card rounded-xl p-6">
                <h2 className="font-heading text-lg font-semibold mb-4">Installation — Cost</h2>
                <div className="space-y-2">
                  {Object.entries(pricing.installationCost).map(([type, price]) => (
                    <EditRow key={type} label={type} value={price} onChange={v => update(`installationCost.${type}`, v)} />
                  ))}
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

              <div className="elevated-card rounded-xl p-6">
                <h2 className="font-heading text-lg font-semibold mb-4">MDF Reveal — Cost (per LM)</h2>
                <p className="text-xs text-muted-foreground mb-2">Narrow</p>
                <div className="space-y-2">
                  <EditRow label="Single" value={pricing.mdfCost?.narrow?.single ?? 0} onChange={v => update('mdfCost.narrow.single', v)} />
                  <EditRow label="Bay Side" value={pricing.mdfCost?.narrow?.baySide ?? 0} onChange={v => update('mdfCost.narrow.baySide', v)} />
                  <EditRow label="Bay Central" value={pricing.mdfCost?.narrow?.bayCentral ?? 0} onChange={v => update('mdfCost.narrow.bayCentral', v)} />
                </div>
                <p className="text-xs text-muted-foreground mb-2 mt-3">Wide</p>
                <div className="space-y-2">
                  <EditRow label="Single" value={pricing.mdfCost?.wide?.single ?? 0} onChange={v => update('mdfCost.wide.single', v)} />
                  <EditRow label="Bay Side" value={pricing.mdfCost?.wide?.baySide ?? 0} onChange={v => update('mdfCost.wide.baySide', v)} />
                  <EditRow label="Bay Central" value={pricing.mdfCost?.wide?.bayCentral ?? 0} onChange={v => update('mdfCost.wide.bayCentral', v)} />
                </div>
              </div>

              <div className="elevated-card rounded-xl p-6">
                <h2 className="font-heading text-lg font-semibold mb-4">Architrave — Cost (per LM)</h2>
                <div className="space-y-2">
                  <EditRow label="Single" value={pricing.architraveCost.single} onChange={v => update('architraveCost.single', v)} />
                  <EditRow label="Bay Side" value={pricing.architraveCost.baySide} onChange={v => update('architraveCost.baySide', v)} />
                  <EditRow label="Bay Central" value={pricing.architraveCost.bayCentral} onChange={v => update('architraveCost.bayCentral', v)} />
                </div>
              </div>

              <div className="elevated-card rounded-xl p-6">
                <h2 className="font-heading text-lg font-semibold mb-4">Trims — Cost (per item)</h2>
                <div className="space-y-2">
                  <EditRow label="Single" value={pricing.trimsCost.single} onChange={v => update('trimsCost.single', v)} />
                  <EditRow label="Bay Side" value={pricing.trimsCost.baySide} onChange={v => update('trimsCost.baySide', v)} />
                  <EditRow label="Bay Central" value={pricing.trimsCost.bayCentral} onChange={v => update('trimsCost.bayCentral', v)} />
                </div>
              </div>


              <div className="elevated-card rounded-xl p-6">
                <h2 className="font-heading text-lg font-semibold mb-4">Delivery & FENSA — Cost</h2>
                <div className="space-y-2">
                  <EditRow label="Delivery/Stock (per SM)" value={pricing.deliveryStockCost} onChange={v => update('deliveryStockCost', v)} />
                  <EditRow label="FENSA/Survey (per item)" value={pricing.fensaSurveyCost} onChange={v => update('fensaSurveyCost', v)} />
                </div>
              </div>

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
          </TabsContent>

          {/* ── GENERAL TAB ── */}
          <TabsContent value="general">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="elevated-card rounded-xl p-6">
                <h2 className="font-heading text-lg font-semibold mb-4">Uplift (multiplier)</h2>
                <div className="space-y-2">
                  {Object.entries(pricing.uplift || DEFAULT_PRICING.uplift).map(([type, val]) => (
                    <EditRow key={type} label={type} value={val} onChange={v => update(`uplift.${type}`, v)} unit="×" />
                  ))}
                </div>
              </div>

              <div className="elevated-card rounded-xl p-6">
                <h2 className="font-heading text-lg font-semibold mb-4">Extras & Overheads</h2>
                <div className="space-y-2">
                  {Object.entries(pricing.extras).map(([name, price]) => (
                    <EditRow key={name} label={name} value={price} onChange={v => update(`extras.${name}`, v)} />
                  ))}
                  <div className="pt-3 border-t space-y-2">
                    <EditRow label="Waste Disposal (per item)" value={pricing.wasteDisposal} onChange={v => update('wasteDisposal', v)} />
                     <EditRow label="Overhead / day" value={pricing.overheadPerDay} onChange={v => update('overheadPerDay', v)} />
                     <EditRow label="Overhead per item rate" value={pricing.overheadPerItemRate ?? 0.1} onChange={v => update('overheadPerItemRate', v)} unit="×" />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* ─── Reusable edit rows ─── */
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
