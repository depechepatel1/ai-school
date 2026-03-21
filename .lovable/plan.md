

# Batch 3: Add Missing Database Indexes

## What
Create a single migration adding indexes on foreign key and frequently-queried columns to speed up RLS policy evaluation and common lookups.

## Note
The schema has `user_events`, not `analytics_events`. The last two indexes will target `user_events` instead.

## Migration SQL

```sql
CREATE INDEX IF NOT EXISTS idx_classes_created_by ON public.classes(created_by);
CREATE INDEX IF NOT EXISTS idx_class_memberships_user_id ON public.class_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_student_practice_logs_user_id ON public.student_practice_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON public.user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON public.user_events(created_at DESC);
```

## No other changes
- No TypeScript files modified
- No existing migrations touched
- Table name corrected: `user_events` (not `analytics_events`)

