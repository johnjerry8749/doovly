create unique index if not exists service_request_likes_request_user_unique
  on public.service_request_likes(request_id, user_id);
