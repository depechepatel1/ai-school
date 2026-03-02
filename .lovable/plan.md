

## Homework Mode vs Independent Practice Mode

### Current State
The Speaking Studio has two activity modes (`shadowing` / `speaking`) and two practice types (`pronunciation` / `fluency`). All practice time is logged to `student_practice_logs` with a single `activity_type` field. There's no distinction between mandatory homework and voluntary independent practice.

### Proposed Design

**Add a top-level mode toggle: "Homework" vs "Free Practice"** — displayed as a prominent pill switcher above the existing shadowing/speaking controls.

#### How it works:

1. **New column**: Add `practice_mode` (`text`, default `'homework'`) to `student_practice_logs` with values `'homework'` or `'independent'`.

2. **UI mode switcher**: A new pill toggle at the top of the Speaking Studio (above the shadowing/speaking toggle). Two options:
   - **Homework** — locks to the student's `selected_week`, shows the HomeworkInstructions panel, progress bars track against weekly homework targets. WeekSelector is visible but read-only (or hidden).
   - **Free Practice** — unlocks all weeks/content freely, hides homework instructions, timer tracks independently. No weekly target enforcement.

3. **Timer separation**: `usePracticeTimer` receives the new `practiceMode` parameter. It creates/loads a separate `student_practice_logs` row per mode (the existing unique lookup by `user_id + activity_type + week_number + today` also factors in `practice_mode`). Homework and independent logs never merge.

4. **HomeworkInstructions update**: Only aggregates rows where `practice_mode = 'homework'` so independent practice doesn't count toward homework completion.

5. **Teacher dashboard / analytics**: The `get_class_engagement` function and teacher views can later be extended to show both homework and independent practice totals separately, but initially independent practice simply accumulates as a separate tally visible in the StreakWidget label ("Free Practice" instead of countdown-to-target).

6. **StreakWidget label**: Shows "Homework · 3:42" or "Free Practice · +2:15" to make the current mode obvious.

#### Database Changes

```sql
ALTER TABLE student_practice_logs
  ADD COLUMN practice_mode text NOT NULL DEFAULT 'homework';
```

Update the validation trigger to also validate `practice_mode IN ('homework', 'independent')`.

#### Files to Change

| File | Change |
|---|---|
| Migration SQL | Add `practice_mode` column + update trigger |
| `src/hooks/usePracticeTimer.ts` | Accept `practiceMode`, include in log lookup/create |
| `src/pages/SpeakingStudio.tsx` | Add mode toggle state, pass to timer, conditionally show/hide HomeworkInstructions and WeekSelector behavior |
| `src/components/speaking/StreakWidget.tsx` | Accept + display mode label |
| `src/components/speaking/HomeworkInstructions.tsx` | Filter by `practice_mode = 'homework'` |
| `src/services/db.ts` | Update `fetchTodayPracticeLogs` to accept/filter by `practice_mode` |

