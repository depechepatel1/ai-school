

## Changes to `src/pages/SpeakingStudio.tsx`

1. **Remove the score badge** — Delete the `{score && (...)}` block that renders the Award icon and match percentage overlay inside the contour container
2. **Remove unused state and imports** — Remove the `score` state, the `Award` import from lucide-react, and the score-related logic in `handlePitchContour` and `handleNextSentence`

