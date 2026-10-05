create index if not exists idx_admin_notifications_created_by on public.admin_notifications(created_by);
create index if not exists idx_conversation_reads_user_id on public.conversation_reads(user_id);
create index if not exists idx_conversations_booking_id on public.conversations(booking_id);
create index if not exists idx_conversations_service_request_id on public.conversations(service_request_id);
create index if not exists idx_messages_sender_id on public.messages(sender_id);
create index if not exists idx_professional_subscriptions_plan_id on public.professional_subscriptions(plan_id);
create index if not exists idx_professional_subscriptions_user_id on public.professional_subscriptions(user_id);
create index if not exists idx_reviews_user_id on public.reviews(user_id);
create index if not exists idx_saved_providers_professional_id on public.saved_providers(professional_id);
create index if not exists idx_service_request_comments_user_id on public.service_request_comments(user_id);
create index if not exists idx_service_request_likes_user_id on public.service_request_likes(user_id);
create index if not exists idx_service_request_offers_professional_id on public.service_request_offers(professional_id);
create index if not exists idx_service_request_offers_user_id on public.service_request_offers(user_id);
create index if not exists idx_verification_applications_user_id on public.verification_applications(user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.notify_booking_created() from public, anon, authenticated;
revoke execute on function public.notify_offer_created() from public, anon, authenticated;