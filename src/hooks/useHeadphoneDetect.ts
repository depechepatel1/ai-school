import { useState, useEffect } from "react";

const HEADPHONE_KEYWORDS = ["headphone", "earphone", "airpod", "headset", "earbud"];

export function useHeadphoneDetect() {
  const [hasHeadphones, setHasHeadphones] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter((d) => d.kind === "audiooutput");
        
        // Check if any output device label contains headphone-related keywords
        const headphoneDetected = audioOutputs.some((d) => {
          const label = d.label.toLowerCase();
          return HEADPHONE_KEYWORDS.some((kw) => label.includes(kw));
        });
        
        setHasHeadphones(headphoneDetected);
      } catch {
        setHasHeadphones(false);
      }
    };

    check();
    navigator.mediaDevices.addEventListener("devicechange", check);
    return () => navigator.mediaDevices.removeEventListener("devicechange", check);
  }, []);

  return { hasHeadphones };
}
