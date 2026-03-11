import { MicOff, X } from "lucide-react";

interface MicDeniedOverlayProps {
  onDismiss: () => void;
}

export default function MicDeniedOverlay({ onDismiss }: MicDeniedOverlayProps) {
  return (
    <div className="absolute inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-black/80 border border-red-500/30 rounded-2xl p-8 max-w-md text-center shadow-[0_0_60px_-10px_rgba(239,68,68,0.3)] relative">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
          <MicOff className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Microphone Access Denied</h3>
        <p className="text-white/60 text-sm mb-2">麦克风访问被拒绝</p>
        <p className="text-white/50 text-xs leading-relaxed mb-4">
          Please allow microphone access to use voice recording. Click the 🔒 icon in your browser's address bar and enable microphone permissions.
        </p>
        <p className="text-white/40 text-[10px] leading-relaxed mb-6">
          请在浏览器地址栏点击 🔒 图标，允许麦克风权限后重试。
        </p>
        <button
          onClick={onDismiss}
          className="px-6 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-semibold hover:bg-red-500/30 transition-all"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
