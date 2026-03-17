import React from 'react';
import { cn } from '@/lib/utils';
import {
  Monitor,
  DollarSign,
  LayoutGrid,
  Activity,
  BarChart3,
  Zap,
} from 'lucide-react';

export type Panel = 'dashboard' | 'fleet' | 'costs' | 'kanban' | 'health';

interface SidebarProps {
  activePanel: Panel;
  onNavigate: (panel: Panel) => void;
}

const navItems: { id: Panel; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Overview', icon: BarChart3 },
  { id: 'fleet', label: 'Fleet Monitor', icon: Monitor },
  { id: 'costs', label: 'Cost Center', icon: DollarSign },
  { id: 'kanban', label: 'Task Board', icon: LayoutGrid },
  { id: 'health', label: 'System Health', icon: Activity },
];

export function Sidebar({ activePanel, onNavigate }: SidebarProps) {
  return (
    <aside className="w-56 h-screen bg-card border-r border-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-ops-blue rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">BBK OPS</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Center</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              activePanel === item.id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-status-healthy animate-pulse" />
          <span className="text-xs text-muted-foreground">System Operational</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">v1.0.0</p>
      </div>
    </aside>
  );
}
