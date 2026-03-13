

## Bug

In `src/lib/tts-provider.ts` line 173, the utterance is created with the original `text` variable instead of `cleanText`. The regex stripping on lines 138-144 computes `cleanText` correctly but it's never actually used for the utterance.

## Fix

**`src/lib/tts-provider.ts` line 173**: Change `createUtterance(text, voice, opts)` to `createUtterance(cleanText, voice, opts)`.

One-line fix.

