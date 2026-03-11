import { useState, useRef, useCallback, forwardRef } from "react";
import { Mic } from "lucide-react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth";
import OmniChatModal from "@/components/OmniChatModal";

export default function GlobalOmniChat() {
  const { session } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0, moved: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y, moved: 0 };
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.dragging) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    d.moved = Math.max(d.moved, Math.abs(dx) + Math.abs(dy));
    // Clamp position so button stays within viewport
    const maxX = window.innerWidth - 100;
    const maxY = window.innerHeight - 100;
    setPos({
      x: Math.max(-maxX, Math.min(maxX, d.origX + dx)),
      y: Math.max(-maxY, Math.min(maxY, d.origY + dy)),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    const d = dragRef.current;
    d.dragging = false;
    if (d.moved < 5) setChatOpen(prev => !prev);
  }, []);

  if (!session) return null;

  return createPortal(
    <div
      className="fixed bottom-8 right-8 z-[200] flex flex-col items-end gap-2"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
    >
      <OmniChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative w-16 h-16 flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none"
      >
        {/* Outer pulse ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/40 via-blue-500/30 to-pink-500/40 animate-[siri-pulse_2.5s_ease-in-out_infinite]" />
        {/* Rotating glow */}
        <div className="absolute inset-[-4px] rounded-full animate-[siri-rotate_6s_linear_infinite]">
          <div className="w-full h-full rounded-full bg-[conic-gradient(from_0deg,transparent,rgba(168,85,247,0.4),transparent,rgba(59,130,246,0.4),transparent,rgba(236,72,153,0.3),transparent)]" />
        </div>
        {/* Breathing core */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-purple-600/80 via-blue-600/70 to-pink-500/60 animate-[siri-breathe_3s_ease-in-out_infinite] shadow-[0_0_30px_rgba(139,92,246,0.5),0_0_60px_rgba(59,130,246,0.3)]" />
        {/* Inner glass */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/10 to-transparent backdrop-blur-sm" />
        {/* Icon */}
        <Mic className="relative w-6 h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
      </div>
    </div>,
    document.body
  );
}
