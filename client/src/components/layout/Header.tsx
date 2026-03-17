import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
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

  return (
    <header className="h-12 border-b border-border bg-card/50 backdrop-blur flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-semibold text-foreground">BBK Holdings</h2>
        <span className="text-xs text-muted-foreground">Operations Center</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Live clock */}
        <div className="font-mono-nums text-sm text-muted-foreground">
          {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          {' '}
          <span className="text-foreground font-semibold">
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </span>
        </div>

        {/* Status dot */}
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-status-healthy" />
          <span className="text-xs text-muted-foreground">LIVE</span>
        </div>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </header>
  );
}
