import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// JWT token decoder
function parseJwt(token: string): { exp?: number; iat?: number } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// Check if token is expired or about to expire
function getTokenStatus(token: string | null): { valid: boolean; expiresIn?: number; expired: boolean } {
  if (!token) {
    return { valid: false, expired: true };
  }

  const payload = parseJwt(token);
  if (!payload || !payload.exp) {
    return { valid: false, expired: true };
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = payload.exp - now;

  // Token is expired if exp is in the past
  if (expiresIn <= 0) {
    return { valid: false, expired: true, expiresIn: 0 };
  }

  // Token is valid but expires within 5 minutes - consider it "about to expire"
  return { valid: true, expired: false, expiresIn };
}

export function useAuthSession() {
  const navigate = useNavigate();
  const { token, logout } = useAuthStore();

  const checkSession = useCallback(() => {
    const status = getTokenStatus(token);

    if (status.expired) {
      console.log('[AuthSession] Token expired, logging out');
      logout();
      navigate('/login');
      return false;
    }

    // Warn if token expires in less than 5 minutes
    if (status.expiresIn && status.expiresIn < 300) {
      console.log(`[AuthSession] Token expires in ${status.expiresIn}s`);
      // Could show a warning toast here
    }

    return true;
  }, [token, logout, navigate]);

  // Check session on mount and when token changes
  useEffect(() => {
    if (token) {
      checkSession();
    }
  }, [token, checkSession]);

  // Periodic session check (every 30 seconds)
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      checkSession();
    }, 30000);

    return () => clearInterval(interval);
  }, [token, checkSession]);

  return { checkSession };
}

export default useAuthSession;
