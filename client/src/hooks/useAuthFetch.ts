import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

export function useAuthFetch() {
  const { token, logout } = useAuth();

  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (options.body && typeof options.body === 'string') {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    const res = await fetch(url, { ...options, headers });
    
    // Auto-logout on 401
    if (res.status === 401) {
      logout();
    }
    
    return res;
  }, [token, logout]);

  return authFetch;
}
