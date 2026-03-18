import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useApi } from '@/hooks/useApi';
import type { Agent } from '@shared/types';
import {
  Monitor,
  DollarSign,
  LayoutGrid,
  Activity,
  BarChart3,
  Zap,
  Users,
  Workflow,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type Panel = 'dashboard' | 'fleet' | 'costs' | 'kanban' | 'health' | 'crm' | 'n8n';

interface SidebarProps {
  activePanel: Panel;
  onNavigate: (panel: Panel) => void;
}

interface NavSection {
  label: string;
  items: { id: Panel; label: string; icon: React.ElementType; alertKey?: string }[];
}

const sections: NavSection[] = [
  {
    label: 'Operations',
    items: [
      { id: 'dashboard', label: 'Overview', icon: BarChart3 },
      { id: 'fleet', label: 'Bots', icon: Monitor, alertKey: 'fleet' },
      { id: 'costs', label: 'Costs', icon: DollarSign },
      { id: 'health', label: 'Health', icon: Activity, alertKey: 'health' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { id: 'kanban', label: 'Tasks', icon: LayoutGrid },
    ],
  },
  {
    label: 'Integrations',
    items: [
      { id: 'crm', label: 'CRM', icon: Users },
      { id: 'n8n', label: 'N8N', icon: Workflow },
    ],
  },
];

export function Sidebar({ activePanel, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { data: agents } = useApi<Agent[]>('/api/agents');

  const hasFleetError = agents?.some(a => a.status === 'error');

  function getAlert(key?: string): boolean {
    if (key === 'fleet') return !!hasFleetError;
    return false;
  }

  return (
    <aside
      className={cn(
        'h-screen flex flex-col shrink-0 border-r border-border transition-all duration-200',
        'bg-[hsl(var(--sidebar,var(--card)))]',
        collapsed ? 'w-16' : 'w-52'
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold tracking-tight leading-none">BBK OPS</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase mt-0.5">Center</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {sections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activePanel === item.id;
                const hasAlert = getAlert(item.alertKey);
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 relative',
                      collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    )}
                  >
                    {/* Active left accent */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                    )}
                    <div className="relative">
                      <item.icon className="w-4 h-4" />
                      {hasAlert && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[hsl(var(--sidebar,var(--card)))]" />
                      )}
                    </div>
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2 mt-2 px-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-muted-foreground">Operational</span>
            <span className="text-[10px] text-muted-foreground/50 ml-auto">v2.0</span>
          </div>
        )}
      </div>
    </aside>
  );
}
