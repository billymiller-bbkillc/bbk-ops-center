import React, { useState, useEffect } from 'react';
import { Search, Sun, Moon, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Panel } from './Sidebar';

const panelNames: Record<Panel, { title: string; breadcrumb: string }> = {
  dashboard: { title: 'Overview', breadcrumb: 'Operations' },
  fleet: { title: 'Bot Monitor', breadcrumb: 'Operations' },
  costs: { title: 'Cost Center', breadcrumb: 'Operations' },
  kanban: { title: 'Kanban Board', breadcrumb: 'Tools' },
  health: { title: 'System Health', breadcrumb: 'Operations' },
  crm: { title: 'CRM', breadcrumb: 'Integrations' },
  n8n: { title: 'N8N', breadcrumb: 'Integrations' },
  activity: { title: 'Activity Log', breadcrumb: 'Operations' },
  settings: { title: 'Settings', breadcrumb: 'Admin' },
};

interface HeaderProps {
  activePanel?: Panel;
  sseConnected?: boolean;
}

export function Header({ activePanel = 'dashboard', sseConnected = true }: HeaderProps) {
  const [time, setTime] = useState(new Date());
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const panel = panelNames[activePanel];

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
      {/* Left: Breadcrumb + panel name */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{panel.breadcrumb}</span>
        <span className="text-xs text-muted-foreground/40">/</span>
        <h2 className="text-sm font-semibold text-foreground">{panel.title}</h2>
      </div>

      {/* Center: Search placeholder */}
      <div className="hidden md:flex items-center max-w-sm flex-1 mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search across panels..."
            className="w-full h-8 pl-9 pr-3 text-xs bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
            readOnly
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/40 font-mono">⌘K</kbd>
        </div>
      </div>

      {/* Right: Status + clock + theme */}
      <div className="flex items-center gap-4">
        {/* SSE connection status */}
        <div className="flex items-center gap-1.5">
          {sseConnected ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-medium">LIVE</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[10px] text-red-400 font-medium">OFFLINE</span>
            </>
          )}
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-border" />

        {/* Live clock */}
        <div className="font-mono-nums text-xs text-muted-foreground">
          {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          {' '}
          <span className="text-foreground font-semibold">
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </span>
        </div>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 text-muted-foreground hover:text-foreground">
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </header>
  );
}
