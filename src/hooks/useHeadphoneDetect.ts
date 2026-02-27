import { useState, useEffect } from "react";

export function useHeadphoneDetect() {
  const [hasHeadphones, setHasHeadphones] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter((d) => d.kind === "audiooutput");
        setHasHeadphones(audioOutputs.length > 1);
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
