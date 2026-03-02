-- Allow students to read teacher notes on their own conversations
CREATE POLICY "Students can view notes on own conversations"
ON public.conversation_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_notes.conversation_id
      AND c.user_id = auth.uid()
  )
);