import { BookOpen } from "lucide-react";

interface HomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HomeworkModal({ isOpen, onClose }: HomeworkModalProps) {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in-up">
      <div className="bg-gray-900 border border-blue-500/30 p-6 rounded-3xl max-w-sm w-full m-4 shadow-2xl flex flex-col h-[60%]">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 flex-shrink-0">
          <BookOpen className="text-blue-400" /> Homework
        </h3>
        <div className="space-y-3 flex-1 overflow-y-auto scrollbar-hide pr-2">
          {[
            { title: "Reading Test 4", due: "Due Tomorrow", color: "text-red-400" },
            { title: "Writing Task 1: Bar Charts", due: "Due: Fri 12th", color: "text-red-400" },
            { title: "Listening Mock Test 5", due: "Due: Mon 15th", color: "text-yellow-400" },
            { title: "Grammar Worksheet: Articles", due: "Due: Wed 17th", color: "text-yellow-400" },
            { title: "Speaking Part 2 Recording", due: "No Deadline", color: "text-blue-400" },
            { title: "Vocabulary Review: Health", due: "Recommended", color: "text-blue-400" },
          ].map((hw, i) => (
            <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="text-sm font-bold text-white">{hw.title}</div>
              <div className={`text-xs ${hw.color}`}>{hw.due}</div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full py-3 bg-blue-600 rounded-xl text-white font-bold hover:bg-blue-500 transition-colors flex-shrink-0">Close</button>
      </div>
    </div>
  );
}
