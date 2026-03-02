
-- Table for teacher notes/feedback on student conversations
CREATE TABLE public.conversation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One note per teacher per conversation
CREATE UNIQUE INDEX idx_conversation_notes_unique ON public.conversation_notes (conversation_id, teacher_id);

ALTER TABLE public.conversation_notes ENABLE ROW LEVEL SECURITY;

-- Teachers can view notes on conversations of their students
CREATE POLICY "Teachers can view own notes"
  ON public.conversation_notes FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());

-- Teachers can insert notes on student conversations they have access to
CREATE POLICY "Teachers can insert notes"
  ON public.conversation_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    AND has_role(auth.uid(), 'teacher')
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND is_teacher_of_student(auth.uid(), c.user_id)
    )
  );

-- Teachers can update their own notes
CREATE POLICY "Teachers can update own notes"
  ON public.conversation_notes FOR UPDATE
  TO authenticated
  USING (teacher_id = auth.uid());

-- Teachers can delete their own notes
CREATE POLICY "Teachers can delete own notes"
  ON public.conversation_notes FOR DELETE
  TO authenticated
  USING (teacher_id = auth.uid());

-- Admins can view all notes
CREATE POLICY "Admins can view all notes"
  ON public.conversation_notes FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_conversation_notes_updated_at
  BEFORE UPDATE ON public.conversation_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
