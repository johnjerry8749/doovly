-- Keep booking accept/decline events out of free chat coin usage.

alter table public.messages drop constraint if exists messages_kind_check;

alter table public.messages add constraint messages_kind_check
check (kind = any (array[
  'text'::text,
  'image'::text,
  'location'::text,
  'location_stopped'::text,
  'request_card'::text,
  'system'::text
]));
