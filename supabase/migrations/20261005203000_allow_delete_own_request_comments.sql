-- Allow authenticated users to delete their own service request comments.
CREATE POLICY "Users can delete own comments"
  ON public.service_request_comments
  FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());
