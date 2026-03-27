import { useApp, getProjectPricing } from '@/lib/context';
import { calculateQuoteSummary, formatCurrency } from '@/lib/pricing';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen } from 'lucide-react';

export default function ProjectsPage() {
  const { projects } = useApp();

  const wonProjects = projects.filter(p => p.status === 'won');

  if (wonProjects.length === 0) {
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
        {wonProjects.map(project => {
          const pricing = getProjectPricing(project);
          const summary = calculateQuoteSummary(project.lineItems, project.settings, pricing);
          return (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold text-foreground">{project.projectRef || '—'}</span>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">Won</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{project.client || 'No client'}</p>
                    {project.projectManagerName && (
                      <p className="text-xs text-muted-foreground">PM: {project.projectManagerName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{formatCurrency(summary.sellingPrice.total)}</p>
                    <p className="text-xs text-muted-foreground">{project.lineItems.length} items</p>
                    <p className="text-xs text-muted-foreground">{project.date}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
