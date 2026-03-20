import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db, schema, sqlite } from '../db';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.OPS_JWT_SECRET || 'bbk-ops-center-jwt-secret-change-me';
const JWT_EXPIRES_IN = '24h';

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
}

export interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate JWT
export function generateToken(user: AuthUser): string {
  const payload: JwtPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT — returns payload or null
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// Get user by username
export function getUserByUsername(username: string): any {
  return db.select().from(schema.users).where(eq(schema.users.username, username)).get();
}

// Get user by ID
export function getUserById(id: string): any {
  return db.select().from(schema.users).where(eq(schema.users.id, id)).get();
}

// Get all users (exclude password hash)
export function getAllUsers(): AuthUser[] {
  const rows = db.select().from(schema.users).all();
  return rows.map(r => ({
    id: r.id,
    username: r.username,
    displayName: r.displayName,
    role: r.role as UserRole,
  }));
}

// Create user
export async function createUser(username: string, password: string, displayName: string, role: UserRole): Promise<AuthUser> {
  const existing = getUserByUsername(username);
  if (existing) throw new Error('Username already exists');

  const id = randomUUID();
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  db.insert(schema.users).values({
    id,
    username,
    passwordHash,
    displayName,
    role,
    createdAt: now,
    lastLoginAt: null,
  }).run();

  return { id, username, displayName, role };
}

// Update user (admin only)
export async function updateUser(id: string, updates: { displayName?: string; role?: UserRole; password?: string }): Promise<AuthUser | null> {
  const user = getUserById(id);
  if (!user) return null;

  const setFields: any = {};
  if (updates.displayName) setFields.displayName = updates.displayName;
  if (updates.role) setFields.role = updates.role;
  if (updates.password) setFields.passwordHash = await hashPassword(updates.password);

  if (Object.keys(setFields).length > 0) {
    db.update(schema.users).set(setFields).where(eq(schema.users.id, id)).run();
  }

  const updated = getUserById(id);
  return updated ? { id: updated.id, username: updated.username, displayName: updated.displayName, role: updated.role as UserRole } : null;
}

// Delete user
export function deleteUser(id: string): boolean {
  const user = getUserById(id);
  if (!user) return false;
  db.delete(schema.users).where(eq(schema.users.id, id)).run();
  return true;
}

// Login — returns token + user or null
export async function login(username: string, password: string): Promise<{ token: string; user: AuthUser } | null> {
  const user = getUserByUsername(username);
  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  // Update last login
  db.update(schema.users).set({ lastLoginAt: new Date().toISOString() }).where(eq(schema.users.id, user.id)).run();

  const authUser: AuthUser = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role as UserRole,
  };

  const token = generateToken(authUser);
  return { token, user: authUser };
}

// Seed default admin if no users exist
export async function seedDefaultAdmin(): Promise<void> {
  const count = sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  if (count.count === 0) {
    const defaultPassword = process.env.OPS_ADMIN_PASSWORD || 'admin';
    await createUser('admin', defaultPassword, 'Administrator', 'admin');
    console.log('🔐 Default admin user created (username: admin, password: admin)');
    console.log('   ⚠️  Change the default password immediately!');
  }
}
