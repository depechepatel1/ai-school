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
import NotFound from "./pages/NotFound";
import DevNav from "@/components/DevNav";

const queryClient = new QueryClient();

const VIDEO_URLS = [
  "https://res.cloudinary.com/daujjfaqg/video/upload/2026-02-26T17-16-49_add_a_slight_smiling_ndaiwy.mp4",
  "https://res.cloudinary.com/daujjfaqg/video/upload/Video_Generation_of_Teacher_s_Welcome_jeioja.mp4",
  "https://res.cloudinary.com/daujjfaqg/video/upload/20_Second_Teacher_Loop_ucqth6.mp4",
  "https://res.cloudinary.com/daujjfaqg/video/upload/2026-02-26T10-21-39_add_head_nodding_i7rp3g.mp4",
  "https://res.cloudinary.com/daujjfaqg/video/upload/Cloudinary_Video_Player_Embed_v0.6.0_-_-_2026-02-26_16-08-58_rsq9sj.mp4",
  "https://res.cloudinary.com/daujjfaqg/video/upload/2026-02-26T10-21-39_add_head_nodding_hrufnm.mp4",
];

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
            <Route path="/student" element={<ProtectedRoute allowedRoles={["student"]}><StudentPractice /></ProtectedRoute>} />
            <Route path="/speaking" element={<ProtectedRoute allowedRoles={["student"]}><SpeakingStudio /></ProtectedRoute>} />
            <Route path="/teacher" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/parent" element={<ProtectedRoute allowedRoles={["parent"]}><ParentDashboard /></ProtectedRoute>} />
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
