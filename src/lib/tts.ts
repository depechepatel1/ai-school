// Edge-optimized Text-to-Speech utility
// Prioritizes Microsoft Edge's high-quality "Natural" voices

let selectedVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

function loadVoices(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // Priority 1: Edge Natural voices (en-GB or en-US)
  const naturalVoices = voices.filter(
    (v) =>
      v.name.includes("Natural") &&
      (v.lang.startsWith("en-GB") || v.lang.startsWith("en-US"))
  );

  if (naturalVoices.length > 0) {
    // Prefer en-GB Natural, fallback to en-US Natural
    const gbNatural = naturalVoices.find((v) => v.lang.startsWith("en-GB"));
    selectedVoice = gbNatural || naturalVoices[0];
    return selectedVoice;
  }

  // Priority 2: Any en-GB or en-US voice
  const enVoices = voices.filter(
    (v) => v.lang.startsWith("en-GB") || v.lang.startsWith("en-US")
  );
  if (enVoices.length > 0) {
    selectedVoice = enVoices[0];
    return selectedVoice;
  }

  // Fallback: any English voice
  const anyEn = voices.find((v) => v.lang.startsWith("en"));
  selectedVoice = anyEn || voices[0];
  return selectedVoice;
}

// Initialize voices (they load async in some browsers)
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  speechSynthesis.addEventListener("voiceschanged", () => {
    loadVoices();
    voicesLoaded = true;
  });
  // Try immediately too
  loadVoices();
}

export function speakText(text: string) {
  if (!("speechSynthesis" in window)) return;

  stopSpeaking();

  if (!voicesLoaded) loadVoices();

  // Strip markdown for cleaner speech
  const cleanText = text
    .replace(/#{1,6}\s/g, "")
    .replace(/\*{1,2}(.*?)\*{1,2}/g, "$1")
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[>\-*_~]/g, "")
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  if (selectedVoice) utterance.voice = selectedVoice;
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;

  speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
  }
}
