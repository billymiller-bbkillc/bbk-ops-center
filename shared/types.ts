// ===== Agent Fleet Types =====
export type AgentStatus = 'online' | 'idle' | 'busy' | 'error';

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

// Super Admin CRM types — simplified for tenant/user/login tracking
export interface CrmQuickStats {
  totalTenants: number;
  totalUsers: number;
  activeTenants: number;
  lastChecked: string;
}

export interface CrmTenant {
  id: string;
  name: string;
  status: string;
  planType: string;
  subscriptionTier: string;
  userCount: number;
  createdAt: string;
}

export interface CrmUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  organizationId: string;
  orgName: string;
  lastLoginAt: string | null;
  loginCount: number;
  createdAt: string;
}

export interface CrmLoginEvent {
  id: string;
  email: string;
  orgName: string;
  eventType: 'login' | 'logout' | 'login_failed';
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface CrmLoginStats {
  totalLogins: number;
  uniqueUsers: number;
  loginsToday: number;
  loginsThisWeek: number;
  loginsThisMonth: number;
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

// ===== GitHub Task Types =====
export interface GitHubTask {
  id: string; // "repo/issueNumber"
  repo: string;
  issueNumber: number;
  title: string;
  description: string;
  priority: TaskPriority;
  column: TaskColumn;
  assignee: string | null;
  assignees: string[];
  labels: string[];
  url: string; // GitHub issue URL
  createdAt: string;
  updatedAt: string;
}

// ===== API Response Types =====
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export type CostPeriod = 'day' | 'week' | 'month';
