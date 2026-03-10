-- Delete defunct IGCSE and IELTS shadowing-pronunciation metadata rows
-- (the shared one is the correct canonical entry)
DELETE FROM public.curriculum_metadata
WHERE module_type = 'shadowing-pronunciation'
  AND course_type IN ('igcse', 'ielts');