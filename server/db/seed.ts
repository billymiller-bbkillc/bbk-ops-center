import { runMigrations } from './migrate';
import { db, schema } from './index';
import { randomUUID } from 'crypto';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export function seed() {
  console.log('Running migrations...');
  runMigrations();

  // Only seed tasks — agents, health, and costs are now live from OpenClaw
  console.log('Seeding tasks...');
  db.delete(schema.tasks).run();

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

  console.log('✅ Seed complete (tasks only — agents/health/costs are now live)!');
}

// Run directly
seed();
