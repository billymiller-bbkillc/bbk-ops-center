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

// ===== Queries =====

export async function getGlobalStats(): Promise<CrmGlobalStats> {
  const cached = getCached<CrmGlobalStats>('globalStats');
  if (cached) return cached;

  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM organizations)::int AS total_organizations,
        (SELECT COUNT(*) FROM users)::int AS total_users,
        (SELECT COUNT(*) FROM leads)::int AS total_leads,
        (SELECT COUNT(*) FROM deals)::int AS total_deals,
        (SELECT COUNT(*) FROM clients)::int AS total_clients,
        (SELECT COUNT(*) FROM companies)::int AS total_companies
    `);

    const row = result.rows[0];
    const stats: CrmGlobalStats = {
      totalOrganizations: row.total_organizations,
      totalUsers: row.total_users,
      totalLeads: row.total_leads,
      totalDeals: row.total_deals,
      totalClients: row.total_clients,
      totalCompanies: row.total_companies,
      lastChecked: new Date().toISOString(),
    };

    setCache('globalStats', stats);
    return stats;
  } catch (err) {
    console.error('CRM DB getGlobalStats failed:', err);
    throw err;
  }
}

export async function getOrganizations(): Promise<CrmOrganization[]> {
  const cached = getCached<CrmOrganization[]>('organizations');
  if (cached) return cached;

  try {
    const result = await pool.query(`
      SELECT
        o.id,
        o.name,
        COALESCE(o.status, 'active') AS status,
        COALESCE(o.plan_type, 'free') AS plan_type,
        COALESCE(o.subscription_tier, 'free') AS subscription_tier,
        COALESCE(o.seats, 1) AS seats,
        COALESCE(o.payment_status, 'none') AS payment_status,
        o.created_at,
        COALESCE(u.user_count, 0)::int AS user_count,
        COALESCE(l.lead_count, 0)::int AS lead_count,
        COALESCE(d.deal_count, 0)::int AS deal_count,
        COALESCE(c.client_count, 0)::int AS client_count
      FROM organizations o
      LEFT JOIN (SELECT organization_id, COUNT(*) AS user_count FROM users GROUP BY organization_id) u ON u.organization_id = o.id
      LEFT JOIN (SELECT organization_id, COUNT(*) AS lead_count FROM leads GROUP BY organization_id) l ON l.organization_id = o.id
      LEFT JOIN (SELECT organization_id, COUNT(*) AS deal_count FROM deals GROUP BY organization_id) d ON d.organization_id = o.id
      LEFT JOIN (SELECT organization_id, COUNT(*) AS client_count FROM clients GROUP BY organization_id) c ON c.organization_id = o.id
      ORDER BY (COALESCE(l.lead_count, 0) + COALESCE(d.deal_count, 0)) DESC, o.name ASC
    `);

    const orgs: CrmOrganization[] = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      planType: row.plan_type,
      subscriptionTier: row.subscription_tier,
      seats: row.seats,
      paymentStatus: row.payment_status,
      createdAt: row.created_at?.toISOString?.() || String(row.created_at),
      userCount: row.user_count,
      leadCount: row.lead_count,
      dealCount: row.deal_count,
      clientCount: row.client_count,
    }));

    setCache('organizations', orgs);
    return orgs;
  } catch (err) {
    console.error('CRM DB getOrganizations failed:', err);
    throw err;
  }
}

export async function getRecentActivity(limit = 20): Promise<CrmActivity[]> {
  const cached = getCached<CrmActivity[]>(`activity_${limit}`);
  if (cached) return cached;

  try {
    const result = await pool.query(`
      (
        SELECT 'lead' AS type, l.full_name AS name, o.name AS org_name, l.created_at
        FROM leads l JOIN organizations o ON o.id = l.organization_id
        ORDER BY l.created_at DESC LIMIT $1
      )
      UNION ALL
      (
        SELECT 'deal' AS type, d.deal_name AS name, o.name AS org_name, d.created_at
        FROM deals d JOIN organizations o ON o.id = d.organization_id
        ORDER BY d.created_at DESC LIMIT $1
      )
      UNION ALL
      (
        SELECT 'client' AS type, COALESCE(c.display_name, 'Unnamed Client') AS name, o.name AS org_name, c.created_at
        FROM clients c JOIN organizations o ON o.id = c.organization_id
        ORDER BY c.created_at DESC LIMIT $1
      )
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    const activity: CrmActivity[] = result.rows.map(row => ({
      type: row.type as 'lead' | 'deal' | 'client',
      name: row.name || 'Unnamed',
      orgName: row.org_name,
      createdAt: row.created_at?.toISOString?.() || String(row.created_at),
    }));

    setCache(`activity_${limit}`, activity);
    return activity;
  } catch (err) {
    console.error('CRM DB getRecentActivity failed:', err);
    throw err;
  }
}

export async function getLeadsByStatus(): Promise<CrmStatusBreakdown[]> {
  const cached = getCached<CrmStatusBreakdown[]>('leadsByStatus');
  if (cached) return cached;

  try {
    const result = await pool.query(`
      SELECT COALESCE(lead_status, 'unknown') AS status, COUNT(*)::int AS count
      FROM leads
      GROUP BY lead_status
      ORDER BY count DESC
    `);

    const breakdown: CrmStatusBreakdown[] = result.rows.map(row => ({
      status: row.status,
      count: row.count,
    }));

    setCache('leadsByStatus', breakdown);
    return breakdown;
  } catch (err) {
    console.error('CRM DB getLeadsByStatus failed:', err);
    throw err;
  }
}

export async function getDealsByStage(): Promise<CrmStatusBreakdown[]> {
  const cached = getCached<CrmStatusBreakdown[]>('dealsByStage');
  if (cached) return cached;

  try {
    const result = await pool.query(`
      SELECT COALESCE(stage, 'unknown') AS status, COUNT(*)::int AS count
      FROM deals
      GROUP BY stage
      ORDER BY count DESC
    `);

    const breakdown: CrmStatusBreakdown[] = result.rows.map(row => ({
      status: row.status,
      count: row.count,
    }));

    setCache('dealsByStage', breakdown);
    return breakdown;
  } catch (err) {
    console.error('CRM DB getDealsByStage failed:', err);
    throw err;
  }
}

// Test connection on import
pool.query('SELECT 1').then(() => {
  console.log('✅ CRM Database connected (Neon Postgres)');
}).catch(err => {
  console.error('❌ CRM Database connection failed:', err.message);
});
