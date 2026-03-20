import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SALESPIPE_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Graceful shutdown
process.on('beforeExit', () => pool.end());

// ===== Cache =====
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 30_000; // 30 seconds
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ===== Types =====
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

// ===== Queries =====

export async function getQuickStats(): Promise<CrmQuickStats> {
  const cached = getCached<CrmQuickStats>('quickStats');
  if (cached) return cached;

  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM organizations)::int AS total_tenants,
        (SELECT COUNT(*) FROM users)::int AS total_users,
        (SELECT COUNT(DISTINCT o.id) FROM organizations o
         INNER JOIN users u ON u.organization_id = o.id
         WHERE u.last_login_at >= NOW() - INTERVAL '30 days'
        )::int AS active_tenants
    `);

    const row = result.rows[0];
    const stats: CrmQuickStats = {
      totalTenants: row.total_tenants,
      totalUsers: row.total_users,
      activeTenants: row.active_tenants,
      lastChecked: new Date().toISOString(),
    };

    setCache('quickStats', stats);
    return stats;
  } catch (err) {
    console.error('CRM DB getQuickStats failed:', err);
    throw err;
  }
}

export async function getTenantOverview(): Promise<CrmTenant[]> {
  const cached = getCached<CrmTenant[]>('tenantOverview');
  if (cached) return cached;

  try {
    const result = await pool.query(`
      SELECT
        o.id,
        o.name,
        COALESCE(o.status, 'active') AS status,
        COALESCE(o.plan_type, 'free') AS plan_type,
        COALESCE(o.subscription_tier, 'free') AS subscription_tier,
        o.created_at,
        COALESCE(u.user_count, 0)::int AS user_count
      FROM organizations o
      LEFT JOIN (
        SELECT organization_id, COUNT(*) AS user_count
        FROM users GROUP BY organization_id
      ) u ON u.organization_id = o.id
      ORDER BY u.user_count DESC NULLS LAST, o.name ASC
    `);

    const tenants: CrmTenant[] = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      planType: row.plan_type,
      subscriptionTier: row.subscription_tier,
      userCount: row.user_count,
      createdAt: row.created_at?.toISOString?.() || String(row.created_at),
    }));

    setCache('tenantOverview', tenants);
    return tenants;
  } catch (err) {
    console.error('CRM DB getTenantOverview failed:', err);
    throw err;
  }
}

export async function getUsersByTenant(orgId?: string): Promise<CrmUser[]> {
  const cacheKey = `users_${orgId || 'all'}`;
  const cached = getCached<CrmUser[]>(cacheKey);
  if (cached) return cached;

  try {
    const params: string[] = [];
    let whereClause = '';
    if (orgId) {
      params.push(orgId);
      whereClause = 'WHERE u.organization_id = $1';
    }

    const result = await pool.query(`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.organization_id,
        COALESCE(o.name, 'Unknown') AS org_name,
        u.last_login_at,
        COALESCE(u.login_count, 0)::int AS login_count,
        u.created_at
      FROM users u
      LEFT JOIN organizations o ON o.id = u.organization_id
      ${whereClause}
      ORDER BY u.last_login_at DESC NULLS LAST, u.created_at DESC
    `, params);

    const users: CrmUser[] = result.rows.map(row => ({
      id: row.id,
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      email: row.email,
      role: row.role || 'user',
      organizationId: row.organization_id,
      orgName: row.org_name,
      lastLoginAt: row.last_login_at?.toISOString?.() || null,
      loginCount: row.login_count,
      createdAt: row.created_at?.toISOString?.() || String(row.created_at),
    }));

    setCache(cacheKey, users);
    return users;
  } catch (err) {
    console.error('CRM DB getUsersByTenant failed:', err);
    throw err;
  }
}

export async function getLoginEvents(filters?: {
  orgId?: string;
  userId?: string;
  eventType?: string;
  limit?: number;
}): Promise<CrmLoginEvent[]> {
  const limit = filters?.limit || 50;
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  let paramIdx = 1;

  if (filters?.orgId) {
    conditions.push(`e.organization_id = $${paramIdx++}`);
    params.push(filters.orgId);
  }
  if (filters?.userId) {
    conditions.push(`e.user_id = $${paramIdx++}`);
    params.push(filters.userId);
  }
  if (filters?.eventType) {
    conditions.push(`e.event_type = $${paramIdx++}`);
    params.push(filters.eventType);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit);

  try {
    const result = await pool.query(`
      SELECT
        e.id,
        e.email,
        COALESCE(o.name, 'Unknown') AS org_name,
        e.event_type,
        e.ip_address,
        e.user_agent,
        e.created_at
      FROM user_login_events e
      LEFT JOIN organizations o ON o.id = e.organization_id
      ${whereClause}
      ORDER BY e.created_at DESC
      LIMIT $${paramIdx}
    `, params);

    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      orgName: row.org_name,
      eventType: row.event_type,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at?.toISOString?.() || String(row.created_at),
    }));
  } catch (err) {
    console.error('CRM DB getLoginEvents failed:', err);
    throw err;
  }
}

export async function getLoginStats(): Promise<CrmLoginStats> {
  const cached = getCached<CrmLoginStats>('loginStats');
  if (cached) return cached;

  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM user_login_events WHERE event_type = 'login')::int AS total_logins,
        (SELECT COUNT(DISTINCT user_id) FROM user_login_events WHERE event_type = 'login')::int AS unique_users,
        (SELECT COUNT(*) FROM user_login_events WHERE event_type = 'login' AND created_at >= CURRENT_DATE)::int AS logins_today,
        (SELECT COUNT(*) FROM user_login_events WHERE event_type = 'login' AND created_at >= DATE_TRUNC('week', CURRENT_DATE))::int AS logins_this_week,
        (SELECT COUNT(*) FROM user_login_events WHERE event_type = 'login' AND created_at >= DATE_TRUNC('month', CURRENT_DATE))::int AS logins_this_month
    `);

    const row = result.rows[0];
    const stats: CrmLoginStats = {
      totalLogins: row.total_logins,
      uniqueUsers: row.unique_users,
      loginsToday: row.logins_today,
      loginsThisWeek: row.logins_this_week,
      loginsThisMonth: row.logins_this_month,
    };

    setCache('loginStats', stats);
    return stats;
  } catch (err) {
    console.error('CRM DB getLoginStats failed:', err);
    throw err;
  }
}

export interface CrmFunnelData {
  totalSignups: number;
  activatedTenants: number; // logged in at least once
  activeRecent: number; // active in last 7 days
  // paid conversion would need Stripe data, so placeholder for now
  lastChecked: string;
}

export async function getFunnelData(): Promise<CrmFunnelData> {
  const cached = getCached<CrmFunnelData>('funnelData');
  if (cached) return cached;

  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM organizations)::int AS total_signups,
        (SELECT COUNT(DISTINCT o.id) FROM organizations o
         INNER JOIN users u ON u.organization_id = o.id
         WHERE u.login_count > 0
        )::int AS activated_tenants,
        (SELECT COUNT(DISTINCT o.id) FROM organizations o
         INNER JOIN users u ON u.organization_id = o.id
         WHERE u.last_login_at >= NOW() - INTERVAL '7 days'
        )::int AS active_recent
    `);

    const row = result.rows[0];
    const data: CrmFunnelData = {
      totalSignups: row.total_signups,
      activatedTenants: row.activated_tenants,
      activeRecent: row.active_recent,
      lastChecked: new Date().toISOString(),
    };

    setCache('funnelData', data);
    return data;
  } catch (err) {
    console.error('CRM DB getFunnelData failed:', err);
    throw err;
  }
}

export interface InactiveTenant {
  id: string;
  name: string;
  lastActivity: string | null;
  daysSinceLogin: number | null;
  userCount: number;
}

export async function getInactiveTenants(inactiveDays: number = 14): Promise<InactiveTenant[]> {
  const cached = getCached<InactiveTenant[]>(`inactiveTenants_${inactiveDays}`);
  if (cached) return cached;

  try {
    const result = await pool.query(`
      SELECT
        o.id,
        o.name,
        MAX(u.last_login_at) AS last_activity,
        EXTRACT(DAY FROM NOW() - MAX(u.last_login_at))::int AS days_since_login,
        COUNT(u.id)::int AS user_count
      FROM organizations o
      LEFT JOIN users u ON u.organization_id = o.id
      GROUP BY o.id, o.name
      HAVING MAX(u.last_login_at) IS NULL OR MAX(u.last_login_at) < NOW() - INTERVAL '${inactiveDays} days'
      ORDER BY last_activity ASC NULLS FIRST
    `);

    const tenants: InactiveTenant[] = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      lastActivity: row.last_activity?.toISOString?.() || null,
      daysSinceLogin: row.days_since_login,
      userCount: row.user_count,
    }));

    setCache(`inactiveTenants_${inactiveDays}`, tenants);
    return tenants;
  } catch (err) {
    console.error('CRM DB getInactiveTenants failed:', err);
    throw err;
  }
}

// Test connection on import
pool.query('SELECT 1').then(() => {
  console.log('✅ CRM Database connected (Neon Postgres)');
}).catch(err => {
  console.error('❌ CRM Database connection failed:', err.message);
});
