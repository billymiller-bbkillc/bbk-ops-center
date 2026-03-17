import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: text('status', { enum: ['online', 'offline', 'busy', 'error'] }).notNull().default('offline'),
  model: text('model').notNull(),
  currentTask: text('current_task'),
  uptime: integer('uptime').notNull().default(0),
  lastSeen: text('last_seen').notNull(),
  nodeId: text('node_id').notNull(),
  businessUnit: text('business_unit').notNull(),
});

export const agentSessions = sqliteTable('agent_sessions', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull().references(() => agents.id),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  model: text('model').notNull(),
  task: text('task').notNull(),
  tokensIn: integer('tokens_in').notNull().default(0),
  tokensOut: integer('tokens_out').notNull().default(0),
  cost: real('cost').notNull().default(0),
  status: text('status', { enum: ['active', 'completed', 'failed'] }).notNull().default('active'),
});

export const tokenUsage = sqliteTable('token_usage', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull().references(() => agents.id),
  agentName: text('agent_name').notNull(),
  model: text('model').notNull(),
  date: text('date').notNull(),
  tokensIn: integer('tokens_in').notNull().default(0),
  tokensOut: integer('tokens_out').notNull().default(0),
  cost: real('cost').notNull().default(0),
});

export const budgetAlerts = sqliteTable('budget_alerts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  threshold: real('threshold').notNull(),
  period: text('period', { enum: ['daily', 'weekly', 'monthly'] }).notNull(),
  currentSpend: real('current_spend').notNull().default(0),
  triggered: integer('triggered', { mode: 'boolean' }).notNull().default(false),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'critical'] }).notNull().default('medium'),
  column: text('column', { enum: ['backlog', 'todo', 'in_progress', 'review', 'done'] }).notNull().default('backlog'),
  assignee: text('assignee'),
  businessUnit: text('business_unit').notNull(),
  dueDate: text('due_date'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  order: integer('order').notNull().default(0),
});

export const nodeHealth = sqliteTable('node_health', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  hostname: text('hostname').notNull(),
  status: text('status', { enum: ['healthy', 'warning', 'critical', 'offline'] }).notNull().default('healthy'),
  cpuPercent: real('cpu_percent').notNull().default(0),
  memoryPercent: real('memory_percent').notNull().default(0),
  memoryUsedMb: real('memory_used_mb').notNull().default(0),
  memoryTotalMb: real('memory_total_mb').notNull().default(0),
  diskPercent: real('disk_percent').notNull().default(0),
  diskUsedGb: real('disk_used_gb').notNull().default(0),
  diskTotalGb: real('disk_total_gb').notNull().default(0),
  uptime: integer('uptime').notNull().default(0),
  lastUpdated: text('last_updated').notNull(),
  agentCount: integer('agent_count').notNull().default(0),
});
