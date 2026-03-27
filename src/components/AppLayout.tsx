import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Plus, Settings, Menu, X, Users, Truck, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { useRole } from '@/lib/roles';

const allNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'manager', 'field'] },
  { to: '/clients', icon: Users, label: 'Clients', roles: ['admin', 'manager'] },
  { to: '/suppliers', icon: Truck, label: 'Suppliers', roles: ['admin', 'manager'] },
  { to: '/quotes', icon: FileText, label: 'Quotes', roles: ['admin', 'manager'] },
  { to: '/projects', icon: FolderOpen, label: 'Projects', roles: ['admin', 'manager', 'field'] },
  { to: '/quotes/new', icon: Plus, label: 'New Quote', roles: ['admin', 'manager'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="p-6">
          <h1 className="font-heading text-xl font-bold text-sidebar-primary">TIMELESS WINDOWS</h1>
          <p className="text-xs text-sidebar-foreground/60 mt-1">Windows & Doors Quoting</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/40">v1.0 — Pricing 2026</p>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar text-sidebar-foreground border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <h1 className="font-heading text-lg font-bold text-sidebar-primary">TIMELESS WINDOWS</h1>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-sidebar/95 backdrop-blur-sm pt-16">
          <nav className="px-4 space-y-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/70'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-0 mt-14 lg:mt-0">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
