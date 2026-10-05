-- Enable realtime delivery for user in-app notifications.
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
