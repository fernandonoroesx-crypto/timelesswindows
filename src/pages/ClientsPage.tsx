import { useState } from 'react';
import { useApp } from '@/lib/context';
import { DEFAULT_PRICING } from '@/lib/context';
import type { Client, ProjectManager, PricingData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, UserPlus, Users, Edit2, X, Check, UserCog, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import PricingEditor from '@/components/PricingEditor';

export default function ClientsPage() {
  const { clients, setClients } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', notes: '', projectManagers: [] as ProjectManager[] });
  const [pmForm, setPmForm] = useState({ name: '', email: '', phone: '' });
  const [editingPricingPmId, setEditingPricingPmId] = useState<string | null>(null);

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', address: '', notes: '', projectManagers: [] });
    setPmForm({ name: '', email: '', phone: '' });
    setShowForm(false);
    setEditingId(null);
    setEditingPricingPmId(null);
  };

  const handleAddPM = () => {
    if (!pmForm.name.trim()) {
      toast.error('Manager name is required');
      return;
    }
    const pm: ProjectManager = { id: crypto.randomUUID(), ...pmForm };
    setForm(f => ({ ...f, projectManagers: [...f.projectManagers, pm] }));
    setPmForm({ name: '', email: '', phone: '' });
  };

  const handleRemovePM = (id: string) => {
    setForm(f => ({ ...f, projectManagers: f.projectManagers.filter(pm => pm.id !== id) }));
    if (editingPricingPmId === id) setEditingPricingPmId(null);
  };

  const handleTogglePMPricing = (pmId: string) => {
    setEditingPricingPmId(prev => prev === pmId ? null : pmId);
  };

  const handleEnablePMPricing = (pmId: string) => {
    setForm(f => ({
      ...f,
      projectManagers: f.projectManagers.map(pm =>
        pm.id === pmId && !pm.pricing ? { ...pm, pricing: { ...DEFAULT_PRICING } } : pm
      ),
    }));
    setEditingPricingPmId(pmId);
  };

  const handleClearPMPricing = (pmId: string) => {
    setForm(f => ({
      ...f,
      projectManagers: f.projectManagers.map(pm =>
        pm.id === pmId ? { ...pm, pricing: undefined } : pm
      ),
    }));
    setEditingPricingPmId(null);
  };

  const handleUpdatePMPricing = (pmId: string, path: string, value: number) => {
    setForm(f => ({
      ...f,
      projectManagers: f.projectManagers.map(pm => {
        if (pm.id !== pmId || !pm.pricing) return pm;
        const next = JSON.parse(JSON.stringify(pm.pricing));
        const keys = path.split('.');
        let obj = next;
        for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
        obj[keys[keys.length - 1]] = value;
        return { ...pm, pricing: next };
      }),
    }));
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Client name is required');
      return;
    }

    if (editingId) {
      setClients(prev =>
        prev.map(c => c.id === editingId ? { ...c, ...form } : c)
      );
      toast.success('Client updated');
    } else {
      const newClient: Client = {
        id: crypto.randomUUID(),
        ...form,
        createdAt: new Date().toISOString(),
      };
      setClients(prev => [...prev, newClient]);
      toast.success('Client added');
    }
    resetForm();
  };

  const handleEdit = (client: Client) => {
    setForm({
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      notes: client.notes,
      projectManagers: client.projectManagers || [],
    });
    setEditingId(client.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    toast.success('Client removed');
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your client list</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <UserPlus className="w-4 h-4 mr-2" /> Add Client
        </Button>
      </div>

      {showForm && (
        <div className="elevated-card rounded-xl p-6 border-l-4 border-l-secondary">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold">{editingId ? 'Edit Client' : 'New Client'}</h2>
            <Button variant="ghost" size="sm" onClick={resetForm}><X className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Client name" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+44 ..." />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Address" />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes..." rows={2} />
            </div>
          </div>

          {/* Project Managers Section */}
          <div className="mt-6 border-t border-border pt-4">
            <h3 className="font-heading text-sm font-semibold flex items-center gap-2 mb-3">
              <UserCog className="w-4 h-4 text-muted-foreground" /> Project Managers
            </h3>

            {form.projectManagers.length > 0 && (
              <div className="space-y-2 mb-3">
                {form.projectManagers.map(pm => (
                  <div key={pm.id}>
                    <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-3 py-2 text-sm">
                      <span className="font-medium flex-1 truncate">{pm.name}</span>
                      <span className="text-muted-foreground truncate hidden sm:inline">{pm.email}</span>
                      <span className="text-muted-foreground truncate hidden sm:inline">{pm.phone}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 w-7 p-0 ${pm.pricing ? 'text-primary' : 'text-muted-foreground'}`}
                        onClick={() => pm.pricing ? handleTogglePMPricing(pm.id) : handleEnablePMPricing(pm.id)}
                        title={pm.pricing ? 'Edit pricing' : 'Add custom pricing'}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleRemovePM(pm.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* PM Pricing Editor */}
                    {editingPricingPmId === pm.id && (
                      <div className="mt-2 ml-4 border-l-2 border-l-primary/30 pl-4 pb-2">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-semibold text-primary flex items-center gap-1.5">
                            <SlidersHorizontal className="w-3 h-3" />
                            Custom Pricing for {pm.name}
                          </h4>
                          <div className="flex gap-1">
                            {pm.pricing && (
                              <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => handleClearPMPricing(pm.id)}>
                                Remove Pricing
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditingPricingPmId(null)}>
                              <ChevronUp className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        {pm.pricing && (
                          <PricingEditor pricing={pm.pricing} onUpdate={(path, value) => handleUpdatePMPricing(pm.id, path, value)} compact />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={pmForm.name}
                onChange={e => setPmForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Manager name"
                className="flex-1"
              />
              <Input
                value={pmForm.email}
                onChange={e => setPmForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Email"
                className="flex-1"
              />
              <Input
                value={pmForm.phone}
                onChange={e => setPmForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="Phone"
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={handleAddPM} className="shrink-0">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={handleSave} className="bg-primary text-primary-foreground">
              <Check className="w-4 h-4 mr-2" /> {editingId ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {clients.length === 0 && !showForm ? (
        <div className="elevated-card rounded-xl p-12 text-center">
          <Users className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No clients registered yet</p>
          <Button onClick={() => setShowForm(true)} variant="outline">Add your first client</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {clients.map(client => {
            const pms = client.projectManagers || [];
            return (
              <div key={client.id} className="elevated-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold truncate">{client.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {[client.email, client.phone].filter(Boolean).join(' · ') || 'No contact info'}
                  </p>
                  {client.address && <p className="text-xs text-muted-foreground/70 truncate">{client.address}</p>}
                  {pms.length > 0 && (
                    <p className="text-xs text-accent-foreground/70 mt-1 flex items-center gap-1">
                      <UserCog className="w-3 h-3" /> PM: {pms.map(pm => (
                        <span key={pm.id}>
                          {pm.name}{pm.pricing ? ' ⚙' : ''}
                        </span>
                      )).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, ', ', curr], [] as React.ReactNode[])}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(client)}>
                    <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(client.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
