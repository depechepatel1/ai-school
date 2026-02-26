

## Plan: Speech Analysis Provider Abstraction + Curriculum Integration + Pitch Detection

### Overview
Build the entire pronunciation practice pipeline with a pluggable speech analysis layer, so the interim browser-based pitch detection works now and can be swapped to Aliyun Speech Analysis API with one config change later.

### 1. Add `speech_analysis` provider to config

**Modify `src/lib/provider-config.ts`**
- Add `speechAnalysis: "browser" as "browser" | "aliyun"` to PROVIDERS

### 2. Create speech analysis provider abstraction

**Create `src/lib/speech-analysis-provider.ts`**
- Unified interface:
```text
interface SpeechAnalysisResult {
  overallScore: number;          // 0-100
  pitchContour: number[];        // normalized 0-1 pitch values
  fluencyScore?: number;
  pronunciationScore?: number;
  wordScores?: { word: string; score: number; feedback?: string }[];
}

interface SpeechAnalysisProvider {
  analyze(audioData: Float32Array, sampleRate: number, referenceText: string, accent: Accent): Promise<SpeechAnalysisResult>;
  getContourRealtime?(audioChunk: Float32Array, sampleRate: number): number[];  // for live visualization
}
```
- `"browser"` implementation: uses local pitch detector + prosody contour matching (DTW)
- `"aliyun"` placeholder: will call a future `aliyun-speech-analysis` edge function, return its structured response

### 3. Create pitch detector (browser interim)

**Create `src/lib/pitch-detector.ts`**
- Autocorrelation-based F0 extraction from `Float32Array` audio frames
- `detectPitch(buffer, sampleRate) → frequency in Hz or null`
- `extractContour(analyserNode, duration) → number[]` for real-time contour building

### 4. Create contour matching / scoring

**Create `src/lib/contour-match.ts`**
- `generateTargetContour(prosodyData: WordData[]) → number[]` — converts prosody pitch values to normalized contour
- `matchContours(target: number[], user: number[]) → number` — DTW-based similarity score (0-100)
- Used by the browser speech analysis provider; Aliyun provider will return its own scores

### 5. Create import-curriculum edge function

**Create `supabase/functions/import-curriculum/index.ts`**
- Accepts POST with JSON array of `{id, module, target_sound, sentence}` items
- Uses service role key to bypass RLS
- Maps fields and batch-inserts into `curriculum_items` table
- One-time use for data seeding

### 6. Add curriculum fetch functions

**Modify `src/services/db.ts`**
- `fetchCurriculumPage(track, bandLevel?, offset, limit)` — paginated fetch
- `prefetchNextItem(track, currentSortOrder)` — fetch single next item

### 7. Update SpeakingStudio shadowing mode

**Modify `src/pages/SpeakingStudio.tsx`**
- Replace hardcoded `PRONUNCIATION_SENTENCES` with DB-driven sequential curriculum
- Prefetch next sentence while current one is practiced
- Replace `Math.floor(Math.random() * 30) + 70` score with speech analysis provider result
- Feed real pitch contour from `LiveInputCanvas` into the analysis provider
- Show module/target_sound info from curriculum item
- Add "Next" button for sequential advancement

### 8. Enhance LiveInputCanvas with pitch extraction

**Modify `LiveInputCanvas` in `SpeakingStudio.tsx`**
- Add pitch detection alongside existing amplitude tracking
- Store pitch contour history for post-recording analysis
- Pass contour data up via callback for scoring

### Architecture for Aliyun Swap

When Aliyun API is ready:
1. Set `PROVIDERS.speechAnalysis = "aliyun"` in provider-config
2. Create `supabase/functions/aliyun-speech-analysis/index.ts` edge function
3. The Aliyun provider implementation sends recorded audio to the edge function, receives structured scores
4. No UI component changes needed — the provider abstraction handles everything

```text
Current (browser):
  Mic → pitch-detector.ts → contour-match.ts → score
  
Future (Aliyun):
  Mic → audio blob → edge function → Aliyun API → structured scores
  
Both return: SpeechAnalysisResult { overallScore, pitchContour, wordScores }
```

### Files Summary
- **Create** `src/lib/speech-analysis-provider.ts`
- **Create** `src/lib/pitch-detector.ts`
- **Create** `src/lib/contour-match.ts`
- **Create** `supabase/functions/import-curriculum/index.ts`
- **Modify** `src/lib/provider-config.ts` — add `speechAnalysis` flag
- **Modify** `src/services/db.ts` — add curriculum fetch functions
- **Modify** `src/pages/SpeakingStudio.tsx` — DB curriculum, real scoring, pitch contour

