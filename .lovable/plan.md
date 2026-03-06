

## Problem

The `OmniMicButton` currently calls `navigate("/speaking")`, taking the student away from the dashboard. It should instead open the `OmniChatModal` (which already exists with full streaming AI chat, voice input, and conversation persistence).

## Plan

**File: `src/components/student/OmniMicButton.tsx`**

1. Replace the `navigate("/speaking")` call with an `onClick` that toggles a local `chatOpen` state.
2. Import and render `OmniChatModal` inline, controlled by that state.
3. Remove the `react-router-dom` import (no longer needed).
4. Keep the teacher hint bubble and the pulsing mic button visuals unchanged.

**Result:** Tapping the OmniMic FAB opens the AI chat panel (Teacher Li) as a floating modal anchored to the button's position — no page navigation. The modal already handles streaming responses, voice input, markdown rendering, and conversation persistence.

