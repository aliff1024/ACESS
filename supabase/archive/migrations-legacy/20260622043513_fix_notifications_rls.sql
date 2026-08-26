CREATE POLICY "users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
