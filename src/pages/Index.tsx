import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function Index() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    console.log("[Index] auth state:", { loading, user: user?.email, role });
    if (loading) return;
    if (!user) {
      navigate("/signup", { replace: true });
      return;
    }
    if (!role) {
      console.warn("[Index] user authenticated but role is null — starting 5s timeout");
      return;
    }
    const routes: Record<string, string> = { student: "/select-week", teacher: "/teacher", parent: "/parent", admin: "/admin" };
    navigate(routes[role] || "/signup", { replace: true });
  }, [user, role, loading, navigate]);

  // 5-second timeout: if user exists but role never arrives, redirect to login
  useEffect(() => {
    if (loading || !user || role) {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      return;
    }
    timeoutRef.current = setTimeout(() => {
      toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
      navigate("/login", { replace: true });
    }, 5000);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [loading, user, role, navigate, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
