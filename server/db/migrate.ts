import { sqlite } from './index';

export function runMigrations() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'offline',
      model TEXT NOT NULL,
      current_task TEXT,
      uptime INTEGER NOT NULL DEFAULT 0,
      last_seen TEXT NOT NULL,
      node_id TEXT NOT NULL,
      business_unit TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_sessions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id),
      started_at TEXT NOT NULL,
      ended_at TEXT,
      model TEXT NOT NULL,
      task TEXT NOT NULL,
      tokens_in INTEGER NOT NULL DEFAULT 0,
      tokens_out INTEGER NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS token_usage (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id),
      agent_name TEXT NOT NULL,
      model TEXT NOT NULL,
      date TEXT NOT NULL,
      tokens_in INTEGER NOT NULL DEFAULT 0,
      tokens_out INTEGER NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS budget_alerts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      threshold REAL NOT NULL,
      period TEXT NOT NULL,
      current_spend REAL NOT NULL DEFAULT 0,
      triggered INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'medium',
      "column" TEXT NOT NULL DEFAULT 'backlog',
      assignee TEXT,
      business_unit TEXT NOT NULL,
      due_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS node_health (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      hostname TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'healthy',
      cpu_percent REAL NOT NULL DEFAULT 0,
      memory_percent REAL NOT NULL DEFAULT 0,
      memory_used_mb REAL NOT NULL DEFAULT 0,
      memory_total_mb REAL NOT NULL DEFAULT 0,
      disk_percent REAL NOT NULL DEFAULT 0,
      disk_used_gb REAL NOT NULL DEFAULT 0,
      disk_total_gb REAL NOT NULL DEFAULT 0,
      uptime INTEGER NOT NULL DEFAULT 0,
      last_updated TEXT NOT NULL,
      agent_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT,
      severity TEXT NOT NULL DEFAULT 'info',
      business_unit TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS health_snapshots (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL,
      cpu_percent REAL NOT NULL,
      memory_percent REAL NOT NULL,
      disk_percent REAL NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      created_at TEXT NOT NULL,
      last_login_at TEXT
    );
  `);
}
