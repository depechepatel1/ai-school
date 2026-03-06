import { useState } from "react";
import { Mic } from "lucide-react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth";
import OmniChatModal from "@/components/OmniChatModal";

/**
 * Global floating AI assistant button.
 * Renders via portal so it floats above all page content.
 * Only visible when a user is authenticated.
 */
export default function GlobalOmniChat() {
  const { session } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);

  if (!session) return null;

  return createPortal(
    <div className="fixed bottom-8 right-8 z-[200] flex flex-col items-end gap-2">
      <OmniChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 shadow-[0_0_30px_rgba(37,99,235,0.5)] border-2 border-white/20 flex items-center justify-center hover:scale-110 transition-transform group"
      >
        <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping opacity-75" />
        <Mic className="w-7 h-7 text-white drop-shadow-md group-hover:text-blue-100" />
      </button>
    </div>,
    document.body
  );
}
