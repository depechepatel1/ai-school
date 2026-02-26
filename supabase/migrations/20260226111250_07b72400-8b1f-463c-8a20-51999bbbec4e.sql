
-- Create a secure view for students that excludes join_code
CREATE VIEW public.classes_student_view
WITH (security_invoker = true)
AS
SELECT id, name, created_at, updated_at, created_by
FROM public.classes;

-- Grant access to the view
GRANT SELECT ON public.classes_student_view TO authenticated;

COMMENT ON VIEW public.classes_student_view IS 'Student-safe view of classes that excludes join_code';
