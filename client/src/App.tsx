import React, { useState, useCallback } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { Sidebar, type Panel } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Overview } from '@/components/dashboard/Overview';
import { FleetMonitor } from '@/components/fleet/FleetMonitor';
import { CostCenter } from '@/components/costs/CostCenter';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { SystemHealth } from '@/components/health/SystemHealth';
import { CrmPanel } from '@/components/crm/CrmPanel';
import { N8nPanel } from '@/components/n8n/N8nPanel';
import { ActivityLog } from '@/components/activity/ActivityLog';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { CalendarPanel } from '@/components/calendar/CalendarPanel';
import { MemoryPanel } from '@/components/memory/MemoryPanel';
import { DocumentsPanel } from '@/components/documents/DocumentsPanel';
import { useSSE } from '@/hooks/useSSE';
import { Loader2 } from 'lucide-react';

function Dashboard() {
  const [activePanel, setActivePanel] = useState<Panel>('dashboard');
  const [sseConnected, setSseConnected] = useState(true);

  useSSE({
    'agent-update': () => {},
    'health-update': () => {},
    'cost-update': () => {},
    'crm-update': () => {},
    'n8n-update': () => {},
    'task-update': () => {},
    'activity-update': () => {},
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
      case 'activity': return <ActivityLog />;
      case 'settings': return <SettingsPanel />;
      case 'calendar': return <CalendarPanel />;
      case 'memory': return <MemoryPanel />;
      case 'documents': return <DocumentsPanel />;
    }
  }, [activePanel]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePanel={activePanel} onNavigate={setActivePanel} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header activePanel={activePanel} sseConnected={sseConnected} />
        <main className="flex-1 overflow-y-auto p-6">
          <div key={activePanel} className="panel-enter">
            {renderPanel()}
          </div>
        </main>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
