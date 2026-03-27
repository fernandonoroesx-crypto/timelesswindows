import { useNavigate } from 'react-router-dom';
import { useApp, createNewProject, getProjectPricing } from '@/lib/context';
import { calculateQuoteSummary, formatCurrency } from '@/lib/pricing';
import { Plus, FileText, TrendingUp, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const { projects, setProjects, setCurrentProject } = useApp();
  const navigate = useNavigate();

  const handleNewProject = () => {
    const project = createNewProject();
    setProjects(prev => [...prev, project]);
    setCurrentProject(project);
    navigate('/quotes/new');
  };

  const totalQuotes = projects.length;
  const activeQuotes = projects.filter(p => p.status === 'draft' || p.status === 'sent' || p.status === 'on-hold').length;
  const totalRevenue = projects
    .filter(p => p.status === 'won')
    .reduce((sum, p) => sum + calculateQuoteSummary(p.lineItems, p.settings, getProjectPricing(p)).sellingPrice.total, 0);
  const totalItems = projects.reduce((sum, p) => sum + p.lineItems.reduce((s, i) => s + i.qty, 0), 0);

  return (
    <div className="space-y-8 animate-slide-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Overview of your quoting activity</p>
        </div>
        <Button onClick={handleNewProject} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Plus className="w-4 h-4 mr-2" />
          New Quote
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Quotes" value={totalQuotes.toString()} />
        <StatCard icon={Layers} label="Active" value={activeQuotes.toString()} />
        <StatCard icon={TrendingUp} label="Revenue" value={formatCurrency(totalRevenue)} />
        <StatCard icon={Layers} label="Total Items" value={totalItems.toString()} />
      </div>

      {/* Recent quotes */}
      <div className="elevated-card rounded-xl p-6">
        <h2 className="font-heading text-lg font-semibold mb-4">Recent Quotes</h2>
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No quotes yet. Create your first quote to get started.</p>
            <Button onClick={handleNewProject} variant="outline" className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Create Quote
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-3 px-2 font-medium">Ref</th>
                  <th className="text-left py-3 px-2 font-medium">Client</th>
                  <th className="text-left py-3 px-2 font-medium">Items</th>
                  <th className="text-left py-3 px-2 font-medium">Total</th>
                  <th className="text-left py-3 px-2 font-medium">Status</th>
                  <th className="py-3 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {projects.slice(-10).reverse().map(project => {
                  const summary = calculateQuoteSummary(project.lineItems, project.settings);
                  return (
                    <tr key={project.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2 font-medium">{project.projectRef || '—'}</td>
                      <td className="py-3 px-2">{project.client || '—'}</td>
                      <td className="py-3 px-2">{summary.totalItems}</td>
                      <td className="py-3 px-2 font-medium">{formatCurrency(summary.sellingPrice.total)}</td>
                      <td className="py-3 px-2">
                        <StatusBadge status={project.status} />
                      </td>
                      <td className="py-3 px-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCurrentProject(project);
                            navigate('/quotes/new');
                          }}
                        >
                          Open
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="elevated-card rounded-xl p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <p className="text-2xl font-heading font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  won: 'Won',
  lost: 'Lost',
  on_hold: 'On Hold',
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    won: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    on_hold: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
