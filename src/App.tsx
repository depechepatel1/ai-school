import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";

const DevNav = lazy(() => import("@/components/DevNav"));
const GlobalOmniChat = lazy(() => import("@/components/GlobalOmniChat"));

// Lazy-loaded route pages — each becomes its own chunk
// We store the import functions so we can prefetch them eagerly
const pageImports = {
  Index: () => import("./pages/Index"),
  Login: () => import("./pages/Login"),
  Signup: () => import("./pages/Signup"),
  ForgotPassword: () => import("./pages/ForgotPassword"),
  ResetPassword: () => import("./pages/ResetPassword"),
  StudentPractice: () => import("./pages/StudentPractice"),
  
  TeacherDashboard: () => import("./pages/TeacherDashboard"),
  ParentDashboard: () => import("./pages/ParentDashboard"),
  AdminDashboard: () => import("./pages/AdminDashboard"),
  NotFound: () => import("./pages/NotFound"),
  StudentAnalysis: () => import("./pages/StudentAnalysis"),
  StudentProfile: () => import("./pages/StudentProfile"),
  AdminUploadVideos: () => import("./pages/AdminUploadVideos"),
  WeekSelection: () => import("./pages/WeekSelection"),
  IELTSPronunciation: () => import("./pages/IELTSPronunciation"),
  IELTSFluency: () => import("./pages/IELTSFluency"),
  IELTSSpeaking: () => import("./pages/IELTSSpeaking"),
  IELTSMockTest: () => import("./pages/IELTSMockTest"),
  IGCSEPronunciation: () => import("./pages/IGCSEPronunciation"),
  IGCSEFluency: () => import("./pages/IGCSEFluency"),
  IGCSESpeaking: () => import("./pages/IGCSESpeaking"),
};

const Index = lazy(pageImports.Index);
const Login = lazy(pageImports.Login);
const Signup = lazy(pageImports.Signup);
const ForgotPassword = lazy(pageImports.ForgotPassword);
const ResetPassword = lazy(pageImports.ResetPassword);
const StudentPractice = lazy(pageImports.StudentPractice);

const TeacherDashboard = lazy(pageImports.TeacherDashboard);
const ParentDashboard = lazy(pageImports.ParentDashboard);
const AdminDashboard = lazy(pageImports.AdminDashboard);
const NotFound = lazy(pageImports.NotFound);
const StudentAnalysis = lazy(pageImports.StudentAnalysis);
const StudentProfile = lazy(pageImports.StudentProfile);
const AdminUploadVideos = lazy(pageImports.AdminUploadVideos);
const WeekSelection = lazy(pageImports.WeekSelection);
const IELTSPronunciation = lazy(pageImports.IELTSPronunciation);
const IELTSFluency = lazy(pageImports.IELTSFluency);
const IELTSSpeaking = lazy(pageImports.IELTSSpeaking);
const IELTSMockTest = lazy(pageImports.IELTSMockTest);
const IGCSEPronunciation = lazy(pageImports.IGCSEPronunciation);
const IGCSEFluency = lazy(pageImports.IGCSEFluency);
const IGCSESpeaking = lazy(pageImports.IGCSESpeaking);

// Prefetch chunks for the current route immediately (runs during auth resolution)
const pathPrefetchMap: Record<string, (() => Promise<unknown>)[]> = {
  "/": [pageImports.Index, pageImports.Signup, pageImports.WeekSelection],
  "/login": [pageImports.Login],
  "/signup": [pageImports.Signup],
  "/forgot-password": [pageImports.ForgotPassword],
  "/reset-password": [pageImports.ResetPassword],
  "/select-week": [pageImports.WeekSelection, pageImports.StudentPractice],
  "/student": [pageImports.StudentPractice],
  "/speaking": [pageImports.SpeakingStudio],
  "/ielts/pronunciation": [pageImports.IELTSPronunciation],
  "/ielts/fluency": [pageImports.IELTSFluency],
  "/ielts/speaking": [pageImports.IELTSSpeaking],
  "/ielts/mock-test": [pageImports.IELTSMockTest],
  "/igcse/pronunciation": [pageImports.IGCSEPronunciation],
  "/igcse/fluency": [pageImports.IGCSEFluency],
  "/igcse/speaking": [pageImports.IGCSESpeaking],
  "/analysis": [pageImports.StudentAnalysis],
  "/profile": [pageImports.StudentProfile],
  "/teacher": [pageImports.TeacherDashboard],
  "/parent": [pageImports.ParentDashboard],
  "/admin": [pageImports.AdminDashboard],
  "/admin/upload-videos": [pageImports.AdminUploadVideos],
};

// Fire prefetch immediately at module load time — no waiting for React to mount
const prefetches = pathPrefetchMap[window.location.pathname];
if (prefetches) {
  prefetches.forEach((fn) => fn());
}

const queryClient = new QueryClient();

const App = () => {
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
            <Route path="/ielts/mock-test" element={<ProtectedRoute allowedRoles={["student"]}><ErrorBoundary><IELTSMockTest /></ErrorBoundary></ProtectedRoute>} />
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
