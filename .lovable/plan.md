

# Batch 8: Type Safety Cleanup

## Summary
Remove all `as any` casts in `src/services/db.ts` and `src/hooks/useStudentProgress.ts`, and properly type the realtime subscription callback. No logic changes.

## Changes

### 1. `src/services/db.ts` — 6 fixes

**Line 73** — `onInsert: (payload: any)`: Import `RealtimePostgresChangesPayload` from `@supabase/supabase-js`. Type the callback as `(payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => void`. Wrap the `onInsert` call inside the `.on()` handler in a try-catch to prevent subscription crashes.

**Line 102** — `(c: any)`: The Supabase query `select("*, class_memberships(count)")` returns rows typed as `classes.Row & { class_memberships: { count: number }[] }`. Define a local interface `ClassWithCount` extending the classes Row type and use it instead of `any`.

**Line 238** — `data?.classes as any`: The joined query `select("class_id, classes(course_type)")` returns `classes` as `{ course_type: string } | null`. Type it as such — no cast needed, just access `data?.classes?.course_type` directly after removing the intermediate variable.

**Line 248** — `(data as any)?.selected_week`: The profiles query already selects `selected_week` which is typed as `number` in the generated types. The `as any` is unnecessary — `data?.selected_week` works directly since `selected_week` exists on profiles.Row.

**Line 254** — `{ selected_week: week } as any`: `selected_week` is in profiles.Update type (line 394 of types.ts). Remove the cast — `{ selected_week: week }` is valid.

**Line 262** — `{ name, created_by: createdBy, course_type: courseType } as any`: `course_type` is in classes.Insert type (line 91 of types.ts). Remove the cast.

### 2. `src/hooks/useStudentProgress.ts` — 3 fixes

**Line 16** — `[key: string]: any` in ProgressPosition: Change to `[key: string]: Json | undefined` importing `Json` from types.ts.

**Line 45** — `data.current_position as any`: The column is typed as `Json`. Cast to `Record<string, unknown>` and extract `.index` with a type guard or fallback.

**Lines 80, 91** — `newPosition as any` in update/insert: `current_position` accepts `Json`. Since `ProgressPosition` will now use `Json`-compatible values, cast to `Json` instead of `any`.

### 3. `src/services/db.ts` line 85 — try-catch wrapper
Wrap the `onInsert` invocation in the `.on()` callback with try-catch, logging errors to console.error.

## Files touched
- `src/services/db.ts`
- `src/hooks/useStudentProgress.ts`

No new dependencies. No database migrations.

