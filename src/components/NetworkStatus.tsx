import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function NetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const goOnline = () => { setOnline(true); setTimeout(() => setShowBanner(false), 2000); };
    const goOffline = () => { setOnline(false); setShowBanner(true); };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 text-sm font-semibold transition-colors ${
      online ? "bg-green-600 text-white" : "bg-red-600 text-white"
    }`}>
      {online ? (
        "Back online"
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          No internet connection — some features may not work
        </>
      )}
    </div>
  );
}
