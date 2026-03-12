import { useCallback } from "react";

const prefetchMap: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/pages/Index"),
  "/login": () => import("@/pages/Login"),
  "/signup": () => import("@/pages/Signup"),
  "/forgot-password": () => import("@/pages/ForgotPassword"),
  "/reset-password": () => import("@/pages/ResetPassword"),
  "/select-week": () => import("@/pages/WeekSelection"),
  "/student": () => import("@/pages/StudentPractice"),
  "/speaking": () => import("@/pages/SpeakingStudio"),
  "/ielts/pronunciation": () => import("@/pages/IELTSPronunciation"),
  "/ielts/fluency": () => import("@/pages/IELTSFluency"),
  "/ielts/speaking": () => import("@/pages/IELTSSpeaking"),
  "/igcse/pronunciation": () => import("@/pages/IGCSEPronunciation"),
  "/igcse/fluency": () => import("@/pages/IGCSEFluency"),
  "/igcse/speaking": () => import("@/pages/IGCSESpeaking"),
  "/analysis": () => import("@/pages/StudentAnalysis"),
  "/profile": () => import("@/pages/StudentProfile"),
  "/teacher": () => import("@/pages/TeacherDashboard"),
  "/parent": () => import("@/pages/ParentDashboard"),
  "/admin": () => import("@/pages/AdminDashboard"),
  "/admin/upload-videos": () => import("@/pages/AdminUploadVideos"),
};

const prefetched = new Set<string>();

export function prefetchRoute(path: string) {
  if (prefetched.has(path)) return;
  const loader = prefetchMap[path];
  if (loader) {
    prefetched.add(path);
    loader();
  }
}

/** Returns onMouseEnter / onFocus props that prefetch a route's chunk */
export function usePrefetchProps(to: string) {
  const handler = useCallback(() => prefetchRoute(to), [to]);
  return { onMouseEnter: handler, onFocus: handler };
}
