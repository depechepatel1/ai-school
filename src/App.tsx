import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import NetworkStatus from "@/components/NetworkStatus";
import DevToolbar from "@/components/DevToolbar";

// Eagerly load landing + auth pages (first paint)
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

// Lazy-load everything else for smaller initial bundle
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const StudentPractice = lazy(() => import("./pages/StudentPractice"));
const SpeakingStudio = lazy(() => import("./pages/SpeakingStudio"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const StudentAnalysis = lazy(() => import("./pages/StudentAnalysis"));
const StudentProfile = lazy(() => import("./pages/StudentProfile"));
const AdminUploadVideos = lazy(() => import("./pages/AdminUploadVideos"));
const WeekSelection = lazy(() => import("./pages/WeekSelection"));
const IELTSPronunciation = lazy(() => import("./pages/IELTSPronunciation"));
const IELTSFluency = lazy(() => import("./pages/IELTSFluency"));
const IELTSSpeaking = lazy(() => import("./pages/IELTSSpeaking"));
const IGCSEPronunciation = lazy(() => import("./pages/IGCSEPronunciation"));
const IGCSEFluency = lazy(() => import("./pages/IGCSEFluency"));
const IGCSESpeaking = lazy(() => import("./pages/IGCSESpeaking"));
const GlobalOmniChat = lazy(() => import("@/components/GlobalOmniChat"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

import { VIDEO_1_STACK } from "@/components/PageShell";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const INTRO_VIDEO = `${SUPABASE_URL}/storage/v1/object/public/videos/intro.mp4`;
const ANALYSIS_VIDEO = `${SUPABASE_URL}/storage/v1/object/public/videos/analysis-bg.mp4`;
const VIDEO_URLS = [...VIDEO_1_STACK, INTRO_VIDEO, ANALYSIS_VIDEO, "/images/dashboard-bg.jpg"];

const App = () => { // rebuild trigger
  useEffect(() => {
    VIDEO_URLS.forEach((url) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? "image" : "video";
      link.href = url;
      document.head.appendChild(link);
    });
  }, []);

  return (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <LanguageProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <NetworkStatus />
          {import.meta.env.DEV && (
            <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[9999] px-3 py-0.5 bg-destructive text-destructive-foreground text-xs font-mono tracking-widest rounded-b-md opacity-80 pointer-events-none select-none">
              DEV MODE — AUTH BYPASSED
            </div>
          )}
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/select-week" element={<ProtectedRoute allowedRoles={["student"]}><WeekSelection /></ProtectedRoute>} />
            <Route path="/student" element={<ProtectedRoute allowedRoles={["student"]}><StudentPractice /></ProtectedRoute>} />
            <Route path="/speaking" element={<ProtectedRoute allowedRoles={["student"]}><SpeakingStudio /></ProtectedRoute>} />
            <Route path="/ielts/pronunciation" element={<ProtectedRoute allowedRoles={["student"]}><IELTSPronunciation /></ProtectedRoute>} />
            <Route path="/ielts/fluency" element={<ProtectedRoute allowedRoles={["student"]}><IELTSFluency /></ProtectedRoute>} />
            <Route path="/ielts/speaking" element={<ProtectedRoute allowedRoles={["student"]}><IELTSSpeaking /></ProtectedRoute>} />
            <Route path="/igcse/pronunciation" element={<ProtectedRoute allowedRoles={["student"]}><IGCSEPronunciation /></ProtectedRoute>} />
            <Route path="/igcse/fluency" element={<ProtectedRoute allowedRoles={["student"]}><IGCSEFluency /></ProtectedRoute>} />
            <Route path="/igcse/speaking" element={<ProtectedRoute allowedRoles={["student"]}><IGCSESpeaking /></ProtectedRoute>} />
            <Route path="/analysis" element={<ProtectedRoute allowedRoles={["student"]}><StudentAnalysis /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute allowedRoles={["student"]}><StudentProfile /></ProtectedRoute>} />
            <Route path="/teacher" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/parent" element={<ProtectedRoute allowedRoles={["parent"]}><ParentDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/upload-videos" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUploadVideos /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <Suspense fallback={null}>
            <GlobalOmniChat />
          </Suspense>
          {import.meta.env.DEV && <DevToolbar />}
        </AuthProvider>
      </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
