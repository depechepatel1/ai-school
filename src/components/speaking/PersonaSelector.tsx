import { useState } from "react";
import { Mic, Book, Smile, Users, Headphones, MoveHorizontal } from "lucide-react";
import type { Persona } from "@/types/speaking";

interface Props {
  persona: Persona;
  setPersona: (p: Persona) => void;
  setShowTestConfig: (b: boolean) => void;
}

const personas: { id: Persona; icon: typeof Mic; label: string; color: string }[] = [
  { id: "Examiner", icon: Mic, label: "Examiner", color: "text-cyan-300" },
  { id: "Teacher", icon: Book, label: "English Teacher", color: "text-green-300" },
  { id: "Friend", icon: Smile, label: "Friend", color: "text-yellow-300" },
  { id: "Subject", icon: Users, label: "Subject Teacher", color: "text-purple-300" },
  { id: "Counselor", icon: Headphones, label: "Counselor", color: "text-pink-300" },
];

export default function PersonaSelector({ persona, setPersona, setShowTestConfig }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const current = personas.find((p) => p.id === persona) || personas[0];

  return (
    <div className="relative z-[200]">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full hover:bg-white/10 transition-colors">
        <current.icon className={`w-4 h-4 ${current.color}`} />
        <span className={`text-xs font-bold uppercase tracking-wider ${current.color}`}>{current.label}</span>
        <MoveHorizontal className="w-3 h-3 text-white/40 rotate-90" />
      </button>
      {isOpen && (
        <div className="absolute top-12 right-0 w-48 flex flex-col gap-1 p-2 rounded-xl bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-2xl animate-fade-in z-[200]">
          {personas.map((p) => (
            <button
              key={p.id}
              onClick={() => { setPersona(p.id); setIsOpen(false); if (p.id === "Examiner") setShowTestConfig(true); else setShowTestConfig(false); }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/10 ${persona === p.id ? "bg-white/10" : ""}`}
            >
              <p.icon className={`w-4 h-4 ${p.color}`} />
              <span className={`text-xs font-bold ${p.color}`}>{p.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
