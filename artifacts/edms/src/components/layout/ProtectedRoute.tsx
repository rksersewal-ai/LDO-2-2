import { Navigate } from "react-router";
import { useAuth } from "../../lib/auth";
import type { UserRole } from "../../lib/auth";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(allowedRoles)) {
    return <Navigate to="/restricted" replace />;
  }

  return <>{children}</>;
}
