import { useState } from 'react';
import { useApp, getProjectPricing } from '@/lib/context';
import { calculateQuoteSummary, formatCurrency } from '@/lib/pricing';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { createNewProject } from '@/lib/context';
import { toast } from 'sonner';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'on-hold', label: 'On Hold' },
] as const;

export default function QuotesList() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { projects, setCurrentProject, deleteProjectFromDb } = useApp();
  const navigate = useNavigate();

  const filteredProjects = statusFilter === 'all'
    ? projects
    : projects.filter(p => p.status === statusFilter);

  const handleNew = () => {
    const project = createNewProject();
    setCurrentProject(project);
    navigate('/quotes/new');
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProjectFromDb(id);
      toast.success('Quote deleted');
    } catch {
      toast.error('Failed to delete quote');
    }
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">All Quotes</h1>
        <Button onClick={handleNew} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Plus className="w-4 h-4 mr-2" /> New Quote
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f.label}
            {f.value !== 'all' && (
              <span className="ml-1.5 opacity-70">
                {projects.filter(p => p.status === f.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {projects.length === 0 ? (
        <div className="elevated-card rounded-xl p-12 text-center">
          <FileText className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No quotes created yet</p>
          <Button onClick={handleNew} variant="outline">Create your first quote</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.slice().reverse().map(project => {
            const summary = calculateQuoteSummary(project.lineItems, project.settings, getProjectPricing(project));
            return (
              <div key={project.id} className="elevated-card rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-heading font-semibold truncate">{project.projectRef || 'Untitled'}</p>
                    <StatusBadge status={project.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{project.client || 'No client'} · {project.date}</p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Items</p>
                    <p className="font-semibold">{summary.totalItems}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Total</p>
                    <p className="font-semibold">{formatCurrency(summary.sellingPrice.total)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Margin</p>
                    <p className="font-semibold">{summary.margin.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setCurrentProject(project); navigate('/quotes/new'); }}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(project.id)}>
                    Delete
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

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', sent: 'Sent', won: 'Won', lost: 'Lost', 'on-hold': 'On Hold',
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    won: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'on-hold': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
