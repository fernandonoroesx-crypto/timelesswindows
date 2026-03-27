import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth';
import type { ProjectStage } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderOpen, Eye, Search } from 'lucide-react';

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

const stageBadgeClass: Record<ProjectStage, string> = {
  won: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  survey: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  ordered: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  'in-production': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  'out-for-delivery': 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800',
  delivered: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800',
  'on-site': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  installed: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  invoiced: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800',
  complete: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
};

export default function ProjectsPage() {
  const { managedProjects } = useApp();
  const { role, fieldUserName } = useRole();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const visibleProjects = (role === 'field'
    ? managedProjects.filter(mp => mp.assignedTeam.some(name => name.toLowerCase() === fieldUserName.toLowerCase()))
    : managedProjects
  ).filter(mp => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return mp.clientName.toLowerCase().includes(q) || mp.quoteRef.toLowerCase().includes(q);
  });

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Projects</h1>

      {/* Search */}
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by client or ref..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {visibleProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">{searchQuery ? 'No projects match your search' : 'No projects yet'}</p>
            {!searchQuery && <p className="text-sm mt-1">Projects are created automatically when a quote is marked as Won.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleProjects.map(mp => {
            const stageLabel = STAGES.find(s => s.value === mp.currentStage)?.label || mp.currentStage;
            return (
              <Card key={mp.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-foreground">{mp.quoteRef || '—'}</span>
                        <Badge className={stageBadgeClass[mp.currentStage]}>{stageLabel}</Badge>
                        <Badge variant="outline" className="text-xs">{mp.projectType === 'supply-only' ? 'Supply Only' : 'Standard'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{mp.clientName || 'No client'}</p>
                      {mp.address && <p className="text-xs text-muted-foreground truncate">{mp.address}</p>}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${mp.id}`)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
