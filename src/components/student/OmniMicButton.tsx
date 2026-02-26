import { Mic, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OmniMicButtonProps {
  teacherHint: string | null;
}

export default function OmniMicButton({ teacherHint }: OmniMicButtonProps) {
  const navigate = useNavigate();

  return (
    <div className="absolute bottom-24 right-8 z-50 flex flex-col items-end gap-2">
      {teacherHint && (
        <div className="bg-blue-600 text-white text-xs p-3 rounded-xl rounded-br-none shadow-lg animate-fade-in-up max-w-[200px] relative mb-2">
          <div className="font-bold mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Teacher Li</div>
          {teacherHint}
        </div>
      )}
      <button onClick={() => navigate("/speaking")} className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 shadow-[0_0_30px_rgba(37,99,235,0.5)] border-2 border-white/20 flex items-center justify-center hover:scale-110 transition-transform group animate-fade-in-up">
        <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping opacity-75" />
        <Mic className="w-8 h-8 text-white drop-shadow-md group-hover:text-blue-100" />
      </button>
    </div>
  );
}
