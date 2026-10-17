drop policy if exists "Users can send messages in own conversations" on public.messages;

create policy "Users can send messages in own conversations"
on public.messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
      and (
        coalesce(messages.kind, 'text') not in ('location', 'location_stopped')
        or (
          (
            c.booking_id is not null
            and exists (
              select 1
              from public.bookings b
              where b.id = c.booking_id
                and lower(coalesce(b.status, 'pending')) = 'accepted'
            )
          )
          or
          (
            c.offer_id is not null
            and exists (
              select 1
              from public.service_request_offers o
              where o.id = c.offer_id
                and lower(coalesce(o.status, 'pending')) = 'accepted'
            )
          )
        )
      )
  )
);