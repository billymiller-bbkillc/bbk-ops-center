import { db, schema, sqlite } from '../db';
import { randomUUID } from 'crypto';

export type ActivityType = 'task_move' | 'task_create' | 'task_delete' | 'agent_status' | 'agent_kill' | 'build' | 'error' | 'approval' | 'system';
export type Severity = 'info' | 'warning' | 'error' | 'critical';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  source: string;
  title: string;
  detail?: string;
  severity: Severity;
  businessUnit?: string;
  timestamp: string;
}

export function logActivity(entry: Omit<ActivityEntry, 'id' | 'timestamp'>): ActivityEntry {
  const record: ActivityEntry = {
    ...entry,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  };
  db.insert(schema.activityLog).values({
    id: record.id,
    type: record.type,
    source: record.source,
    title: record.title,
    detail: record.detail || null,
    severity: record.severity,
    businessUnit: record.businessUnit || null,
    timestamp: record.timestamp,
  }).run();
  return record;
}

export function getActivity(filters?: {
  type?: string;
  source?: string;
  severity?: string;
  businessUnit?: string;
  since?: string;
  limit?: number;
}): ActivityEntry[] {
  const limit = filters?.limit || 100;

  // Use raw SQL for flexibility with optional filters
  let query = 'SELECT * FROM activity_log WHERE 1=1';
  const params: any[] = [];

  if (filters?.type) {
    query += ' AND type = ?';
    params.push(filters.type);
  }
  if (filters?.source) {
    query += ' AND source = ?';
    params.push(filters.source);
  }
  if (filters?.severity) {
    query += ' AND severity = ?';
    params.push(filters.severity);
  }
  if (filters?.businessUnit) {
    query += ' AND business_unit = ?';
    params.push(filters.businessUnit);
  }
  if (filters?.since) {
    query += ' AND timestamp >= ?';
    params.push(filters.since);
  }

  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);

  const rows = sqlite.prepare(query).all(...params);
  return (rows as any[]).map((r: any) => ({
    id: r.id,
    type: r.type,
    source: r.source,
    title: r.title,
    detail: r.detail,
    severity: r.severity,
    businessUnit: r.business_unit,
    timestamp: r.timestamp,
  }));
}

// Get the last N activities (for the overview ticker)
export function getRecentActivity(count: number = 10): ActivityEntry[] {
  return getActivity({ limit: count });
}
