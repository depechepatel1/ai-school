

## Plan: Add Inter-Word Dips to Target Contour Line

### Problem
The target (cyan) contour line currently maps each syllable to a Y-tier but doesn't dip between consecutive yellow (high-stress) words. Two adjacent yellow words produce a flat plateau instead of showing the natural gap/silence between them.

### Change: `src/components/speaking/PronunciationVisualizer.tsx`

**Modify `computePoints` (lines 131–137)** to insert a dip point at word boundaries:

1. Instead of flatMapping all syllables and spacing them evenly, iterate through `data` (words) and their syllables, inserting an extra "dip" point between words.
2. The dip point drops to the "just below middle" tier (`h * 0.65`) to simulate the brief silence between words.
3. This applies between **all** words (not just yellow-yellow), giving the contour a natural speech rhythm. Between two yellow words the dip is especially visible since it drops from the peak.

**Tier mapping remains unchanged:**
- Yellow (pitch 2 + stress 2) → `h * 0.15` (highest)
- White (pitch 2 only) → `h * 0.35` (above middle)  
- Gray baseline (pitch 0) → `h * 0.60` (below middle)
- Gray lowest (pitch -1) → `h * 0.80` (lowest)

**New logic pseudocode:**
```
points = []
for each word in data:
  for each syllable in word:
    map syllable to Y tier as before
    push point
  if not last word:
    insert dip point at Y = h * 0.65 (between words)
space all points evenly across canvas width
```

This single change makes the contour undulate naturally, dipping between words to reflect the silence/gap, while peaks align with yellow karaoke text and troughs align with gray text.

