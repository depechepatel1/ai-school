-- Fix the "Students can view joined classes" RLS policy on classes table
-- The bug: cm.class_id = cm.id (self-referencing) should be cm.class_id = classes.id

DROP POLICY IF EXISTS "Students can view joined classes" ON public.classes;

CREATE POLICY "Students can view joined classes"
ON public.classes
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.class_memberships cm
    WHERE cm.class_id = classes.id
      AND cm.user_id = auth.uid()
  )
);