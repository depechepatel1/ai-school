import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Play } from "lucide-react";
import PageShell, { VIDEO_1_STACK } from "@/components/PageShell";

import LeftPillar from "@/components/student/LeftPillar";
import RightPillar from "@/components/student/RightPillar";
import BottomDock from "@/components/student/BottomDock";
import HomeworkModal from "@/components/student/HomeworkModal";
import ScheduleModal from "@/components/student/ScheduleModal";
import WelcomeModal from "@/components/student/WelcomeModal";
import BrowserBanner from "@/components/student/BrowserBanner";


export default function StudentPractice() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
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
    <PageShell playIntroVideo fullWidth loopVideos={VIDEO_1_STACK} hideFooter>
      <div className="relative w-full h-full text-white animate-fade-in-up font-outfit">
        <WelcomeModal />
        <BrowserBanner />
        <HomeworkModal isOpen={showHomeworkModal} onClose={() => setShowHomeworkModal(false)} />
        <ScheduleModal isOpen={calendarOpen} onClose={() => setCalendarOpen(false)} />

        {/* Start Practice CTA — centered above BottomDock */}
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <button
            onClick={() => navigate("/speaking")}
            className="pointer-events-auto group flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600/80 to-cyan-600/80 backdrop-blur-xl border border-white/20 shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)] hover:shadow-[0_0_60px_-10px_rgba(59,130,246,0.7)] hover:scale-105 active:scale-95 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <Play className="w-5 h-5 text-white ml-0.5" />
            </div>
            <div className="text-left">
              <div className="text-base font-bold text-white">Start Speaking Practice</div>
              <div className="text-[11px] text-white/60 font-medium">Pronunciation · Fluency · Speaking</div>
            </div>
          </button>
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
