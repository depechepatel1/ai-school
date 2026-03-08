
## Relocate Speaking Questions UI to Unobscure Teacher

### Problem
The current center-top question box (lines 440-476 in SpeakingStudio.tsx) blocks the teacher's face, violating the teacher-focus design principle.

### Solution

**1. Move question text into LiveTranscriptBar**
- Add `questionText` prop to `LiveTranscriptBar`
- Display question in a header row above the transcript content with subtle styling (smaller text, different color accent)
- Question appears at top of the 12rem transcript bar, transcript scrolls below it

**2. Create left-side floating panel**
- Position: `absolute left-4 top-1/2 -translate-y-1/2` — vertically centered on left edge
- Compact glassmorphism card containing:
  - Week number badge + WeekSelector dropdown
  - Question number indicator (Part 2 · Q1)
  - "Next Question" button
  - HomeworkInstructions collapsible (when in homework mode)
- Max width ~200px to stay minimal

**3. Remove center question box**
- Delete the `absolute top-6 left-1/2` div that currently renders the question

### Files to Change

| File | Changes |
|------|---------|
| `src/components/speaking/LiveTranscriptBar.tsx` | Add `questionText` prop, render question header row above transcript |
| `src/components/speaking/SpeakingLeftPanel.tsx` | **New** — floating left panel with week/question info, next button, homework tasks |
| `src/pages/SpeakingStudio.tsx` | Remove center box (lines 440-476), add `SpeakingLeftPanel`, pass `questionText` to `LiveTranscriptBar` |

### UI Layout
```text
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌────────┐                              [XP] [Right]   │
│  │Week 6  │                                   [Buttons] │
│  │Part 2  │         TEACHER VIDEO                       │
│  │Q1      │                                             │
│  │[Next]  │                                             │
│  │[Tasks] │                                             │
│  └────────┘                                             │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Q: Describe a place with trees you'd like to visit │││
│  │─────────────────────────────────────────────────────││
│  │ [Transcript text scrolls here...]                  │││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```
