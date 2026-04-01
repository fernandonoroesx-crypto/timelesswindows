import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  UserPlus, Users, Pencil, Mail, Shield, User, KeyRound,
  ShieldCheck, Briefcase, HardHat, Calendar, MoreVertical, RefreshCw, Eye, EyeOff,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const ROLE_CONFIG: Record<string, { label: string; description: string; icon: typeof Shield; color: string; bg: string; border: string }> = {
  admin: {
    label: 'Admin',
    description: 'Full access',
    icon: ShieldCheck,
    color: 'text-secondary',
    bg: 'bg-secondary/10',
    border: 'border-secondary/25',
  },
  manager: {
    label: 'Manager',
    description: 'No settings',
    icon: Briefcase,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
  },
  field: {
    label: 'Field',
    description: 'Projects only',
    icon: HardHat,
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/20',
  },
};

export default function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('field');
  const [inviting, setInviting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('field');
  const [editPassword, setEditPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    setEditPassword('');
    setShowPassword(false);
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

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.display_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const roleCounts = users.reduce((acc, u) => {
    const r = u.role || 'none';
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getInitials = (name: string, email: string) => {
    const source = name && name !== email ? name : email;
    const parts = source.split(/[\s@]+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return source.substring(0, 2).toUpperCase();
  };

  const avatarGradient = (role: UserRole | null) => {
    switch (role) {
      case 'admin': return 'from-secondary/80 to-secondary/40';
      case 'manager': return 'from-primary/80 to-primary/40';
      case 'field': return 'from-accent/80 to-accent/40';
      default: return 'from-muted-foreground/40 to-muted-foreground/20';
    }
  };

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {users.length} user{users.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => { setLoadingUsers(true); loadUsers(); }} title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setInviteOpen(true)} className="bg-primary text-primary-foreground">
            <UserPlus className="w-4 h-4 mr-2" /> Add User
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {(['admin', 'manager', 'field'] as const).map(r => {
          const cfg = ROLE_CONFIG[r];
          const Icon = cfg.icon;
          return (
            <div key={r} className={`rounded-xl border ${cfg.border} ${cfg.bg} px-4 py-3 flex items-center gap-3`}>
              <div className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${cfg.color}`} />
              </div>
              <div>
                <p className="text-xl font-heading font-bold leading-none">{roleCounts[r] || 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cfg.label}s</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Input
          placeholder="Search by name or email…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      </div>

      {/* User list */}
      {loadingUsers ? (
        <div className="elevated-card rounded-xl p-12 text-center text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
          Loading team members…
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="elevated-card rounded-xl p-12 text-center">
          <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">
            {searchQuery ? 'No users match your search.' : 'No team members yet.'}
          </p>
        </div>
      ) : (
        <div className="elevated-card rounded-xl overflow-hidden divide-y divide-border">
          {filteredUsers.map((u, i) => {
            const cfg = ROLE_CONFIG[u.role || 'field'];
            const RoleIcon = cfg.icon;
            return (
              <div
                key={u.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors group"
              >
                {/* Avatar */}
                <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarGradient(u.role)} flex items-center justify-center text-white font-heading font-bold text-sm shrink-0 shadow-sm`}>
                  {getInitials(u.display_name, u.email)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-heading font-semibold text-sm truncate">
                      {u.display_name || u.email}
                    </p>
                    <span className={`inline-flex items-center gap-1 rounded-full border ${cfg.border} ${cfg.bg} px-2 py-0.5 text-[11px] font-medium ${cfg.color}`}>
                      <RoleIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="w-3 h-3 shrink-0" />
                      {u.email}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(u)}>
                      <Pencil className="w-4 h-4 mr-2" /> Edit User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      {/* Register / Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-primary" />
              </div>
              Register New User
            </DialogTitle>
          </DialogHeader>
          <Separator />
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email Address</Label>
              <Input
                type="email"
                placeholder="user@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">An invite email will be sent to this address</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Display Name</Label>
              <Input
                placeholder="John Smith"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Role</Label>
              <Select value={inviteRole} onValueChange={v => setInviteRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                          {cfg.label} — {cfg.description}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail} className="bg-primary text-primary-foreground">
              {inviting ? 'Sending…' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              Edit User
            </DialogTitle>
          </DialogHeader>
          <Separator />
          {editUser && (
            <div className="space-y-4 py-1">
              {/* User preview header */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient(editUser.role)} flex items-center justify-center text-white font-heading font-bold text-sm`}>
                  {getInitials(editUser.display_name, editUser.email)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{editUser.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {new Date(editUser.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Display Name</Label>
                <Input
                  placeholder="John Smith"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Role</Label>
                <Select value={editRole} onValueChange={v => setEditRole(v as UserRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${cfg.color}`} />
                            {cfg.label} — {cfg.description}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <Separator />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="bg-primary text-primary-foreground">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
