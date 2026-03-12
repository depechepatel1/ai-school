import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useCourseWeek } from "@/hooks/useCourseWeek";
import { useVideoLoopStack } from "@/hooks/useVideoLoopStack";
import PageShell from "@/components/PageShell";

import LeftPillar from "@/components/student/LeftPillar";
import RightPillar from "@/components/student/RightPillar";
import BottomDock from "@/components/student/BottomDock";
import HomeworkModal from "@/components/student/HomeworkModal";
import ScheduleModal from "@/components/student/ScheduleModal";
import WelcomeModal from "@/components/student/WelcomeModal";
import BrowserBanner from "@/components/student/BrowserBanner";
import PracticeModeGrid from "@/components/student/PracticeModeGrid";

export default function StudentPractice() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const courseWeek = useCourseWeek(user?.id ?? null);
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [teacherHint, setTeacherHint] = useState<string | null>(null);

  const handleEmailClick = (subject: string, body: string) => {};
  const handleNavigate = (section: string) => {};

  return (
    <PageShell playIntroVideo fullWidth loopVideos={VIDEO_1_STACK} hideFooter>
      <div className="relative w-full h-full text-white animate-fade-in-up font-outfit">
        <WelcomeModal />
        <BrowserBanner />
        <HomeworkModal isOpen={showHomeworkModal} onClose={() => setShowHomeworkModal(false)} />
        <ScheduleModal isOpen={calendarOpen} onClose={() => setCalendarOpen(false)} />

        {/* Practice Mode Selector — centered above BottomDock */}
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="pointer-events-auto">
            <PracticeModeGrid courseType={courseWeek.courseType} loading={courseWeek.loading} />
          </div>
        </div>

        <LeftPillar
          onShowSkills={() => setShowSkills(!showSkills)}
          showSkills={showSkills}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          handleEmailClick={handleEmailClick}
          setTeacherHint={setTeacherHint}
        />
        <RightPillar onNavigate={handleNavigate} />
        <BottomDock setShowHomeworkModal={setShowHomeworkModal} setCalendarOpen={setCalendarOpen} onSettings={signOut} />
      </div>
    </PageShell>
  );
}
