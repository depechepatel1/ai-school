import { useState } from "react";
import { useAuth } from "@/lib/auth";
import PageShell from "@/components/PageShell";

import LeftPillar from "@/components/student/LeftPillar";
import RightPillar from "@/components/student/RightPillar";
import BottomDock from "@/components/student/BottomDock";
import HomeworkModal from "@/components/student/HomeworkModal";
import ScheduleModal from "@/components/student/ScheduleModal";
import OmniMicButton from "@/components/student/OmniMicButton";

export default function StudentPractice() {
  const { signOut } = useAuth();
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [teacherHint, setTeacherHint] = useState<string | null>(null);

  const handleEmailClick = (subject: string, body: string) => {
    // Future: open email modal
  };

  const handleNavigate = (section: string) => {
    // Future: navigate to skill section
  };

  return (
    <PageShell playIntroVideo fullWidth>
      <div className="relative w-full h-full text-white animate-fade-in-up font-outfit">
        <HomeworkModal isOpen={showHomeworkModal} onClose={() => setShowHomeworkModal(false)} />
        <ScheduleModal isOpen={calendarOpen} onClose={() => setCalendarOpen(false)} />

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
        <OmniMicButton teacherHint={teacherHint} />
      </div>
    </PageShell>
  );
}
