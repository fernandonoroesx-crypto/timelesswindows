import { formatCurrency, WINDOW_INSTALLATION_SELLING, TRIMS_SELLING, TRIMS_COST, MDF_SELLING, MDF_COST, ARCHITRAVE_SELLING, ARCHITRAVE_COST, EXTRAS_SELLING, WASTE_DISPOSAL, CONSUMABLES, OVERHEAD_PER_DAY } from '@/lib/pricing';

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-slide-in">
      <div>
        <h1 className="font-heading text-2xl font-bold">Pricing Reference</h1>
        <p className="text-muted-foreground text-sm mt-1">Current pricing data loaded from your spreadsheet</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Installation prices */}
        <div className="elevated-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Installation (Selling)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2">Type</th>
                <th className="text-right py-2">Price</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(WINDOW_INSTALLATION_SELLING).map(([type, price]) => (
                <tr key={type} className="border-b last:border-0">
                  <td className="py-2">{type}</td>
                  <td className="text-right py-2 font-medium">{formatCurrency(price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Extras */}
        <div className="elevated-card rounded-xl p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Extras & Add-ons</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2">Item</th>
                <th className="text-right py-2">Selling</th>
                <th className="text-right py-2">Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="py-2">Architrave</td><td className="text-right font-medium">{formatCurrency(ARCHITRAVE_SELLING)}</td><td className="text-right">{formatCurrency(ARCHITRAVE_COST)}</td></tr>
              <tr className="border-b"><td className="py-2">Trims</td><td className="text-right font-medium">{formatCurrency(TRIMS_SELLING)}</td><td className="text-right">{formatCurrency(TRIMS_COST)}</td></tr>
              <tr className="border-b"><td className="py-2">MDF Narrow</td><td className="text-right font-medium">{formatCurrency(MDF_SELLING.narrow)}</td><td className="text-right">{formatCurrency(MDF_COST.narrow)}</td></tr>
              <tr className="border-b"><td className="py-2">MDF Wide</td><td className="text-right font-medium">{formatCurrency(MDF_SELLING.wide)}</td><td className="text-right">{formatCurrency(MDF_COST.wide)}</td></tr>
              {Object.entries(EXTRAS_SELLING).map(([name, price]) => (
                <tr key={name} className="border-b last:border-0">
                  <td className="py-2">{name}</td>
                  <td className="text-right font-medium">{formatCurrency(price)}</td>
                  <td className="text-right">{formatCurrency(price)}</td>
                </tr>
              ))}
              <tr className="border-b"><td className="py-2">Waste Disposal</td><td className="text-right font-medium" colSpan={2}>{formatCurrency(WASTE_DISPOSAL)}</td></tr>
              <tr><td className="py-2 font-semibold">Overhead / day</td><td className="text-right font-semibold" colSpan={2}>{formatCurrency(OVERHEAD_PER_DAY)}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Consumables */}
        <div className="elevated-card rounded-xl p-6 lg:col-span-2">
          <h2 className="font-heading text-lg font-semibold mb-4">Consumables (per item)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(CONSUMABLES).map(([name, price]) => (
              <div key={name} className="flex justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
                <span>{name}</span>
                <span className="font-medium">{formatCurrency(price)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
