

## Plan: Bilingual Voice Input + Chinese TTS for OmniChat

### Overview
Enable the OmniMic to accept both English and Chinese speech input, with automatic language detection via a toggle. When the AI responds to Chinese input, use a high-quality female Chinese Natural voice from Edge browser for TTS read-aloud.

### Changes

**1. Extend TTS provider to support Chinese voices** (`src/lib/tts-provider.ts`)
- Expand the `Accent` type to include `"zh"`: `type Accent = "uk" | "us" | "zh"`
- Update `findVoice` to handle `"zh"` — map to `zh-CN` lang prefix, prioritize Edge Natural female voices (e.g., "Xiaoxiao", "Xiaoyi")
- Update `cachedVoices` initialization to include `zh` key

**2. Add language toggle to OmniChatModal** (`src/components/OmniChatModal.tsx`)
- Add a `sttLang` state: `"en-US" | "zh-CN"`, defaulting to `"en-US"`
- Add a small EN/中 toggle button in the input bar (similar to existing `LanguageToggle` style) that switches `sttLang`
- Pass `sttLang` to `startListening()` instead of hardcoded `"en-US"`
- After receiving an assistant response, detect if the user's message was Chinese (simple heuristic: contains CJK characters) and if so, auto-speak the response using `speak(text, "zh")` from `tts-provider`

**3. Auto-speak assistant responses in Chinese** (`src/components/OmniChatModal.tsx`)
- Import `speak, stopSpeaking` from `tts-provider`
- In `onDone` callback of `streamChat`, if the user's message contained Chinese characters, call `speak(assistantSoFar, "zh")` to read the response aloud in the Chinese Natural voice
- Add a small speaker icon on assistant messages to manually trigger TTS playback

### Visual result
- A small `EN/中` pill appears next to the mic button in the chat input bar
- When set to 中, STT listens in Chinese; the AI response is automatically spoken aloud in a female Chinese Natural voice
- When set to EN, behavior remains unchanged (English STT, no auto-speak)

