import { useState } from 'react';
import { useApp } from '@/lib/context';
import type { Client } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, UserPlus, Users, Edit2, X, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientsPage() {
  const { clients, setClients } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' });

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', address: '', notes: '' });
    setShowForm(false);
    setEditingId(null);
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
    setForm({ name: client.name, email: client.email, phone: client.phone, address: client.address, notes: client.notes });
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
          {clients.map(client => (
            <div key={client.id} className="elevated-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold truncate">{client.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {[client.email, client.phone].filter(Boolean).join(' · ') || 'No contact info'}
                </p>
                {client.address && <p className="text-xs text-muted-foreground/70 truncate">{client.address}</p>}
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
          ))}
        </div>
      )}
    </div>
  );
}
