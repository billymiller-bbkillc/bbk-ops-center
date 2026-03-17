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

// ===== SSE Types =====
export type SSEEventType =
  | 'agent-update'
  | 'health-update'
  | 'cost-update'
  | 'task-update'
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
