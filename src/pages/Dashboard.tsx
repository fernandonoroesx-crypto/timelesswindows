import { useNavigate } from 'react-router-dom';
import { useApp, createNewProject, getProjectPricing } from '@/lib/context';
import { useRole } from '@/lib/roles';
import { calculateQuoteSummary, formatCurrency } from '@/lib/pricing';
import type { ProjectStage, ManagedProject } from '@/lib/types';
import { Plus, Layers, TrendingUp, AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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

const stageHeaderColor: Record<ProjectStage, string> = {
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

export default function Dashboard() {
  const { projects, managedProjects, setProjects, setCurrentProject } = useApp();
  const { role, fieldUserName } = useRole();
  const navigate = useNavigate();

  // Filter managed projects for field users
  const visibleProjects = role === 'field'
    ? managedProjects.filter(mp => mp.assignedTeam.some(name => name.toLowerCase() === fieldUserName.toLowerCase()))
    : managedProjects;

  const handleNewProject = () => {
    const project = createNewProject();
    setProjects(prev => [...prev, project]);
    setCurrentProject(project);
    navigate('/quotes/new');
  };

  // Summary stats
  const activeProjects = visibleProjects.filter(p => p.currentStage !== 'complete');
  const wonPipelineValue = role !== 'field'
    ? projects
        .filter(p => p.status === 'won')
        .reduce((sum, p) => sum + calculateQuoteSummary(p.lineItems, p.settings, getProjectPricing(p)).sellingPrice.total, 0)
    : 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const overdueProjects = visibleProjects.filter(mp => {
    if (mp.currentStage === 'complete') return false;
    const hasAnyDate = Object.values(mp.keyDates).some(d => !!d);
    return !hasAnyDate && mp.createdAt < sevenDaysAgo;
  });

  // Group by stage
  const grouped = STAGES.map(stage => ({
    ...stage,
    projects: visibleProjects.filter(mp => mp.currentStage === stage.value),
  }));

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Project board overview</p>
        </div>
        {role !== 'field' && (
          <Button onClick={handleNewProject} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <Plus className="w-4 h-4 mr-2" />
            New Quote
          </Button>
        )}
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="elevated-card rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xl font-heading font-bold">{activeProjects.length}</p>
            <p className="text-xs text-muted-foreground">Active Projects</p>
          </div>
        </div>
        <div className="elevated-card rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xl font-heading font-bold">{formatCurrency(wonPipelineValue)}</p>
            <p className="text-xs text-muted-foreground">Pipeline Value</p>
          </div>
        </div>
        <div className="elevated-card rounded-xl p-4 flex items-center gap-3 col-span-2 lg:col-span-1">
          <div className={`p-2 rounded-lg ${overdueProjects.length > 0 ? 'bg-destructive/10' : 'bg-primary/10'}`}>
            <AlertTriangle className={`w-4 h-4 ${overdueProjects.length > 0 ? 'text-destructive' : 'text-primary'}`} />
          </div>
          <div>
            <p className="text-xl font-heading font-bold">{overdueProjects.length}</p>
            <p className="text-xs text-muted-foreground">Overdue (no dates set)</p>
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div className="elevated-card rounded-xl p-4 overflow-hidden">
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-4 min-w-max">
            {grouped.map(col => (
              <KanbanColumn
                key={col.value}
                stage={col.value}
                label={col.label}
                projects={col.projects}
                headerColor={stageHeaderColor[col.value]}
                onView={(id) => navigate(`/projects/${id}`)}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  label,
  projects,
  headerColor,
  onView,
}: {
  stage: ProjectStage;
  label: string;
  projects: ManagedProject[];
  headerColor: string;
  onView: (id: string) => void;
}) {
  return (
    <div className="w-52 flex-shrink-0 flex flex-col">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${headerColor}`} />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{label}</span>
        <span className="text-xs text-muted-foreground ml-auto">{projects.length}</span>
      </div>

      {/* Cards */}
      <div className="space-y-2 flex-1 min-h-[120px]">
        {projects.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg h-24 flex items-center justify-center">
            <span className="text-xs text-muted-foreground/50">No projects</span>
          </div>
        ) : (
          projects.map(mp => (
            <div
              key={mp.id}
              className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <span className="font-mono text-xs font-bold text-foreground leading-tight">{mp.quoteRef || '—'}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 leading-tight shrink-0">
                  {mp.projectType === 'supply-only' ? 'S/O' : 'Std'}
                </Badge>
              </div>
              <p className="text-xs text-foreground font-medium truncate">{mp.clientName || 'No client'}</p>
              {mp.address && (
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{mp.address}</p>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 h-6 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onView(mp.id)}
              >
                <Eye className="w-3 h-3 mr-1" /> View
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
