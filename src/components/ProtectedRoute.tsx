import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("student" | "teacher" | "parent" | "admin")[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  // TEMPORARY DEV BYPASS — remove before production
  if (import.meta.env.DEV) return <>{children}</>;

  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const redirectMap: Record<string, string> = { student: "/student", teacher: "/teacher", parent: "/parent", admin: "/admin" };
    return <Navigate to={redirectMap[role] || "/login"} replace />;
  }

  return <>{children}</>;
}
