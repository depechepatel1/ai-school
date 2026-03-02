-- Admin RLS policies: full read access across all tables

-- profiles: admin can view all
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- user_roles: admin can view all
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- classes: admin can view all
CREATE POLICY "Admins can view all classes"
ON public.classes FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- classes: admin can update any class
CREATE POLICY "Admins can update any class"
ON public.classes FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- classes: admin can delete any class
CREATE POLICY "Admins can delete any class"
ON public.classes FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- class_memberships: admin can view all
CREATE POLICY "Admins can view all memberships"
ON public.class_memberships FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- class_memberships: admin can remove any
CREATE POLICY "Admins can delete any membership"
ON public.class_memberships FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- student_practice_logs: admin can view all
CREATE POLICY "Admins can view all practice logs"
ON public.student_practice_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- student_curriculum_progress: admin can view all
CREATE POLICY "Admins can view all progress"
ON public.student_curriculum_progress FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- conversations: admin can view all
CREATE POLICY "Admins can view all conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- messages: admin can view all
CREATE POLICY "Admins can view all messages"
ON public.messages FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- parent_student_links: admin can view all
CREATE POLICY "Admins can view all parent links"
ON public.parent_student_links FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- curriculum_items: admin can manage all (already readable by all authenticated)
CREATE POLICY "Admins can insert curriculum"
ON public.curriculum_items FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update curriculum"
ON public.curriculum_items FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete curriculum"
ON public.curriculum_items FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));