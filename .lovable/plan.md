

## Update Examiner Name to "Miss Li"

A single find-and-replace across the codebase to change all instances of "Teacher Li" to "Miss Li".

### Files to Edit

1. **`src/hooks/useMockTest.ts`** — line 402: change `examiner_name: "Teacher Li"` → `"Miss Li"`
2. **`supabase/functions/deepseek-chat/index.ts`** — line 9: change system prompt name
3. **`src/components/OmniChatModal.tsx`** — lines 46, 187, 201: update display name and greeting
4. **`src/components/student/OmniMicButton.tsx`** — line 16: update hint label

All four files, same change: `"Teacher Li"` → `"Miss Li"`.

