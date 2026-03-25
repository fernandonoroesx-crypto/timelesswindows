import { Input } from '@/components/ui/input';
import type { PricingData } from '@/lib/types';

interface PricingEditorProps {
  pricing: PricingData;
  onUpdate: (path: string, value: number) => void;
  compact?: boolean;
  sellingOnly?: boolean;
}

export default function PricingEditor({ pricing, onUpdate, compact, sellingOnly }: PricingEditorProps) {
  const cardClass = compact ? "border rounded-lg p-4" : "elevated-card rounded-xl p-6";

  return (
    <div className={`grid gap-4 ${compact ? 'lg:grid-cols-2' : 'lg:grid-cols-2 gap-6'}`}>
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
      <div className={cardClass}>
        <h3 className="font-heading text-sm font-semibold mb-3">Making Good{sellingOnly ? '' : ' — Selling'}</h3>
        <div className="space-y-2">
          <EditRow label="Internal → Int. Mkg" value={pricing.makingGoodSelling.intMkgInternal} path="makingGoodSelling.intMkgInternal" onUpdate={onUpdate} />
          <EditRow label="Internal → Ext. Mkg" value={pricing.makingGoodSelling.extMkgInternal} path="makingGoodSelling.extMkgInternal" onUpdate={onUpdate} />
          <EditRow label="External → Int. Mkg" value={pricing.makingGoodSelling.intMkgExternal} path="makingGoodSelling.intMkgExternal" onUpdate={onUpdate} />
          <EditRow label="External → Ext. Mkg" value={pricing.makingGoodSelling.extMkgExternal} path="makingGoodSelling.extMkgExternal" onUpdate={onUpdate} />
        </div>
      </div>
      {!sellingOnly && (
        <div className={cardClass}>
          <h3 className="font-heading text-sm font-semibold mb-3">Making Good — Cost</h3>
          <div className="space-y-2">
            <EditRow label="Internal → Int. Mkg" value={pricing.makingGoodCost.intMkgInternal} path="makingGoodCost.intMkgInternal" onUpdate={onUpdate} />
            <EditRow label="Internal → Ext. Mkg" value={pricing.makingGoodCost.extMkgInternal} path="makingGoodCost.extMkgInternal" onUpdate={onUpdate} />
            <EditRow label="External → Int. Mkg" value={pricing.makingGoodCost.intMkgExternal} path="makingGoodCost.intMkgExternal" onUpdate={onUpdate} />
            <EditRow label="External → Ext. Mkg" value={pricing.makingGoodCost.extMkgExternal} path="makingGoodCost.extMkgExternal" onUpdate={onUpdate} />
          </div>
        </div>
      )}
      <div className={cardClass}>
        <h3 className="font-heading text-sm font-semibold mb-3">Add-ons & Extras</h3>
        <div className="space-y-2">
          <EditRow label="Architrave" value={pricing.architraveSelling} path="architraveSelling" onUpdate={onUpdate} />
          {!sellingOnly && <EditRow label="Architrave (cost)" value={pricing.architraveCost} path="architraveCost" onUpdate={onUpdate} />}
          <EditRow label="Trims" value={pricing.trimsSelling} path="trimsSelling" onUpdate={onUpdate} />
          {!sellingOnly && <EditRow label="Trims (cost)" value={pricing.trimsCost} path="trimsCost" onUpdate={onUpdate} />}
          <EditRow label="MDF Narrow" value={pricing.mdfSelling.narrow} path="mdfSelling.narrow" onUpdate={onUpdate} />
          {!sellingOnly && <EditRow label="MDF Narrow (cost)" value={pricing.mdfCost.narrow} path="mdfCost.narrow" onUpdate={onUpdate} />}
          <EditRow label="MDF Wide" value={pricing.mdfSelling.wide} path="mdfSelling.wide" onUpdate={onUpdate} />
          {!sellingOnly && <EditRow label="MDF Wide (cost)" value={pricing.mdfCost.wide} path="mdfCost.wide" onUpdate={onUpdate} />}
        </div>
      </div>
      <div className={cardClass}>
        <h3 className="font-heading text-sm font-semibold mb-3">{sellingOnly ? 'Extras' : 'Other Costs'}</h3>
        <div className="space-y-2">
          {Object.entries(pricing.extras).map(([name, price]) => (
            <EditRow key={name} label={name} value={price} path={`extras.${name}`} onUpdate={onUpdate} />
          ))}
          {!sellingOnly && (
            <div className="pt-2 border-t space-y-2">
              <EditRow label="Waste Disposal" value={pricing.wasteDisposal} path="wasteDisposal" onUpdate={onUpdate} />
              <EditRow label="Overhead / day" value={pricing.overheadPerDay} path="overheadPerDay" onUpdate={onUpdate} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
