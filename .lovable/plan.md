

# Move Omni Mic Button Default Position

The right-side button stack on the fluency screen ends with the "Next" (ChevronRight) button at line 199. The stack is vertically centered (`top-1/2 -translate-y-1/2`) at `right-4`. The omni mic button should default to just below this stack on the right side.

## Change

**File:** `src/components/GlobalOmniChat.tsx`
- Change the fixed position from `bottom-8 right-8` to `right-4 top-[calc(50%+160px)]` — this places it on the right edge, roughly 160px below center (just beneath the 6-button stack which spans ~280px centered vertically, so its bottom is at ~50%+140px).
- This keeps it draggable so users can still reposition it.

Single line change in the portal container div's className.

