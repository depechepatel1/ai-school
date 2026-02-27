

## Changes to `src/pages/SpeakingStudio.tsx`

**Make the replay button always visible instead of conditionally rendered:**

1. Remove the `{lastRecordingUrl && (` conditional wrapper around the replay button (line 266)
2. Always render the button, but when `!lastRecordingUrl`, apply greyed-out/disabled styling (`opacity-30 cursor-not-allowed text-white/20`) and disable click handling
3. When `lastRecordingUrl` exists, use the current lit-up emerald styling

The recording is already cleared on `handleNextSentence` and on new recording start, so no additional cleanup logic is needed.

### Concrete diff

Replace lines 266-269:
```tsx
// Before (conditional render):
{lastRecordingUrl && (
  <button onClick={handleReplay} className={`...emerald styles...`}>
    <Play ... />
  </button>
)}

// After (always visible, disabled when no recording):
<button
  onClick={lastRecordingUrl ? handleReplay : undefined}
  disabled={!lastRecordingUrl}
  className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 group ${
    !lastRecordingUrl
      ? "text-white/20 opacity-30 cursor-not-allowed"
      : isPlayingReplay
        ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
        : "text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10"
  }`}
  title={!lastRecordingUrl ? "No recording yet" : isPlayingReplay ? "Stop Replay" : "Replay Your Recording"}
>
  <Play className="w-7 h-7 ml-0.5 group-hover:scale-110 transition-transform" />
</button>
```

No other files need changes.

