

## Fix Part 1 Examiner Script Sequence

### Problem

The scripted Part 1 flow only speaks one line at a time and always waits for the student to click "Next Question" — even for non-question lines like greetings ("Good afternoon", "My name is Teacher Li") and segment transitions ("Let's talk about your hometown"). These should auto-chain after TTS finishes, with the examiner only pausing on actual questions that need a student response.

Additionally, the first intro line is spoken during the countdown phase (before the test starts), which means it may be missed or feel disconnected from the sequence.

### Correct Examiner Sequence (from the JSON)

```text
1. [auto] "Good afternoon."
2. [auto] "My name is Teacher Li."
3. [wait] "Can you tell me your full name, please?"
4. [wait] "Thank you. And what shall I call you?"
5. [wait] "And can you tell me where you're from?"
6. [auto] "Now, in this first part, I'd like to ask you some questions about yourself."
7. [auto] "Let's talk about your hometown."  ← segment intro
8. [wait] "Is your hometown a city, a town, or a village?"
9. [wait] "What do you like about your hometown?"
10. [wait] ...more questions...
11. [auto] "Let's talk about playing video games."  ← next segment intro
12. [wait] questions...
```

Lines marked `[auto]` chain automatically after TTS ends. Lines marked `[wait]` pause for the student to respond (click Next Question).

### Changes

**File: `src/hooks/useMockTest.ts`**

1. **Remove early intro speak from `startTest`**: Don't speak the first intro line during countdown. Instead, let the full intro sequence begin when Part 1 actually starts.

2. **Rewrite `speakNextPart1Question` to auto-chain non-question lines**: After speaking a line, check if it's a question (contains `?`). If not, use `ttsHandleRef.current.finished.then(...)` to auto-call itself after a short delay (~800ms pause). If it is a question, stop and wait for the student to click Next.

3. **Apply the same auto-chain logic to segment intros**: When a segment intro is spoken (e.g. "Let's talk about..."), auto-advance to the first question after TTS finishes.

4. **Guard against cancelled state**: If the test is stopped or the part changes during an auto-chain, bail out to prevent ghost speech.

### Technical Detail

The TTS provider already returns a `TTSHandle` with a `finished: Promise<void>`. The `speakText` function stores the handle in `ttsHandleRef`. The auto-chain logic will:

```
speakNextPart1Question():
  get next line from sequence
  add to messages, speak via TTS
  if line contains "?" → return true (wait for user)
  else → ttsHandleRef.current.finished.then(() => {
    if still in part1 and running → speakNextPart1Question()
  })
```

No new files. No database changes. Single file edit to `useMockTest.ts`.

