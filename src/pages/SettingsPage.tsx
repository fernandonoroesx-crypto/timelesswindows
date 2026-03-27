import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/pricing';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { PricingData } from '@/lib/types';
import { DEFAULT_PRICING } from '@/lib/context';
import { fetchGlobalPricing, saveGlobalPricing } from '@/lib/database';
import { useAuth, type UserRole } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const MDF_LABELS: Record<string, string> = {
  singleNarrow: 'Single · Narrow',
  sideNarrow: 'Side · Narrow',
  centralNarrow: 'Central · Narrow',
  singleWide: 'Single · Wide',
  sideWide: 'Side · Wide',
  centralWide: 'Central · Wide',
};

interface ManagedUser {
  id: string;
  email: string;
  display_name: string;
  role: UserRole | null;
  created_at: string;
}

export default function SettingsPage() {
  const { role } = useAuth();
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
      {role === 'admin' && <UserManagement />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Pricing Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Edit your selling and cost prices</p>
        </div>
        <Button onClick={handleSave} className="bg-primary text-primary-foreground">
          <Save className="w-4 h-4 mr-2" /> Save Pricing
        </Button>
      </div>

      <Tabs defaultValue="selling" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="selling">Selling Prices</TabsTrigger>
          <TabsTrigger value="cost">Cost Prices</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>

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
              <h2 className="font-heading text-lg font-semibold mb-4">MDF Reveal — Selling</h2>
              <div className="space-y-2">
                {Object.entries(pricing.mdfSelling).map(([key, price]) => (
                  <EditRow key={key} label={MDF_LABELS[key] || key} value={price} onChange={v => update(`mdfSelling.${key}`, v)} />
                ))}
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

            <div className="elevated-card rounded-xl p-6">
              <h2 className="font-heading text-lg font-semibold mb-4">Delivery & Fensa — Selling</h2>
              <div className="space-y-2">
                <EditRow label="Delivery/Stock (per SM)" value={pricing.deliveryStockSelling} onChange={v => update('deliveryStockSelling', v)} />
                <EditRow label="Fensa/Survey (per item)" value={pricing.fensaSurveySelling} onChange={v => update('fensaSurveySelling', v)} />
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
              <h2 className="font-heading text-lg font-semibold mb-4">MDF Reveal — Cost</h2>
              <div className="space-y-2">
                {Object.entries(pricing.mdfCost).map(([key, price]) => (
                  <EditRow key={key} label={MDF_LABELS[key] || key} value={price} onChange={v => update(`mdfCost.${key}`, v)} />
                ))}
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
              <h2 className="font-heading text-lg font-semibold mb-4">Delivery & Fensa — Cost</h2>
              <div className="space-y-2">
                <EditRow label="Delivery/Stock (per SM)" value={pricing.deliveryStockCost} onChange={v => update('deliveryStockCost', v)} />
                <EditRow label="Fensa/Survey (per item)" value={pricing.fensaSurveyCost} onChange={v => update('fensaSurveyCost', v)} />
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
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── User Management Section ─── */
function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('field');
  const [inviting, setInviting] = useState(false);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', { method: 'GET' });
      if (error) throw error;
      setUsers(data || []);
    } catch (e) {
      console.error('Failed to load users:', e);
    }
    setLoadingUsers(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const { error } = await supabase.functions.invoke('admin-users', {
        method: 'POST',
        body: { email: inviteEmail, displayName: inviteName, role: inviteRole },
      });
      if (error) throw error;
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('field');
      loadUsers();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to invite user');
    }
    setInviting(false);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase.functions.invoke('admin-users', {
        method: 'PATCH',
        body: { userId, role: newRole },
      });
      if (error) throw error;
      toast.success('Role updated');
      loadUsers();
    } catch {
      toast.error('Failed to update role');
    }
  };

  return (
    <div className="elevated-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold">User Management</h2>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> Invite User
        </Button>
      </div>

      {loadingUsers ? (
        <p className="text-sm text-muted-foreground">Loading users…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-2">{u.display_name}</td>
                  <td className="py-2 text-muted-foreground">{u.email}</td>
                  <td className="py-2">
                    <Select value={u.role || ''} onValueChange={(v) => handleRoleChange(u.id, v as UserRole)}>
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue placeholder="No role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="field">Field</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input placeholder="user@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input placeholder="John Smith" value={inviteName} onChange={e => setInviteName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={v => setInviteRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="field">Field</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
              {inviting ? 'Sending…' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
