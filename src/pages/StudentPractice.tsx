import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { fetchProfile } from "@/services/db";
import PageShell, { VIDEO_1_STACK } from "@/components/PageShell";

import LeftPillar from "@/components/student/LeftPillar";
import RightPillar from "@/components/student/RightPillar";
import BottomDock from "@/components/student/BottomDock";
import HomeworkModal from "@/components/student/HomeworkModal";
import ScheduleModal from "@/components/student/ScheduleModal";

export default function StudentPractice() {
  usePageTitle("Practice");
  const { user, signOut } = useAuth();
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [, setTeacherHint] = useState<string | null>(null);

  // Fetch real profile data
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    fetchProfile(user.id).then(setProfile).catch(console.error);
  }, [user?.id]);

  return (
    <PageShell playIntroVideo fullWidth loopVideos={VIDEO_1_STACK} hideFooter>
      <div className="relative w-full h-full text-white animate-fade-in-up font-outfit">
        <HomeworkModal isOpen={showHomeworkModal} onClose={() => setShowHomeworkModal(false)} />
        <ScheduleModal isOpen={calendarOpen} onClose={() => setCalendarOpen(false)} />

        <LeftPillar
          onShowSkills={() => setShowSkills(!showSkills)}
          showSkills={showSkills}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setTeacherHint={setTeacherHint}
          displayName={profile?.display_name ?? user?.email?.split("@")[0] ?? "Student"}
          avatarUrl={profile?.avatar_url ?? null}
        />
        <RightPillar />
        <BottomDock
          setShowHomeworkModal={setShowHomeworkModal}
          setCalendarOpen={setCalendarOpen}
          onSignOut={signOut}
        />
      </div>
    </PageShell>
  );
}
