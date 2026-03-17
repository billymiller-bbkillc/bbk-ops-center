import React, { useState, useCallback } from 'react';
import { Sidebar, type Panel } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Overview } from '@/components/dashboard/Overview';
import { FleetMonitor } from '@/components/fleet/FleetMonitor';
import { CostCenter } from '@/components/costs/CostCenter';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { SystemHealth } from '@/components/health/SystemHealth';
import { CrmPanel } from '@/components/crm/CrmPanel';
import { N8nPanel } from '@/components/n8n/N8nPanel';
import { useSSE } from '@/hooks/useSSE';

function App() {
  const [activePanel, setActivePanel] = useState<Panel>('dashboard');

  // SSE handlers for live updates
  useSSE({
    'agent-update': (data) => {
      // Components will refetch on their own via useApi
      // Could add global state management here later
    },
    'health-update': (data) => {},
    'cost-update': (data) => {},
    'crm-update': (data) => {},
    'n8n-update': (data) => {},
    'task-update': (data) => {},
  });

  const renderPanel = useCallback(() => {
    switch (activePanel) {
      case 'dashboard': return <Overview />;
      case 'fleet': return <FleetMonitor />;
      case 'costs': return <CostCenter />;
      case 'kanban': return <KanbanBoard />;
      case 'health': return <SystemHealth />;
      case 'crm': return <CrmPanel />;
      case 'n8n': return <N8nPanel />;
    }
  }, [activePanel]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activePanel={activePanel} onNavigate={setActivePanel} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4">
          {renderPanel()}
        </main>
      </div>
    </div>
  );
}

export default App;
