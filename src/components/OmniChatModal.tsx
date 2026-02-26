import { useState } from "react";
import { X, Send, Mic } from "lucide-react";
import NeuralLogo from "./NeuralLogo";

interface OmniChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OmniChatModal = ({ isOpen, onClose }: OmniChatModalProps) => {
  const [inputValue, setInputValue] = useState("");

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-24 right-6 z-50 w-[280px] bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-3xl p-3 shadow-[0_30px_60px_rgba(0,0,0,0.9)] animate-fade-in-up border-glow-subtle flex flex-col gap-3">
      {/* Header */}
      <div className="flex justify-between items-center px-1">
        <span className="text-white font-bold flex items-center gap-2 text-outline text-sm">
          <NeuralLogo />
          <span className="tracking-wide">Teacher Li</span>
        </span>
        <button onClick={onClose}>
          <X className="w-4 h-4 text-white/70 hover:text-white transition-colors" />
        </button>
      </div>

      {/* Message Area */}
      <div className="bg-white/5 rounded-2xl p-3 text-xs leading-relaxed text-gray-200 overflow-y-auto shadow-inner border border-white/5 scrollbar-hide">
        Hi, I'm your AI teacher. I'm always available to discuss anything you like. What would you like to talk about?
      </div>

      {/* Input Bar */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative flex items-center bg-black/50 border border-white/10 rounded-full p-1 pl-3 shadow-sm transition-colors focus-within:border-blue-400/50 focus-within:bg-black/70">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type or speak..."
            className="flex-1 bg-transparent border-none text-xs text-white placeholder-white/30 focus:outline-none focus:ring-0 mr-2"
          />
          <button
            className={`p-2 rounded-full transition-all duration-300 shadow-lg ${
              inputValue.trim()
                ? "bg-blue-600 text-white rotate-0"
                : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
            }`}
          >
            {inputValue.trim() ? (
              <Send className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OmniChatModal;
