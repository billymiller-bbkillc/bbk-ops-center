import { Request, Response, NextFunction } from 'express';
import { verifyToken, type JwtPayload, type UserRole } from '../lib/auth';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Auth middleware — verifies JWT token
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for login endpoint and SSE (SSE has its own token check)
  const publicPaths = ['/api/auth/login', '/api/auth/setup-check', '/api/status'];
  if (publicPaths.some(p => req.path === p)) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }

  req.user = payload;
  next();
}

// Role-based access — must come after requireAuth
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
