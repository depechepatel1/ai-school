import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import DevNav from "@/components/DevNav";
import GlobalOmniChat from "@/components/GlobalOmniChat";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";

// Lazy-loaded route pages — each becomes its own chunk
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const StudentPractice = lazy(() => import("./pages/StudentPractice"));
const SpeakingStudio = lazy(() => import("./pages/SpeakingStudio"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
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

const queryClient = new QueryClient();

import { VIDEO_1_STACK } from "@/components/PageShell";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const INTRO_VIDEO = `${SUPABASE_URL}/storage/v1/object/public/videos/intro.mp4`;
const ANALYSIS_VIDEO = `${SUPABASE_URL}/storage/v1/object/public/videos/analysis-bg.mp4`;
const VIDEO_URLS = [...VIDEO_1_STACK, INTRO_VIDEO, ANALYSIS_VIDEO, "/images/dashboard-bg.jpg"];

const App = () => {
  // Prefetch only the first loop video eagerly; defer the rest so they don't
  // compete with auth, page chunks, and the initial video playback.
  useEffect(() => {
    // Eagerly prefetch first loop clip + dashboard bg (small)
    [VIDEO_1_STACK[0], "/images/dashboard-bg.jpg"].forEach((url) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = url.endsWith(".jpg") ? "image" : "video";
      link.href = url;
      document.head.appendChild(link);
    });

    // Defer remaining videos until browser is idle
    const deferredUrls = [...VIDEO_1_STACK.slice(1), INTRO_VIDEO, ANALYSIS_VIDEO];
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(() => {
        deferredUrls.forEach((url) => {
          const link = document.createElement("link");
          link.rel = "prefetch";
          link.as = "video";
          link.href = url;
          document.head.appendChild(link);
        });
      });
    } else {
      setTimeout(() => {
        deferredUrls.forEach((url) => {
          const link = document.createElement("link");
          link.rel = "prefetch";
          link.as = "video";
          link.href = url;
          document.head.appendChild(link);
        });
      }, 3000);
    }
  }, []);

  return (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <LanguageProvider>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<DashboardSkeleton />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/select-week" element={<ProtectedRoute allowedRoles={["student"]}><WeekSelection /></ProtectedRoute>} />
            <Route path="/student" element={<ProtectedRoute allowedRoles={["student"]}><StudentPractice /></ProtectedRoute>} />
            <Route path="/speaking" element={<ProtectedRoute allowedRoles={["student"]}><ErrorBoundary><SpeakingStudio /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/ielts/pronunciation" element={<ProtectedRoute allowedRoles={["student"]}><ErrorBoundary><IELTSPronunciation /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/ielts/fluency" element={<ProtectedRoute allowedRoles={["student"]}><ErrorBoundary><IELTSFluency /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/ielts/speaking" element={<ProtectedRoute allowedRoles={["student"]}><ErrorBoundary><IELTSSpeaking /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/igcse/pronunciation" element={<ProtectedRoute allowedRoles={["student"]}><ErrorBoundary><IGCSEPronunciation /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/igcse/fluency" element={<ProtectedRoute allowedRoles={["student"]}><ErrorBoundary><IGCSEFluency /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/igcse/speaking" element={<ProtectedRoute allowedRoles={["student"]}><ErrorBoundary><IGCSESpeaking /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/analysis" element={<ProtectedRoute allowedRoles={["student"]}><ErrorBoundary><StudentAnalysis /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute allowedRoles={["student"]}><StudentProfile /></ProtectedRoute>} />
            <Route path="/teacher" element={<ProtectedRoute allowedRoles={["teacher"]}><ErrorBoundary><TeacherDashboard /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/parent" element={<ProtectedRoute allowedRoles={["parent"]}><ParentDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><ErrorBoundary><AdminDashboard /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/admin/upload-videos" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUploadVideos /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <DevNav />
          <GlobalOmniChat />
        </AuthProvider>
      </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
