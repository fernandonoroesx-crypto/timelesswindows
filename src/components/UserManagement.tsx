import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { UserPlus, Users, Pencil, Mail, Shield, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/lib/auth';

interface ManagedUser {
  id: string;
  email: string;
  display_name: string;
  role: UserRole | null;
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('field');
  const [inviting, setInviting] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('field');
  const [saving, setSaving] = useState(false);

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

  const openEdit = (u: ManagedUser) => {
    setEditUser(u);
    setEditName(u.display_name);
    setEditRole(u.role || 'field');
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('admin-users', {
        method: 'PATCH',
        body: { userId: editUser.id, role: editRole, displayName: editName },
      });
      if (error) throw error;
      toast.success('User updated successfully');
      setEditOpen(false);
      setEditUser(null);
      loadUsers();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update user');
    }
    setSaving(false);
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

  const roleBadge = (role: UserRole | null) => {
    const styles: Record<string, string> = {
      admin: 'bg-destructive/10 text-destructive border-destructive/20',
      manager: 'bg-primary/10 text-primary border-primary/20',
      field: 'bg-muted text-muted-foreground border-border',
    };
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[role || 'field']}`}>
        <Shield className="w-3 h-3" />
        {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'No role'}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            User Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Register new users and manage existing team members</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> Register New User
        </Button>
      </div>

      {loadingUsers ? (
        <div className="elevated-card rounded-xl p-8 text-center text-muted-foreground">Loading users…</div>
      ) : users.length === 0 ? (
        <div className="elevated-card rounded-xl p-8 text-center text-muted-foreground">No users found.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map(u => (
            <div key={u.id} className="elevated-card rounded-xl p-5 flex flex-col gap-3 group relative">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {(u.display_name || u.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{u.display_name}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="w-3 h-3 shrink-0" /> {u.email}
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => openEdit(u)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                {roleBadge(u.role)}
                <span className="text-xs text-muted-foreground">
                  Joined {new Date(u.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register / Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Register New User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="user@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">An invite email will be sent to this address</p>
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                placeholder="John Smith"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={v => setInviteRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — Full access</SelectItem>
                  <SelectItem value="manager">Manager — No settings access</SelectItem>
                  <SelectItem value="field">Field — Assigned projects only</SelectItem>
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

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Edit User
            </DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editUser.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  placeholder="John Smith"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editRole} onValueChange={v => setEditRole(v as UserRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin — Full access</SelectItem>
                    <SelectItem value="manager">Manager — No settings access</SelectItem>
                    <SelectItem value="field">Field — Assigned projects only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground pt-1">
                Joined: {new Date(editUser.created_at).toLocaleDateString()}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
