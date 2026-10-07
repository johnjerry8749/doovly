-- Prevent one professional/account from submitting more than one offer on the same service request.
-- Existing duplicate rows are consolidated by keeping the oldest offer.

delete from public.service_request_offers o
using public.service_request_offers older
where o.request_id = older.request_id
  and o.user_id = older.user_id
  and o.created_at > older.created_at;

create unique index if not exists service_request_offers_request_user_unique
  on public.service_request_offers(request_id, user_id);

create index if not exists idx_service_request_offers_request_user
  on public.service_request_offers(request_id, user_id);
