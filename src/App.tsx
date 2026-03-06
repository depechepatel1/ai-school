import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import StudentPractice from "./pages/StudentPractice";
import SpeakingStudio from "./pages/SpeakingStudio";
import TeacherDashboard from "./pages/TeacherDashboard";
import ParentDashboard from "./pages/ParentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import StudentAnalysis from "./pages/StudentAnalysis";
import StudentProfile from "./pages/StudentProfile";
import DevNav from "@/components/DevNav";
import AdminUploadVideos from "./pages/AdminUploadVideos";
import WeekSelection from "./pages/WeekSelection";
import IELTSPronunciation from "./pages/IELTSPronunciation";
import IELTSFluency from "./pages/IELTSFluency";
import IELTSSpeaking from "./pages/IELTSSpeaking";

const queryClient = new QueryClient();

import { VIDEO_1_STACK } from "@/components/PageShell";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const INTRO_VIDEO = `${SUPABASE_URL}/storage/v1/object/public/videos/intro.mp4`;
const ANALYSIS_VIDEO = `${SUPABASE_URL}/storage/v1/object/public/videos/analysis-bg.mp4`;
const VIDEO_URLS = [...VIDEO_1_STACK, INTRO_VIDEO, ANALYSIS_VIDEO, "/images/dashboard-bg.jpg"];

const App = () => {
  useEffect(() => {
    VIDEO_URLS.forEach((url) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "video";
      link.href = url;
      document.head.appendChild(link);
    });
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <LanguageProvider>
      <BrowserRouter>
        <AuthProvider>
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
            <Route path="/analysis" element={<ProtectedRoute allowedRoles={["student"]}><StudentAnalysis /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute allowedRoles={["student"]}><StudentProfile /></ProtectedRoute>} />
            <Route path="/teacher" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/parent" element={<ProtectedRoute allowedRoles={["parent"]}><ParentDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/upload-videos" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUploadVideos /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <DevNav />
        </AuthProvider>
      </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
