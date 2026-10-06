-- The booking conversation trigger uses ON CONFLICT (booking_id).
-- Ensure PostgreSQL has a matching unique constraint/index.
create unique index if not exists conversations_booking_id_unique
on public.conversations (booking_id)
where booking_id is not null;
