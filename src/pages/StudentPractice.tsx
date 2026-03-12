import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useCourseWeek } from "@/hooks/useCourseWeek";
import { useVideoLoopStack } from "@/hooks/useVideoLoopStack";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import PageShell from "@/components/PageShell";

import LeftPillar from "@/components/student/LeftPillar";
import RightPillar from "@/components/student/RightPillar";
import BottomDock from "@/components/student/BottomDock";
import HomeworkModal from "@/components/student/HomeworkModal";
import ScheduleModal from "@/components/student/ScheduleModal";
import WelcomeModal from "@/components/student/WelcomeModal";
import BrowserBanner from "@/components/student/BrowserBanner";


export default function StudentPractice() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const courseWeek = useCourseWeek(user?.id ?? null);
  const { videoList } = useVideoLoopStack();
  const { data: analytics } = useAnalyticsData(user?.id ?? null, courseWeek.courseType, "weekly");
  const speakingProgress = analytics ? Math.round(analytics.speaking.pct * 100) : 0;
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [teacherHint, setTeacherHint] = useState<string | null>(null);

  const handleEmailClick = (subject: string, body: string) => {};
  const handleNavigate = (section: string) => {};

  return (
    <PageShell playIntroVideo fullWidth loopVideos={videoList} hideFooter>
      <div className="relative w-full h-full text-white animate-fade-in-up font-outfit">
        <WelcomeModal />
        <BrowserBanner />
        <HomeworkModal isOpen={showHomeworkModal} onClose={() => setShowHomeworkModal(false)} />
        <ScheduleModal isOpen={calendarOpen} onClose={() => setCalendarOpen(false)} />


        <LeftPillar
          onShowSkills={() => setShowSkills(!showSkills)}
          showSkills={showSkills}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          handleEmailClick={handleEmailClick}
          setTeacherHint={setTeacherHint}
          courseType={courseWeek.courseType}
          courseLoading={courseWeek.loading}
        />
        <RightPillar onNavigate={handleNavigate} speakingProgress={speakingProgress} />
        <BottomDock setShowHomeworkModal={setShowHomeworkModal} setCalendarOpen={setCalendarOpen} onSettings={signOut} />
      </div>
    </PageShell>
  );
}
