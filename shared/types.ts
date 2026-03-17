// ===== Agent Fleet Types =====
export type AgentStatus = 'online' | 'offline' | 'busy' | 'error';

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  model: string;
  currentTask: string | null;
  uptime: number; // seconds
  lastSeen: string; // ISO timestamp
  nodeId: string;
  businessUnit: string;
}

export interface AgentSession {
  id: string;
  agentId: string;
  startedAt: string;
  endedAt: string | null;
  model: string;
  task: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  status: 'active' | 'completed' | 'failed';
}

// ===== Cost Center Types =====
export interface TokenUsage {
  agentId: string;
  agentName: string;
  model: string;
  date: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
}

export interface CostSummary {
  totalCost: number;
  totalTokensIn: number;
  totalTokensOut: number;
  byAgent: { agentId: string; agentName: string; cost: number; tokensIn: number; tokensOut: number }[];
  byModel: { model: string; cost: number; tokensIn: number; tokensOut: number }[];
  dailyTrend: { date: string; cost: number }[];
}

export interface BudgetAlert {
  id: string;
  name: string;
  threshold: number;
  period: 'daily' | 'weekly' | 'monthly';
  currentSpend: number;
  triggered: boolean;
}

// ===== Kanban Types =====
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskColumn = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  column: TaskColumn;
  assignee: string | null;
  businessUnit: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  order: number;
}

// ===== System Health Types =====
export interface NodeHealth {
  id: string;
  name: string;
  hostname: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  cpuPercent: number;
  memoryPercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  diskPercent: number;
  diskUsedGb: number;
  diskTotalGb: number;
  uptime: number; // seconds
  lastUpdated: string;
  agentCount: number;
}

// ===== CRM Types =====
export interface CrmHealth {
  status: string;
  uptime: number;
  memory: { used: number; total: number; rss: number };
  performance: { totalRequests: number; averageResponseTime: number; errorCount: number };
  lastChecked: string;
}

// Legacy single-org stats (kept for backward compat)
export interface CrmStats {
  leads: number;
  deals: number;
  clients: number;
  companies: number;
  lastChecked: string;
}

export interface CrmPipeline {
  id: string;
  name: string;
  isDefault: boolean;
  stages: { id: string; name: string; orderIndex: number; dealCount?: number }[];
}

// Super Admin cross-tenant types
export interface CrmGlobalStats {
  totalOrganizations: number;
  totalUsers: number;
  totalLeads: number;
  totalDeals: number;
  totalClients: number;
  totalCompanies: number;
  lastChecked: string;
}

export interface CrmOrganization {
  id: string;
  name: string;
  status: string;
  planType: string;
  subscriptionTier: string;
  seats: number;
  paymentStatus: string;
  createdAt: string;
  userCount: number;
  leadCount: number;
  dealCount: number;
  clientCount: number;
}

export interface CrmActivity {
  type: 'lead' | 'deal' | 'client';
  name: string;
  orgName: string;
  createdAt: string;
}

export interface CrmStatusBreakdown {
  status: string;
  count: number;
}

// ===== N8N Types =====
export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
}

export interface N8nExecution {
  id: string;
  workflowId: string;
  workflowName?: string;
  status: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt: string | null;
  duration?: number; // ms
}

export interface N8nSummary {
  totalWorkflows: number;
  activeWorkflows: number;
  inactiveWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  lastExecutionAt: string | null;
  lastChecked: string;
}

// ===== SSE Types =====
export type SSEEventType =
  | 'agent-update'
  | 'health-update'
  | 'cost-update'
  | 'task-update'
  | 'crm-update'
  | 'n8n-update'
  | 'heartbeat';

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: string;
}

// ===== API Response Types =====
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export type CostPeriod = 'day' | 'week' | 'month';
