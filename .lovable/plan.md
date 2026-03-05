

## Plan: Extract Background Stage as a Swappable Component

### Problem
The A/B video player (refs, state, effects, JSX) is embedded directly in `PageShell.tsx`. To swap it with a Live2D Cubism avatar later, you'd need to rewrite PageShell internals. There's no clean boundary.

### Architecture

Create a `BackgroundStage` abstraction with two implementations behind a feature flag:

```text
PageShell.tsx
  └─ <div className="absolute inset-0 z-0">   ← "stage slot"
       └─ <BackgroundStage />                   ← dispatches to:
            ├─ <VideoLoopStage />                ← current A/B player (extracted)
            └─ <Live2DStage />                   ← future Cubism renderer
```

### Files to Create/Modify

**1. `src/components/stage/VideoLoopStage.tsx`** (new)
- Extract all video player logic from PageShell: `safePlay`, `handlePlayerEnded`, `handleCanPlayA`, dual refs, `activePlayer` state, `nextIndexRef`, `initialPlayDone`, intro video handling
- Props: `videoList`, `introSrc?`, `playIntro`, `objectPosition`, `isMuted`, `onMuteToggle`
- Renders the intro video, Player A, Player B, and the mute button
- Self-contained; PageShell just mounts it

**2. `src/components/stage/Live2DStage.tsx`** (new, placeholder)
- Wraps the existing dormant `Live2DAvatar` canvas
- Same prop interface as VideoLoopStage where applicable (`isMuted`, `onMuteToggle`)
- Ready to receive Cubism SDK integration when pixi.js vulnerability is resolved

**3. `src/components/stage/BackgroundStage.tsx`** (new)
- Reads a flag (e.g., `USE_LIVE2D` from `provider-config.ts`) to choose which stage to render
- Falls back to `VideoLoopStage` by default

**4. `src/lib/provider-config.ts`** (modify)
- Add `USE_LIVE2D: false` flag alongside existing provider flags

**5. `src/components/PageShell.tsx`** (modify)
- Remove all video player state, refs, effects, and video JSX (~lines 47-143, 172-246)
- Replace with `<BackgroundStage />` inside the existing `absolute inset-0 z-0` container
- PageShell becomes purely a layout shell: frame, content slot, footer, dev panel

### Result
- PageShell drops from ~325 lines to ~180 lines
- Video logic is isolated and testable
- Swapping to Live2D is a single flag change in `provider-config.ts`
- Both implementations share the same stage slot and z-index contract

