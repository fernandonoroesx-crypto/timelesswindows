import { useApp, getProjectPricing } from '@/lib/context';
import { calculateQuoteSummary, formatCurrency } from '@/lib/pricing';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { createNewProject } from '@/lib/context';

export default function QuotesList() {
  const { projects, setProjects, setCurrentProject } = useApp();
  const navigate = useNavigate();

  const handleNew = () => {
    const project = createNewProject();
    setProjects(prev => [...prev, project]);
    setCurrentProject(project);
    navigate('/quotes/new');
  };

  const handleDelete = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">All Quotes</h1>
        <Button onClick={handleNew} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Plus className="w-4 h-4 mr-2" /> New Quote
        </Button>
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
            const summary = calculateQuoteSummary(project.lineItems, project.settings);
            return (
              <div key={project.id} className="elevated-card rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold truncate">{project.projectRef || 'Untitled'}</p>
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
