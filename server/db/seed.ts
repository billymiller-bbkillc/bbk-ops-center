import { runMigrations } from './migrate';
import { db, schema } from './index';
import { randomUUID } from 'crypto';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function hoursAgo(n: number): string {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
}

export function seed() {
  console.log('Running migrations...');
  runMigrations();

  // Clear existing data
  db.delete(schema.agentSessions).run();
  db.delete(schema.tokenUsage).run();
  db.delete(schema.budgetAlerts).run();
  db.delete(schema.tasks).run();
  db.delete(schema.nodeHealth).run();
  db.delete(schema.agents).run();

  console.log('Seeding agents...');
  const agentData = [
    { id: 'agent-bubba', name: 'Bubba', status: 'online' as const, model: 'claude-opus-4-6', currentTask: 'Building BBK Ops Center dashboard', uptime: 86400, lastSeen: new Date().toISOString(), nodeId: 'node-primary', businessUnit: 'BBK Holdings' },
    { id: 'agent-sales', name: 'SalesBot', status: 'busy' as const, model: 'claude-sonnet-4-20250514', currentTask: 'Processing lead qualification pipeline', uptime: 43200, lastSeen: new Date().toISOString(), nodeId: 'node-primary', businessUnit: 'SalesPipeCRM' },
    { id: 'agent-support', name: 'SupportAgent', status: 'online' as const, model: 'gpt-4o', currentTask: null, uptime: 172800, lastSeen: new Date().toISOString(), nodeId: 'node-secondary', businessUnit: 'SalesPipeCRM' },
    { id: 'agent-analytics', name: 'DataCruncher', status: 'busy' as const, model: 'claude-opus-4-6', currentTask: 'Generating Q1 revenue forecast models', uptime: 7200, lastSeen: new Date().toISOString(), nodeId: 'node-analytics', businessUnit: 'BBK Holdings' },
    { id: 'agent-content', name: 'ContentWriter', status: 'online' as const, model: 'claude-sonnet-4-20250514', currentTask: 'Drafting product launch copy', uptime: 54000, lastSeen: hoursAgo(1), nodeId: 'node-secondary', businessUnit: 'Modivaro' },
    { id: 'agent-devops', name: 'InfraBot', status: 'online' as const, model: 'gpt-4o', currentTask: 'Monitoring deployment pipelines', uptime: 259200, lastSeen: new Date().toISOString(), nodeId: 'node-primary', businessUnit: 'BBK Holdings' },
    { id: 'agent-research', name: 'ResearchAgent', status: 'offline' as const, model: 'claude-opus-4-6', currentTask: null, uptime: 0, lastSeen: hoursAgo(6), nodeId: 'node-analytics', businessUnit: 'Clarigo' },
    { id: 'agent-foreclosure', name: 'ForeclosureBot', status: 'error' as const, model: 'claude-sonnet-4-20250514', currentTask: 'Error: API rate limit exceeded', uptime: 1800, lastSeen: hoursAgo(2), nodeId: 'node-secondary', businessUnit: 'RealForeclosure' },
  ];

  for (const agent of agentData) {
    db.insert(schema.agents).values(agent).run();
  }

  console.log('Seeding agent sessions...');
  const sessions = [
    { id: randomUUID(), agentId: 'agent-bubba', startedAt: hoursAgo(24), endedAt: hoursAgo(20), model: 'claude-opus-4-6', task: 'Architecture review for SalesPipeCRM v2', tokensIn: 45000, tokensOut: 12000, cost: 2.85, status: 'completed' as const },
    { id: randomUUID(), agentId: 'agent-bubba', startedAt: hoursAgo(18), endedAt: hoursAgo(15), model: 'claude-opus-4-6', task: 'Database schema design for Ops Center', tokensIn: 62000, tokensOut: 18500, cost: 4.02, status: 'completed' as const },
    { id: randomUUID(), agentId: 'agent-bubba', startedAt: hoursAgo(2), endedAt: null, model: 'claude-opus-4-6', task: 'Building BBK Ops Center dashboard', tokensIn: 120000, tokensOut: 45000, cost: 8.25, status: 'active' as const },
    { id: randomUUID(), agentId: 'agent-sales', startedAt: hoursAgo(12), endedAt: hoursAgo(8), model: 'claude-sonnet-4-20250514', task: 'Lead scoring batch processing', tokensIn: 85000, tokensOut: 25000, cost: 1.65, status: 'completed' as const },
    { id: randomUUID(), agentId: 'agent-sales', startedAt: hoursAgo(4), endedAt: null, model: 'claude-sonnet-4-20250514', task: 'Processing lead qualification pipeline', tokensIn: 42000, tokensOut: 15000, cost: 0.86, status: 'active' as const },
    { id: randomUUID(), agentId: 'agent-support', startedAt: hoursAgo(48), endedAt: hoursAgo(46), model: 'gpt-4o', task: 'Customer ticket triage batch', tokensIn: 38000, tokensOut: 12000, cost: 0.75, status: 'completed' as const },
    { id: randomUUID(), agentId: 'agent-analytics', startedAt: hoursAgo(3), endedAt: null, model: 'claude-opus-4-6', task: 'Generating Q1 revenue forecast models', tokensIn: 200000, tokensOut: 55000, cost: 12.75, status: 'active' as const },
    { id: randomUUID(), agentId: 'agent-content', startedAt: hoursAgo(6), endedAt: hoursAgo(4), model: 'claude-sonnet-4-20250514', task: 'Blog series on AI-driven sales', tokensIn: 55000, tokensOut: 32000, cost: 1.31, status: 'completed' as const },
    { id: randomUUID(), agentId: 'agent-devops', startedAt: hoursAgo(72), endedAt: null, model: 'gpt-4o', task: 'Monitoring deployment pipelines', tokensIn: 15000, tokensOut: 3000, cost: 0.27, status: 'active' as const },
    { id: randomUUID(), agentId: 'agent-foreclosure', startedAt: hoursAgo(3), endedAt: hoursAgo(2), model: 'claude-sonnet-4-20250514', task: 'Scraping foreclosure listings', tokensIn: 28000, tokensOut: 8000, cost: 0.54, status: 'failed' as const },
  ];

  for (const session of sessions) {
    db.insert(schema.agentSessions).values(session).run();
  }

  console.log('Seeding token usage (30 days)...');
  const models = ['claude-opus-4-6', 'claude-sonnet-4-20250514', 'gpt-4o'];
  const modelCostPer1k = { 'claude-opus-4-6': 0.015, 'claude-sonnet-4-20250514': 0.003, 'gpt-4o': 0.005 };

  for (let day = 29; day >= 0; day--) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    const dateStr = date.toISOString().split('T')[0];

    for (const agent of agentData) {
      if (agent.status === 'offline' && day < 5) continue;
      const model = agent.model;
      const baseTokensIn = Math.floor(15000 + Math.random() * 80000);
      const baseTokensOut = Math.floor(baseTokensIn * (0.2 + Math.random() * 0.4));
      const costRate = modelCostPer1k[model as keyof typeof modelCostPer1k] || 0.005;
      const cost = ((baseTokensIn + baseTokensOut) / 1000) * costRate;

      db.insert(schema.tokenUsage).values({
        id: randomUUID(),
        agentId: agent.id,
        agentName: agent.name,
        model,
        date: dateStr,
        tokensIn: baseTokensIn,
        tokensOut: baseTokensOut,
        cost: Math.round(cost * 100) / 100,
      }).run();
    }
  }

  console.log('Seeding budget alerts...');
  const alerts = [
    { id: randomUUID(), name: 'Daily Spend Limit', threshold: 50, period: 'daily' as const, currentSpend: 32.45, triggered: false },
    { id: randomUUID(), name: 'Weekly Budget', threshold: 250, period: 'weekly' as const, currentSpend: 187.32, triggered: false },
    { id: randomUUID(), name: 'Monthly Cap', threshold: 1000, period: 'monthly' as const, currentSpend: 743.89, triggered: false },
    { id: randomUUID(), name: 'Opus Alert', threshold: 100, period: 'weekly' as const, currentSpend: 112.50, triggered: true },
  ];

  for (const alert of alerts) {
    db.insert(schema.budgetAlerts).values(alert).run();
  }

  console.log('Seeding tasks...');
  const taskData = [
    { id: randomUUID(), title: 'SalesPipeCRM v2 API redesign', description: 'Refactor REST API to support bulk operations and webhook integrations', priority: 'critical' as const, column: 'in_progress' as const, assignee: 'Bubba', businessUnit: 'SalesPipeCRM', dueDate: '2026-03-20', createdAt: daysAgo(7), updatedAt: daysAgo(1), order: 0 },
    { id: randomUUID(), title: 'Implement lead scoring ML model', description: 'Train and deploy ML model for automated lead scoring based on engagement data', priority: 'high' as const, column: 'in_progress' as const, assignee: 'DataCruncher', businessUnit: 'SalesPipeCRM', dueDate: '2026-03-25', createdAt: daysAgo(14), updatedAt: daysAgo(2), order: 1 },
    { id: randomUUID(), title: 'Ops Center Phase 1', description: 'Build the BBK Operations Center dashboard with fleet monitoring, costs, kanban, and system health', priority: 'critical' as const, column: 'in_progress' as const, assignee: 'Bubba', businessUnit: 'BBK Holdings', dueDate: '2026-03-17', createdAt: daysAgo(3), updatedAt: daysAgo(0), order: 2 },
    { id: randomUUID(), title: 'Set up CI/CD pipeline', description: 'GitHub Actions workflows for automated testing and deployment', priority: 'high' as const, column: 'todo' as const, assignee: 'InfraBot', businessUnit: 'BBK Holdings', dueDate: '2026-03-22', createdAt: daysAgo(5), updatedAt: daysAgo(5), order: 0 },
    { id: randomUUID(), title: 'Customer onboarding flow redesign', description: 'Streamline the onboarding experience for new SalesPipeCRM users', priority: 'medium' as const, column: 'todo' as const, assignee: 'ContentWriter', businessUnit: 'SalesPipeCRM', dueDate: '2026-04-01', createdAt: daysAgo(10), updatedAt: daysAgo(3), order: 1 },
    { id: randomUUID(), title: 'Foreclosure data pipeline', description: 'Automated scraping and processing of county foreclosure records', priority: 'medium' as const, column: 'backlog' as const, assignee: 'ForeclosureBot', businessUnit: 'RealForeclosure', dueDate: null, createdAt: daysAgo(20), updatedAt: daysAgo(20), order: 0 },
    { id: randomUUID(), title: 'Modivaro landing page refresh', description: 'Update the marketing site with new brand assets and testimonials', priority: 'low' as const, column: 'backlog' as const, assignee: null, businessUnit: 'Modivaro', dueDate: null, createdAt: daysAgo(15), updatedAt: daysAgo(15), order: 1 },
    { id: randomUUID(), title: 'API rate limiting middleware', description: 'Implement token bucket rate limiting for all public API endpoints', priority: 'high' as const, column: 'review' as const, assignee: 'Bubba', businessUnit: 'SalesPipeCRM', dueDate: '2026-03-18', createdAt: daysAgo(8), updatedAt: daysAgo(1), order: 0 },
    { id: randomUUID(), title: 'Clarigo research database schema', description: 'Design the core schema for legal research document storage and retrieval', priority: 'medium' as const, column: 'backlog' as const, assignee: 'ResearchAgent', businessUnit: 'Clarigo', dueDate: null, createdAt: daysAgo(12), updatedAt: daysAgo(12), order: 2 },
    { id: randomUUID(), title: 'Weekly stakeholder report automation', description: 'Auto-generate weekly reports from agent activity and project metrics', priority: 'medium' as const, column: 'todo' as const, assignee: 'DataCruncher', businessUnit: 'BBK Holdings', dueDate: '2026-03-28', createdAt: daysAgo(4), updatedAt: daysAgo(4), order: 2 },
    { id: randomUUID(), title: 'Email template system', description: 'Build reusable email templates for SalesPipeCRM campaigns', priority: 'medium' as const, column: 'done' as const, assignee: 'ContentWriter', businessUnit: 'SalesPipeCRM', dueDate: '2026-03-10', createdAt: daysAgo(21), updatedAt: daysAgo(6), order: 0 },
    { id: randomUUID(), title: 'Database backup automation', description: 'Automated daily SQLite backups with rotation and S3 upload', priority: 'high' as const, column: 'done' as const, assignee: 'InfraBot', businessUnit: 'BBK Holdings', dueDate: '2026-03-12', createdAt: daysAgo(18), updatedAt: daysAgo(4), order: 1 },
  ];

  for (const task of taskData) {
    db.insert(schema.tasks).values(task).run();
  }

  console.log('Seeding node health...');
  const nodes = [
    { id: 'node-primary', name: 'Primary Node', hostname: 'bbk-prod-01.local', status: 'healthy' as const, cpuPercent: 34.2, memoryPercent: 61.5, memoryUsedMb: 7864, memoryTotalMb: 12788, diskPercent: 45.2, diskUsedGb: 226, diskTotalGb: 500, uptime: 2592000, lastUpdated: new Date().toISOString(), agentCount: 3 },
    { id: 'node-secondary', name: 'Secondary Node', hostname: 'bbk-prod-02.local', status: 'healthy' as const, cpuPercent: 22.8, memoryPercent: 44.3, memoryUsedMb: 5666, memoryTotalMb: 12788, diskPercent: 32.1, diskUsedGb: 160, diskTotalGb: 500, uptime: 1728000, lastUpdated: new Date().toISOString(), agentCount: 3 },
    { id: 'node-analytics', name: 'Analytics Node', hostname: 'bbk-analytics-01.local', status: 'warning' as const, cpuPercent: 78.5, memoryPercent: 85.2, memoryUsedMb: 27341, memoryTotalMb: 32112, diskPercent: 67.8, diskUsedGb: 678, diskTotalGb: 1000, uptime: 864000, lastUpdated: new Date().toISOString(), agentCount: 2 },
    { id: 'node-staging', name: 'Staging Node', hostname: 'bbk-staging-01.local', status: 'critical' as const, cpuPercent: 92.1, memoryPercent: 94.7, memoryUsedMb: 7592, memoryTotalMb: 8019, diskPercent: 91.3, diskUsedGb: 456, diskTotalGb: 500, uptime: 43200, lastUpdated: hoursAgo(1), agentCount: 0 },
  ];

  for (const node of nodes) {
    db.insert(schema.nodeHealth).values(node).run();
  }

  console.log('✅ Seed complete!');
}

// Run directly
seed();
