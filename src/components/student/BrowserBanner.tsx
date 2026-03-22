import { useState, useEffect } from "react";
import { X, Globe } from "lucide-react";

const STORAGE_KEY = "browser_banner_dismissed";

function detectBrowserSupport(): { showBanner: boolean; message: string; severity: "none" | "info" | "warning" } {
  const ua = navigator.userAgent;
  const isEdge = /Edg\//i.test(ua);
  const isChrome = /Chrome\//i.test(ua) && !isEdge;
  const hasSpeechRecognition = "webkitSpeechRecognition" in window || "SpeechRecognition" in window;

  if (!hasSpeechRecognition) {
    return {
      showBanner: true,
      severity: "warning",
      message: "Your browser doesn't support speech recognition. Please use Microsoft Edge for the best experience, or Chrome as an alternative.",
    };
  }

  if (isEdge) {
    return { showBanner: false, message: "", severity: "none" };
  }

  if (isChrome) {
    return {
      showBanner: true,
      severity: "info",
      message: "For the best voice experience with zero latency, use Microsoft Edge. Chrome works but voice responses may be slightly slower.",
    };
  }

  return {
    showBanner: true,
    severity: "warning",
    message: "For the best experience, use Microsoft Edge (recommended) or Chrome. Your current browser has limited voice support.",
  };
}

export default function BrowserBanner() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"none" | "info" | "warning">("none");

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const result = detectBrowserSupport();
    if (result.showBanner) {
      setMessage(result.message);
      setSeverity(result.severity);
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  const isWarning = severity === "warning";
  const iconColor = isWarning ? "text-amber-400" : "text-blue-400";
  const textColor = isWarning ? "text-amber-200" : "text-blue-200";
  const bgColor = isWarning ? "bg-amber-500/15 border-amber-500/20" : "bg-blue-500/15 border-blue-500/20";
  const btnColor = isWarning ? "text-amber-400/60 hover:text-amber-300 hover:bg-amber-500/20" : "text-blue-400/60 hover:text-blue-300 hover:bg-blue-500/20";

  return (
    <div className={`absolute top-0 left-0 right-0 z-[400] flex items-center justify-center px-4 py-2 ${bgColor} border-b backdrop-blur-xl animate-fade-in`}>
      <Globe className={`w-3.5 h-3.5 ${iconColor} mr-2 flex-shrink-0`} />
      <span className={`text-[11px] ${textColor} font-medium`}>{message}</span>
      <button
        onClick={dismiss}
        className={`ml-3 p-1 rounded-full ${btnColor} transition-colors flex-shrink-0`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
