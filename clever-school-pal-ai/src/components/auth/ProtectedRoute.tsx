
import { Navigate } from "react-router-dom";
import { useUnifiedAuth } from "@/contexts/UnifiedAuthContext";
import { ReactNode } from "react";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useUnifiedAuth();

  if (import.meta.env.DEV) {
    console.log("ProtectedRoute - user:", user ? "Authenticated" : "Not authenticated", "isLoading:", isLoading);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-education-primary"></div>
      </div>
    );
  }

  // ✅ SEGURANÇA: Apenas usuários autenticados via Supabase
  if (!user) {
    if (import.meta.env.DEV) {
      console.log("No user found, redirecting to login");
    }
    return <Navigate to="/login" replace />;
  }

  if (import.meta.env.DEV) {
    console.log("User authenticated, rendering protected content");
  }
  return <>{children}</>;
}

export function PublicRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useUnifiedAuth();

  if (import.meta.env.DEV) {
    console.log("PublicRoute - user:", user ? "Authenticated" : "Not authenticated", "isLoading:", isLoading);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-education-primary"></div>
      </div>
    );
  }

  // ✅ SEGURANÇA: Apenas usuários autenticados via Supabase
  if (user) {
    if (import.meta.env.DEV) {
      console.log("User already authenticated, redirecting to home");
    }
    return <Navigate to="/" replace />;
  }

  if (import.meta.env.DEV) {
    console.log("No user found, rendering public content");
  }
  return <>{children}</>;
}
