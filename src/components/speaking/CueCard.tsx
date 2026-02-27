import { Book } from "lucide-react";
import { PART2_TOPIC } from "@/types/speaking";

interface Props {
  topic: typeof PART2_TOPIC;
}

export default function CueCard({ topic }: Props) {
  return (
    <div className="absolute top-[150px] left-5 w-[280px] bg-white/[0.03] backdrop-blur-[40px] border border-white/10 rounded-2xl border-l-4 border-l-amber-500 p-4 z-[200] animate-fade-in">
      <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-2">
        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Part 2 Topic</span>
        <Book className="w-4 h-4 text-amber-500" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2 leading-tight">{topic.title}</h3>
      <ul className="space-y-1 text-sm text-gray-300 pl-4 list-disc">
        {topic.cues.map((c, i) => <li key={i}>{c}</li>)}
      </ul>
    </div>
  );
}
