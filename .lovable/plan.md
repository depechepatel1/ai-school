

## Plan: Remove Protected Zone and Delete Regression Test

The user wants to unlock the PronunciationVisualizer for a complete rework by removing the protection markers and the associated regression test.

### Changes

1. **`src/components/speaking/PronunciationVisualizer.tsx`** — Remove the two PROTECTED ZONE comment blocks (lines 512-518 and 630-632). Keep all the actual code intact; only delete the banner comments.

2. **`src/test/live-line-y-mapping.test.ts`** — Delete this file entirely. It exists solely to enforce the protected zone constants and formulas.

No logic changes — this just clears the way for the next rework prompt.

