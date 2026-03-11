import { useState, useEffect } from "react";
import { X, Globe } from "lucide-react";

const STORAGE_KEY = "edge_banner_dismissed";

function isEdgeBrowser(): boolean {
  const ua = navigator.userAgent;
  return /Edg\//i.test(ua);
}

export default function BrowserBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isEdgeBrowser() && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-[400] flex items-center justify-center px-4 py-2 bg-amber-500/15 border-b border-amber-500/20 backdrop-blur-xl animate-fade-in">
      <Globe className="w-3.5 h-3.5 text-amber-400 mr-2 flex-shrink-0" />
      <span className="text-[11px] text-amber-200 font-medium">
        For the best voice experience, use <strong>Microsoft Edge</strong> browser — it has built-in natural voices.
      </span>
      <button
        onClick={dismiss}
        className="ml-3 p-1 rounded-full text-amber-400/60 hover:text-amber-300 hover:bg-amber-500/20 transition-colors flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
