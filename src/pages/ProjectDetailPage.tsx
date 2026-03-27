import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import type { ManagedProject, ProjectStage } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const STAGES: { value: ProjectStage; label: string }[] = [
  { value: 'won', label: 'Won' },
  { value: 'survey', label: 'Survey' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'in-production', label: 'In Production' },
  { value: 'out-for-delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'on-site', label: 'On Site' },
  { value: 'installed', label: 'Installed' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'complete', label: 'Complete' },
];

const stageColor: Record<ProjectStage, string> = {
  won: 'bg-emerald-500',
  survey: 'bg-blue-500',
  ordered: 'bg-blue-500',
  'in-production': 'bg-amber-500',
  'out-for-delivery': 'bg-violet-500',
  delivered: 'bg-violet-500',
  'on-site': 'bg-orange-500',
  installed: 'bg-orange-500',
  invoiced: 'bg-teal-500',
  complete: 'bg-emerald-500',
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { managedProjects, saveManagedProjectToDb, setCurrentProject, projects } = useApp();

  const source = managedProjects.find(p => p.id === id);
  const [project, setProject] = useState<ManagedProject | null>(null);
  const [newTeamMember, setNewTeamMember] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (source) {
      setProject({ ...source });
      setDirty(false);
    }
  }, [source]);

  if (!project) {
    return (
      <div>
        <Button variant="outline" size="sm" onClick={() => navigate('/projects')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
        </Button>
        <p className="mt-8 text-muted-foreground text-center">Project not found.</p>
      </div>
    );
  }

  const currentStageIndex = STAGES.findIndex(s => s.value === project.currentStage);
  const nextStage = currentStageIndex < STAGES.length - 1 ? STAGES[currentStageIndex + 1] : null;

  const update = (changes: Partial<ManagedProject>) => {
    setProject(prev => prev ? { ...prev, ...changes } : prev);
    setDirty(true);
  };

  const save = async () => {
    if (!project) return;
    try {
      await saveManagedProjectToDb({ ...project, updatedAt: new Date().toISOString() });
      setDirty(false);
      toast.success('Project saved');
    } catch {
      toast.error('Failed to save');
    }
  };

  const advanceStage = async () => {
    if (!project || !nextStage) return;
    const updated = { ...project, currentStage: nextStage.value, updatedAt: new Date().toISOString() };
    setProject(updated);
    try {
      await saveManagedProjectToDb(updated);
      setDirty(false);
      toast.success(`Advanced to ${nextStage.label}`);
    } catch {
      toast.error('Failed to advance stage');
    }
  };

  const addTeamMember = () => {
    if (!newTeamMember.trim()) return;
    update({ assignedTeam: [...project.assignedTeam, newTeamMember.trim()] });
    setNewTeamMember('');
  };

  const removeTeamMember = (index: number) => {
    update({ assignedTeam: project.assignedTeam.filter((_, i) => i !== index) });
  };

  const addNote = () => {
    if (!newNoteText.trim()) return;
    const note = { timestamp: new Date().toISOString(), author: 'User', text: newNoteText.trim() };
    update({ notes: [note, ...project.notes] });
    setNewNoteText('');
  };

  const openLinkedQuote = () => {
    if (!project.quoteId) return;
    const quote = projects.find(p => p.id === project.quoteId);
    if (quote) {
      setCurrentProject(quote);
      navigate('/quotes/new');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/projects')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <h1 className="text-2xl font-heading font-bold text-foreground">{project.quoteRef || 'Project'}</h1>
          {project.quoteId && (
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={openLinkedQuote}>
              <ExternalLink className="w-3 h-3" /> View Quote
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{project.clientName}</p>
        {project.address && <p className="text-xs text-muted-foreground">{project.address}</p>}
      </div>

      {/* Stage Progress Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Progress</h3>
            {nextStage && (
              <Button size="sm" onClick={advanceStage}>
                Next: {nextStage.label} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
          <div className="flex gap-1">
            {STAGES.map((stage, i) => {
              const isCurrent = stage.value === project.currentStage;
              const isPast = i < currentStageIndex;
              const isFuture = i > currentStageIndex;
              return (
                <div key={stage.value} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`h-2 w-full rounded-full transition-colors ${
                      isPast ? stageColor[stage.value] + ' opacity-60'
                        : isCurrent ? stageColor[stage.value]
                        : 'bg-muted'
                    }`}
                  />
                  <span className={`text-[10px] leading-tight text-center ${
                    isCurrent ? 'font-semibold text-foreground' : isFuture ? 'text-muted-foreground/50' : 'text-muted-foreground'
                  }`}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Key Dates */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Key Dates</h3>
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
                  value={project.keyDates[key] || ''}
                  onChange={e => {
                    update({ keyDates: { ...project.keyDates, [key]: e.target.value || undefined } });
                  }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assigned Team */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Assigned Team</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {project.assignedTeam.map((member, i) => (
              <Badge key={i} variant="secondary" className="gap-1">
                {member}
                <button onClick={() => removeTeamMember(i)} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {project.assignedTeam.length === 0 && <p className="text-sm text-muted-foreground">No team members assigned</p>}
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
        </CardContent>
      </Card>

      {/* Site Notes */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Site Notes</h3>
          <div className="flex gap-2 mb-3">
            <Textarea
              placeholder="Add a note..."
              value={newNoteText}
              onChange={e => setNewNoteText(e.target.value)}
              className="min-h-[60px]"
            />
            <Button variant="outline" size="sm" onClick={addNote} className="self-end"><Plus className="w-4 h-4" /></Button>
          </div>
          {project.notes.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {project.notes.map((note, i) => (
                <div key={i} className="bg-muted/50 rounded p-3 text-sm">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{note.author}</span>
                    <span>{new Date(note.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-foreground">{note.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No notes yet</p>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      {dirty && (
        <div className="flex justify-end gap-2 sticky bottom-4">
          <Button onClick={save}>Save Changes</Button>
        </div>
      )}
    </div>
  );
}
