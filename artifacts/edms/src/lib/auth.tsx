import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import apiClient from "../services/ApiClient";
import { UserService } from "../services/UserService";

export type UserRole =
  | "admin"
  | "supervisor"
  | "engineer"
  | "reviewer"
  | "viewer";

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
  logout: (expired?: boolean) => void;
  clearError: () => void;
  hasPermission: (requiredRole: UserRole[]) => boolean;
  updateCurrentUser: (patch: Partial<User>) => void;
}

const SESSION_KEY = "ldo2_session";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    sessionExpired: false,
    error: null,
    loginAttempts: 0,
  });

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    const timestampStr = sessionStorage.getItem(`${SESSION_KEY}_ts`);
    if (saved && timestampStr) {
      try {
        const ts = parseInt(timestampStr, 10);
        if (Date.now() - ts > SESSION_TIMEOUT_MS) {
          sessionStorage.removeItem(SESSION_KEY);
          sessionStorage.removeItem(`${SESSION_KEY}_ts`);
          setState((s) => ({ ...s, isLoading: false, sessionExpired: true }));
        } else {
          const user = JSON.parse(saved) as User;
          setState((s) => ({
            ...s,
            user,
            isAuthenticated: true,
            isLoading: false,
          }));
        }
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(`${SESSION_KEY}_ts`);
        setState((s) => ({ ...s, isLoading: false }));
      }
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = async (
    username: string,
    password: string,
  ): Promise<boolean> => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const { token, user: apiUser } = await apiClient.login(
        username,
        password,
      );
      const user: User = {
        id: apiUser.id,
        username: apiUser.username,
        name: apiUser.name,
        designation: apiUser.designation,
        role: apiUser.role,
        department: apiUser.department ?? "",
        email: apiUser.email,
      };
      await UserService.ensureSessionUser(user);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
      sessionStorage.setItem(`${SESSION_KEY}_ts`, String(Date.now()));
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        sessionExpired: false,
        error: null,
        loginAttempts: 0,
      });
      return true;
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Invalid credentials. Please verify your username and password.";
      setState((s) => ({
        ...s,
        isLoading: false,
        error: message,
        loginAttempts: s.loginAttempts + 1,
      }));
      return false;
    }
  };

  const logout = useCallback((expired = false) => {
    try {
      apiClient.logout();
    } catch {
      // Fail silently
    }
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(`${SESSION_KEY}_ts`);
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      sessionExpired: expired,
      error: null,
      loginAttempts: 0,
    });
  }, []);

  // Listen for 401 auth:expired events from ApiClient
  useEffect(() => {
    const handleExpired = () => logout(true);
    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, [logout]);

  // Refresh session timestamp on user activity (sliding window)
  useEffect(() => {
    if (!state.isAuthenticated) return;
    const refreshTimestamp = () => {
      sessionStorage.setItem(`${SESSION_KEY}_ts`, String(Date.now()));
    };
    // Refresh on meaningful interactions
    window.addEventListener("click", refreshTimestamp, { passive: true });
    window.addEventListener("keydown", refreshTimestamp, { passive: true });
    return () => {
      window.removeEventListener("click", refreshTimestamp);
      window.removeEventListener("keydown", refreshTimestamp);
    };
  }, [state.isAuthenticated]);

  const clearError = () => setState((s) => ({ ...s, error: null }));

  const hasPermission = (requiredRoles: UserRole[]): boolean => {
    if (!state.user) return false;
    return requiredRoles.includes(state.user.role);
  };

  const updateCurrentUser = (patch: Partial<User>) => {
    setState((current) => {
      if (!current.user) {
        return current;
      }

      const user = { ...current.user, ...patch };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
      sessionStorage.setItem(`${SESSION_KEY}_ts`, String(Date.now()));
      void UserService.update(current.user.id, user);
      return { ...current, user };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        clearError,
        hasPermission,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
