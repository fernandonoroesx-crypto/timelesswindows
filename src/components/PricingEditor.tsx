import { Input } from '@/components/ui/input';
import type { PricingData } from '@/lib/types';

interface PricingEditorProps {
  pricing: PricingData;
  onUpdate: (path: string, value: number) => void;
  compact?: boolean;
  sellingOnly?: boolean;
}

function EditRow({ label, value, path, onUpdate, unit }: { label: string; value: number; path: string; onUpdate: (path: string, value: number) => void; unit?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm flex-1">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">{unit || '£'}</span>
        <Input type="number" step="0.01" className="h-8 w-24 text-xs text-right" value={value}
          onChange={e => onUpdate(path, parseFloat(e.target.value) || 0)} />
      </div>
    </div>
  );
}

const ARCH_TRIM_LABELS: Record<string, string> = {
  single: 'Single',
  baySide: 'Bay Side',
  bayCentral: 'Bay Central',
};

const MDF_LABELS: Record<string, string> = {
  narrow: 'Narrow',
  wide: 'Wide',
};

export default function PricingEditor({ pricing, onUpdate, compact, sellingOnly }: PricingEditorProps) {
  const cardClass = compact ? "border rounded-lg p-4" : "elevated-card rounded-xl p-6";

  return (
    <div className={`grid gap-4 ${compact ? 'lg:grid-cols-2' : 'lg:grid-cols-2 gap-6'}`}>
      {/* Uplift */}
      <div className={cardClass}>
        <h3 className="font-heading text-sm font-semibold mb-3">Uplift % (per type)</h3>
        <div className="space-y-2">
          {Object.entries(pricing.uplift).map(([type, pct]) => (
            <EditRow key={type} label={type} value={pct} path={`uplift.${type}`} onUpdate={onUpdate} unit="%" />
          ))}
        </div>
      </div>

      {/* Installation */}
      <div className={cardClass}>
        <h3 className="font-heading text-sm font-semibold mb-3">Installation{sellingOnly ? '' : ' — Selling'}</h3>
        <div className="space-y-2">
          {Object.entries(pricing.installationSelling).map(([type, price]) => (
            <EditRow key={type} label={type} value={price} path={`installationSelling.${type}`} onUpdate={onUpdate} />
          ))}
        </div>
      </div>
      {!sellingOnly && (
        <div className={cardClass}>
          <h3 className="font-heading text-sm font-semibold mb-3">Installation — Cost</h3>
          <div className="space-y-2">
            {Object.entries(pricing.installationCost).map(([type, price]) => (
              <EditRow key={type} label={type} value={price} path={`installationCost.${type}`} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      {/* Making Good */}
      <div className={cardClass}>
        <h3 className="font-heading text-sm font-semibold mb-3">Making Good{sellingOnly ? '' : ' — Selling'}</h3>
        <p className="text-xs text-muted-foreground mb-2">Internal Installation</p>
        <div className="space-y-2">
          <EditRow label="Internal MG" value={pricing.makingGoodSelling.intMkgInternal} path="makingGoodSelling.intMkgInternal" onUpdate={onUpdate} />
          <EditRow label="External MG" value={pricing.makingGoodSelling.extMkgInternal} path="makingGoodSelling.extMkgInternal" onUpdate={onUpdate} />
        </div>
        <p className="text-xs text-muted-foreground mb-2 mt-3">External Installation</p>
        <div className="space-y-2">
          <EditRow label="Internal MG" value={pricing.makingGoodSelling.intMkgExternal} path="makingGoodSelling.intMkgExternal" onUpdate={onUpdate} />
          <EditRow label="External MG" value={pricing.makingGoodSelling.extMkgExternal} path="makingGoodSelling.extMkgExternal" onUpdate={onUpdate} />
        </div>
      </div>
      {!sellingOnly && (
        <div className={cardClass}>
          <h3 className="font-heading text-sm font-semibold mb-3">Making Good — Cost</h3>
          <p className="text-xs text-muted-foreground mb-2">Internal Installation</p>
          <div className="space-y-2">
            <EditRow label="Internal MG" value={pricing.makingGoodCost.intMkgInternal} path="makingGoodCost.intMkgInternal" onUpdate={onUpdate} />
            <EditRow label="External MG" value={pricing.makingGoodCost.extMkgInternal} path="makingGoodCost.extMkgInternal" onUpdate={onUpdate} />
          </div>
          <p className="text-xs text-muted-foreground mb-2 mt-3">External Installation</p>
          <div className="space-y-2">
            <EditRow label="Internal MG" value={pricing.makingGoodCost.intMkgExternal} path="makingGoodCost.intMkgExternal" onUpdate={onUpdate} />
            <EditRow label="External MG" value={pricing.makingGoodCost.extMkgExternal} path="makingGoodCost.extMkgExternal" onUpdate={onUpdate} />
          </div>
        </div>
      )}

      {/* Architrave */}
      <div className={cardClass}>
        <h3 className="font-heading text-sm font-semibold mb-3">Architrave (per LM){sellingOnly ? '' : ' — Selling'}</h3>
        <div className="space-y-2">
          {Object.entries(pricing.architraveSelling).map(([key, price]) => (
            <EditRow key={key} label={ARCH_TRIM_LABELS[key] || key} value={price} path={`architraveSelling.${key}`} onUpdate={onUpdate} />
          ))}
        </div>
      </div>
      {!sellingOnly && (
        <div className={cardClass}>
          <h3 className="font-heading text-sm font-semibold mb-3">Architrave (per LM) — Cost</h3>
          <div className="space-y-2">
            {Object.entries(pricing.architraveCost).map(([key, price]) => (
              <EditRow key={key} label={ARCH_TRIM_LABELS[key] || key} value={price} path={`architraveCost.${key}`} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      {/* Trims */}
      <div className={cardClass}>
        <h3 className="font-heading text-sm font-semibold mb-3">Trims (per item){sellingOnly ? '' : ' — Selling'}</h3>
        <div className="space-y-2">
          {Object.entries(pricing.trimsSelling).map(([key, price]) => (
            <EditRow key={key} label={ARCH_TRIM_LABELS[key] || key} value={price} path={`trimsSelling.${key}`} onUpdate={onUpdate} />
          ))}
        </div>
      </div>
      {!sellingOnly && (
        <div className={cardClass}>
          <h3 className="font-heading text-sm font-semibold mb-3">Trims (per item) — Cost</h3>
          <div className="space-y-2">
            {Object.entries(pricing.trimsCost).map(([key, price]) => (
              <EditRow key={key} label={ARCH_TRIM_LABELS[key] || key} value={price} path={`trimsCost.${key}`} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      {/* MDF Reveal */}
      <div className={cardClass}>
        <h3 className="font-heading text-sm font-semibold mb-3">MDF Reveal{sellingOnly ? '' : ' — Selling'}</h3>
        <div className="space-y-2">
          {Object.entries(pricing.mdfSelling).map(([key, price]) => (
            <EditRow key={key} label={MDF_LABELS[key] || key} value={price} path={`mdfSelling.${key}`} onUpdate={onUpdate} />
          ))}
        </div>
      </div>
      {!sellingOnly && (
        <div className={cardClass}>
          <h3 className="font-heading text-sm font-semibold mb-3">MDF Reveal — Cost</h3>
          <div className="space-y-2">
            {Object.entries(pricing.mdfCost).map(([key, price]) => (
              <EditRow key={key} label={MDF_LABELS[key] || key} value={price} path={`mdfCost.${key}`} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      {/* Add-ons & Logistics */}
      <div className={cardClass}>
        <h3 className="font-heading text-sm font-semibold mb-3">Add-ons & Logistics</h3>
        <div className="space-y-2">
          <EditRow label="Delivery/Stock (per SM)" value={pricing.deliveryStockSelling} path="deliveryStockSelling" onUpdate={onUpdate} />
          {!sellingOnly && <EditRow label="Delivery/Stock cost (per SM)" value={pricing.deliveryStockCost} path="deliveryStockCost" onUpdate={onUpdate} />}
          <EditRow label="Fensa/Survey (per item)" value={pricing.fensaSurveySelling} path="fensaSurveySelling" onUpdate={onUpdate} />
          {!sellingOnly && <EditRow label="Fensa/Survey cost (per item)" value={pricing.fensaSurveyCost} path="fensaSurveyCost" onUpdate={onUpdate} />}
        </div>
      </div>

      {/* Extras & Other */}
      <div className={cardClass}>
        <h3 className="font-heading text-sm font-semibold mb-3">{sellingOnly ? 'Extras' : 'Other Costs'}</h3>
        <div className="space-y-2">
          {Object.entries(pricing.extras).map(([name, price]) => (
            <EditRow key={name} label={name} value={price} path={`extras.${name}`} onUpdate={onUpdate} />
          ))}
          {!sellingOnly && (
            <div className="pt-2 border-t space-y-2">
              <EditRow label="Waste Disposal (per item)" value={pricing.wasteDisposal} path="wasteDisposal" onUpdate={onUpdate} />
              <EditRow label="Overhead / day" value={pricing.overheadPerDay} path="overheadPerDay" onUpdate={onUpdate} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
