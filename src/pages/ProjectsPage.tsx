import { useState } from 'react';
import { useApp } from '@/lib/context';
import type { ManagedProject, ProjectStage } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderOpen, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const STAGES: { value: ProjectStage; label: string }[] = [
  { value: 'won', label: 'Won' },
  { value: 'survey', label: 'Survey' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'installation', label: 'Installation' },
  { value: 'completed', label: 'Completed' },
];

const stageBadgeClass: Record<ProjectStage, string> = {
  won: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  survey: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  ordered: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800',
  delivery: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  installation: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  completed: 'bg-muted text-muted-foreground border-border',
};

export default function ProjectsPage() {
  const { managedProjects, saveManagedProjectToDb } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ManagedProject | null>(null);
  const [newTeamMember, setNewTeamMember] = useState('');
  const [newNoteText, setNewNoteText] = useState('');

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setEditingProject(null);
    } else {
      setExpandedId(id);
      setEditingProject(managedProjects.find(p => p.id === id) || null);
    }
  };

  const saveProject = async () => {
    if (!editingProject) return;
    try {
      await saveManagedProjectToDb({ ...editingProject, updatedAt: new Date().toISOString() });
      setExpandedId(null);
      setEditingProject(null);
      toast.success('Project saved');
    } catch {
      toast.error('Failed to save project');
    }
  };

  const addTeamMember = () => {
    if (!editingProject || !newTeamMember.trim()) return;
    setEditingProject({ ...editingProject, assignedTeam: [...editingProject.assignedTeam, newTeamMember.trim()] });
    setNewTeamMember('');
  };

  const removeTeamMember = (index: number) => {
    if (!editingProject) return;
    setEditingProject({ ...editingProject, assignedTeam: editingProject.assignedTeam.filter((_, i) => i !== index) });
  };

  const addNote = () => {
    if (!editingProject || !newNoteText.trim()) return;
    const note = { timestamp: new Date().toISOString(), author: 'User', text: newNoteText.trim() };
    setEditingProject({ ...editingProject, notes: [note, ...editingProject.notes] });
    setNewNoteText('');
  };

  if (managedProjects.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Projects</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">No projects yet</p>
            <p className="text-sm mt-1">Projects are created automatically when a quote is marked as Won.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Projects</h1>
      <div className="space-y-3">
        {managedProjects.map(mp => {
          const isExpanded = expandedId === mp.id;
          const stageLabel = STAGES.find(s => s.value === mp.currentStage)?.label || mp.currentStage;

          return (
            <Card key={mp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {/* Summary row */}
                <button
                  onClick={() => toggleExpand(mp.id)}
                  className="w-full flex items-center justify-between gap-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-foreground">{mp.quoteRef || '—'}</span>
                      <Badge className={stageBadgeClass[mp.currentStage]}>{stageLabel}</Badge>
                      <Badge variant="outline" className="text-xs">{mp.projectType === 'supply-only' ? 'Supply Only' : 'Standard'}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{mp.clientName || 'No client'}</p>
                    {mp.address && <p className="text-xs text-muted-foreground truncate">{mp.address}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {mp.assignedTeam.length > 0 && (
                      <span className="text-xs text-muted-foreground">{mp.assignedTeam.length} team</span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && editingProject && (
                  <div className="mt-4 pt-4 border-t border-border space-y-6">
                    {/* Stage */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Current Stage</Label>
                        <Select value={editingProject.currentStage} onValueChange={(v) => setEditingProject({ ...editingProject, currentStage: v as ProjectStage })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Address</Label>
                        <Input value={editingProject.address} onChange={e => setEditingProject({ ...editingProject, address: e.target.value })} />
                      </div>
                    </div>

                    {/* Key Dates */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">Key Dates</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {([
                          ['surveyDate', 'Survey Date'],
                          ['orderDate', 'Order Date'],
                          ['expectedDelivery', 'Expected Delivery'],
                          ['installationDate', 'Installation Date'],
                          ['completionDate', 'Completion Date'],
                        ] as const).map(([key, label]) => (
                          <div key={key}>
                            <Label className="text-xs">{label}</Label>
                            <Input
                              type="date"
                              value={editingProject.keyDates[key] || ''}
                              onChange={e => setEditingProject({
                                ...editingProject,
                                keyDates: { ...editingProject.keyDates, [key]: e.target.value || undefined },
                              })}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Assigned Team */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">Assigned Team</h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {editingProject.assignedTeam.map((member, i) => (
                          <Badge key={i} variant="secondary" className="gap-1">
                            {member}
                            <button onClick={() => removeTeamMember(i)} className="ml-1 hover:text-destructive">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add team member..."
                          value={newTeamMember}
                          onChange={e => setNewTeamMember(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addTeamMember()}
                          className="max-w-xs"
                        />
                        <Button variant="outline" size="sm" onClick={addTeamMember}><Plus className="w-4 h-4" /></Button>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
                      <div className="flex gap-2 mb-3">
                        <Textarea
                          placeholder="Add a note..."
                          value={newNoteText}
                          onChange={e => setNewNoteText(e.target.value)}
                          className="min-h-[60px]"
                        />
                        <Button variant="outline" size="sm" onClick={addNote} className="self-end"><Plus className="w-4 h-4" /></Button>
                      </div>
                      {editingProject.notes.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {editingProject.notes.map((note, i) => (
                            <div key={i} className="bg-muted/50 rounded p-2 text-sm">
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>{note.author}</span>
                                <span>{new Date(note.timestamp).toLocaleString()}</span>
                              </div>
                              <p className="text-foreground">{note.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Save */}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => { setExpandedId(null); setEditingProject(null); }}>Cancel</Button>
                      <Button onClick={saveProject}>Save Project</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
