
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'parent');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Classes table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Class memberships
CREATE TABLE public.class_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, user_id)
);

-- Parent-student links
CREATE TABLE public.parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id)
);

-- Conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Security definer helper functions (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of_class(_user_id UUID, _class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes WHERE id = _class_id AND created_by = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_student_of_parent(_parent_id UUID, _student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_student_links WHERE parent_id = _parent_id AND student_id = _student_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of_student(_teacher_id UUID, _student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_memberships cm
    JOIN public.classes c ON c.id = cm.class_id
    WHERE c.created_by = _teacher_id AND cm.user_id = _student_id
  )
$$;

-- Join class by code function (validates code server-side)
CREATE OR REPLACE FUNCTION public.join_class_by_code(_join_code TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _class_id UUID;
BEGIN
  -- Verify user is a student
  IF NOT public.has_role(auth.uid(), 'student') THEN
    RAISE EXCEPTION 'Only students can join classes';
  END IF;
  
  -- Find class by code
  SELECT id INTO _class_id FROM public.classes WHERE join_code = _join_code;
  IF _class_id IS NULL THEN
    RAISE EXCEPTION 'Invalid class code';
  END IF;
  
  -- Insert membership
  INSERT INTO public.class_memberships (class_id, user_id)
  VALUES (_class_id, auth.uid())
  ON CONFLICT (class_id, user_id) DO NOTHING;
  
  RETURN _class_id;
END;
$$;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Teachers can view student profiles" ON public.profiles FOR SELECT USING (public.is_teacher_of_student(auth.uid(), id));
CREATE POLICY "Parents can view child profiles" ON public.profiles FOR SELECT USING (public.is_student_of_parent(auth.uid(), id));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- USER_ROLES policies
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK (user_id = auth.uid());

-- CLASSES policies
CREATE POLICY "Teachers can create classes" ON public.classes FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'teacher') AND created_by = auth.uid());
CREATE POLICY "Teachers can view own classes" ON public.classes FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Students can view joined classes" ON public.classes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.class_memberships cm WHERE cm.class_id = id AND cm.user_id = auth.uid())
);
CREATE POLICY "Teachers can update own classes" ON public.classes FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Teachers can delete own classes" ON public.classes FOR DELETE USING (created_by = auth.uid());

-- CLASS_MEMBERSHIPS policies
CREATE POLICY "Teachers can view own class members" ON public.class_memberships FOR SELECT USING (public.is_teacher_of_class(auth.uid(), class_id));
CREATE POLICY "Students can view own memberships" ON public.class_memberships FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Teachers can remove students" ON public.class_memberships FOR DELETE USING (public.is_teacher_of_class(auth.uid(), class_id));

-- PARENT_STUDENT_LINKS policies
CREATE POLICY "Parents can view own links" ON public.parent_student_links FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "Students can view own parent links" ON public.parent_student_links FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Parents can create links" ON public.parent_student_links FOR INSERT WITH CHECK (parent_id = auth.uid() AND public.has_role(auth.uid(), 'parent'));
CREATE POLICY "Parents can delete own links" ON public.parent_student_links FOR DELETE USING (parent_id = auth.uid());

-- CONVERSATIONS policies
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Teachers can view student conversations" ON public.conversations FOR SELECT USING (public.is_teacher_of_student(auth.uid(), user_id));
CREATE POLICY "Parents can view child conversations" ON public.conversations FOR SELECT USING (public.is_student_of_parent(auth.uid(), user_id));
CREATE POLICY "Users can create own conversations" ON public.conversations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own conversations" ON public.conversations FOR DELETE USING (user_id = auth.uid());

-- MESSAGES policies
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
);
CREATE POLICY "Teachers can view student messages" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND public.is_teacher_of_student(auth.uid(), c.user_id))
);
CREATE POLICY "Parents can view child messages" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND public.is_student_of_parent(auth.uid(), c.user_id))
);
CREATE POLICY "Users can insert own messages" ON public.messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
);
