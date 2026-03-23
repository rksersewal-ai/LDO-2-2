import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'admin' | 'supervisor' | 'engineer' | 'reviewer' | 'viewer';

export interface User {
  id: string;
  username: string;
  name: string;
  designation: string;
  role: UserRole;
  department: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
  error: string | null;
  loginAttempts: number;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  hasPermission: (requiredRole: UserRole[]) => boolean;
}

const MOCK_USERS: Record<string, { password: string; user: User }> = {
  'a.kowalski': {
    password: 'ldo2pass',
    user: {
      id: 'USR-001',
      username: 'a.kowalski',
      name: 'A. Kowalski',
      designation: 'Senior Engineer',
      role: 'engineer',
      department: 'Engineering',
      email: 'a.kowalski@ldo-internal.net'
    }
  },
  'admin': {
    password: 'admin123',
    user: {
      id: 'USR-000',
      username: 'admin',
      name: 'System Admin',
      designation: 'System Administrator',
      role: 'admin',
      department: 'IT Operations',
      email: 'admin@ldo-internal.net'
    }
  },
  'm.chen': {
    password: 'ldo2pass',
    user: {
      id: 'USR-002',
      username: 'm.chen',
      name: 'M. Chen',
      designation: 'Compliance Lead',
      role: 'reviewer',
      department: 'Compliance',
      email: 'm.chen@ldo-internal.net'
    }
  },
  's.patel': {
    password: 'ldo2pass',
    user: {
      id: 'USR-003',
      username: 's.patel',
      name: 'S. Patel',
      designation: 'Senior Supervisor',
      role: 'supervisor',
      department: 'Production Engineering',
      email: 's.patel@ldo-internal.net'
    }
  }
};

const SESSION_KEY = 'ldo2_session';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    sessionExpired: false,
    error: null,
    loginAttempts: 0
  });

  // Session restore
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const user = JSON.parse(saved) as User;
        setState(s => ({ ...s, user, isAuthenticated: true, isLoading: false }));
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
        setState(s => ({ ...s, isLoading: false }));
      }
    } else {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    // Simulate network delay
    await new Promise(r => setTimeout(r, 1200));

    const entry = MOCK_USERS[username.toLowerCase()];
    if (entry && entry.password === password) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(entry.user));
      setState({
        user: entry.user,
        isAuthenticated: true,
        isLoading: false,
        sessionExpired: false,
        error: null,
        loginAttempts: 0
      });
      return true;
    }

    setState(s => ({
      ...s,
      isLoading: false,
      error: 'Invalid credentials. Please verify your username and password.',
      loginAttempts: s.loginAttempts + 1
    }));
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      sessionExpired: false,
      error: null,
      loginAttempts: 0
    });
  };

  const expireSession = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      sessionExpired: true,
      error: null,
      loginAttempts: 0
    });
  };

  // Simulate session expiry after 30 minutes (for demo, we won't auto-expire)
  const hasPermission = (requiredRoles: UserRole[]) => {
    if (!state.user) return false;
    if (state.user.role === 'admin') return true;
    return requiredRoles.includes(state.user.role);
  };

  const clearError = () => setState(s => ({ ...s, error: null, sessionExpired: false }));

  return (
    <AuthContext.Provider value={{ ...state, login, logout, clearError, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
