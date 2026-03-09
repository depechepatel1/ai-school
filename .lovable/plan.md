

# Verification Complete: Tongue Twisters File Location

## Current State ✓

The pronunciation curriculum file is correctly stored in the bucket:

| File | Bucket | Path | Created |
|------|--------|------|---------|
| tongue-twisters.json | `curriculums` | `shared/tongue-twisters.json` | 2026-03-08 |

The `fetchTongueTwisters()` service (`src/services/tongue-twisters.ts`) already fetches from this bucket path as the **primary source**, with local fallback only if the bucket fetch fails.

## Files to Measure for TTS Timings

| Content | Bucket Path | Output Path |
|---------|-------------|-------------|
| IELTS Fluency | `curriculums/ielts/shadowing-fluency.json` | `curriculums/ielts/timings-shadowing-fluency.json` |
| IGCSE Fluency | `curriculums/igcse/shadowing-fluency.json` | `curriculums/igcse/timings-shadowing-fluency.json` |
| Pronunciation (shared) | `curriculums/shared/tongue-twisters.json` | `curriculums/shared/timings-shadowing-pronunciation.json` |

## Ready to Implement

The bucket structure is correct. The implementation plan can proceed as designed — the TTS timing measurement system will:
1. Read tongue twisters from `curriculums/shared/tongue-twisters.json`
2. Save pronunciation timings to `curriculums/shared/timings-shadowing-pronunciation.json`
3. Wire into both `IELTSPronunciation.tsx` and `IGCSEPronunciation.tsx`

