import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStreak } from "@/hooks/useStreak";
import { fetchProfile } from "@/services/db";
import PageShell, { VIDEO_1_STACK } from "@/components/PageShell";

import LeftPillar from "@/components/student/LeftPillar";
import RightPillar from "@/components/student/RightPillar";
import BottomDock from "@/components/student/BottomDock";
import HomeworkModal from "@/components/student/HomeworkModal";
import ScheduleModal from "@/components/student/ScheduleModal";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ClipboardList, Flame } from "lucide-react";

export default function StudentPractice() {
  usePageTitle("Practice");
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const { streak, restDays } = useStreak(user?.id ?? null);
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [, setTeacherHint] = useState<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  // Fetch real profile data
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    fetchProfile(user.id).then(setProfile).catch(console.error);
  }, [user?.id]);

  const displayName = profile?.display_name ?? user?.email?.split("@")[0] ?? "Student";
  const avatarUrl = profile?.avatar_url ?? null;

  const leftPillarContent = (
    <LeftPillar
      onShowSkills={() => setShowSkills(!showSkills)}
      showSkills={showSkills}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      setTeacherHint={setTeacherHint}
      displayName={displayName}
      avatarUrl={avatarUrl}
      userId={user?.id}
    />
  );

  const rightPillarContent = <RightPillar streak={streak} restDays={restDays} />;

  return (
    <PageShell playIntroVideo fullWidth loopVideos={VIDEO_1_STACK} hideFooter>
      <div className="relative w-full h-full text-white animate-fade-in-up font-outfit">
        <HomeworkModal isOpen={showHomeworkModal} onClose={() => setShowHomeworkModal(false)} />
        <ScheduleModal isOpen={calendarOpen} onClose={() => setCalendarOpen(false)} />

        {isMobile ? (
          <>
            {/* Mobile: floating toggle buttons + Sheet drawers */}
            <Sheet open={leftOpen} onOpenChange={setLeftOpen}>
              <SheetTrigger asChild>
                <button className="fixed top-4 left-4 z-50 bg-black/70 backdrop-blur-xl border border-white/10 rounded-full p-3 shadow-lg hover:bg-black/90 transition-colors">
                  <ClipboardList className="w-5 h-5 text-blue-400" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0 bg-black/95 border-white/10 overflow-y-auto">
                <div className="relative w-full h-full pt-2">
                  {/* Re-render pillar in flow layout for drawer */}
                  <div className="relative w-full p-4 flex flex-col gap-4">
                    <LeftPillar
                      onShowSkills={() => setShowSkills(!showSkills)}
                      showSkills={showSkills}
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      setTeacherHint={setTeacherHint}
                      displayName={displayName}
                      avatarUrl={avatarUrl}
                      userId={user?.id}
                      inDrawer
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Sheet open={rightOpen} onOpenChange={setRightOpen}>
              <SheetTrigger asChild>
                <button className="fixed top-4 right-4 z-50 bg-black/70 backdrop-blur-xl border border-white/10 rounded-full p-3 shadow-lg hover:bg-black/90 transition-colors">
                  <Flame className="w-5 h-5 text-orange-400" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] p-0 bg-black/95 border-white/10 overflow-y-auto">
                <div className="relative w-full h-full pt-2">
                  <div className="relative w-full p-4 flex flex-col gap-4">
                    <RightPillar inDrawer streak={streak} restDays={restDays} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </>
        ) : (
          <>
            {leftPillarContent}
            {rightPillarContent}
          </>
        )}

        <BottomDock
          setShowHomeworkModal={setShowHomeworkModal}
          setCalendarOpen={setCalendarOpen}
          onSignOut={signOut}
        />
      </div>
    </PageShell>
  );
}
