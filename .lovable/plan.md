

## Plan: Add UK/US Accent Flags to Right Edge of Practice Screens

### Overview
Replace the small inline flag SVGs with larger, more detailed flag components and place them as selectable buttons on the right edge of the screen, above the existing recording controls stack.

### Changes

**1. Rewrite `src/components/speaking/FlagIcons.tsx`**
- Create `UKFlag` and `USFlag` as larger, more detailed SVG flags (~40x24px)
- UK flag: proper Union Jack with correct diagonal overlaps
- US flag: add small star dots in the canton for realism
- Both get rounded corners, subtle shadow, and a hover glow effect

**2. New component: `src/components/speaking/AccentSelector.tsx`**
- Two stacked flag buttons (UK on top, US below) in a small glassmorphic container
- Props: `accent: "uk" | "us"`, `onChange: (accent) => void`
- Active flag gets a bright border + subtle glow; inactive flag is slightly dimmed
- Compact vertical layout to sit above the right-side control stack

**3. Integration into all 3 practice screens**

Each screen gets `const [accent, setAccent] = useState<"uk"|"us">("uk")` and renders `<AccentSelector>` on the right edge, positioned above the existing controls stack.

- **`SpeakingPractice.tsx`**: Add accent state + selector above the recording controls container (right-4, above top-1/2 area). Accent available for future TTS use.
- **`PronunciationPractice.tsx`**: Add accent state + selector above the vertical button stack. Pass `accent` to `speak()` call instead of hardcoded `"uk"`.
- **`FluencyPractice.tsx`**: Add accent state + selector above controls. Pass `accent` to `speak()` call instead of hardcoded `"uk"`.

### Layout
The accent selector sits at `right-4 top-[calc(50%-120px)]` or similar, just above the existing right-side control stack, keeping the right edge as the unified control column.

