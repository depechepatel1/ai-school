import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function Index() {
  usePageTitle();
  const { user, role, loading, roleLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (import.meta.env.DEV) {
      navigate("/student", { replace: true });
      return;
    }
    if (loading || roleLoading) return;
    if (!user) {
      navigate("/signup", { replace: true });
      return;
    }
    const routes: Record<string, string> = { student: "/select-week", teacher: "/teacher", parent: "/parent", admin: "/admin" };
    navigate(routes[role ?? ""] || "/signup", { replace: true });
  }, [user, role, loading, roleLoading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}