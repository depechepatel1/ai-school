import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("student" | "teacher" | "parent" | "admin")[];
}

// ⚡ DEV BYPASS: Set to true to skip all auth checks during development.
// Flip back to false when you want to re-enable auth protection.
const DEV_BYPASS_AUTH = import.meta.env.DEV;

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading, roleLoading } = useAuth();

  // In dev mode, skip all auth gates so every page is accessible immediately
  if (DEV_BYPASS_AUTH) {
    return <>{children}</>;
  }

  // Still loading auth session or role — show spinner, don't redirect
  if (loading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles) {
    if (!role) {
      return <Navigate to="/login" replace />;
    }
    if (!allowedRoles.includes(role)) {
      const redirectMap: Record<string, string> = { student: "/student", teacher: "/teacher", parent: "/parent", admin: "/admin" };
      return <Navigate to={redirectMap[role] || "/login"} replace />;
    }
  }

  return <>{children}</>;
}
