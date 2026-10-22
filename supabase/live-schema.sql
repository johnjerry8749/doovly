


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."allow_conversation_text"("p_conversation_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ declare c public.conversations%rowtype; allowed boolean := false; begin select * into c from public.conversations where id=p_conversation_id and (participant_a=auth.uid() or participant_b=auth.uid()); if not found then raise exception 'Conversation not found'; end if; if c.booking_id is not null then select exists (select 1 from public.bookings b join public.professionals p on p.id=b.professional_id where b.id=c.booking_id and p.user_id=auth.uid()) into allowed; elsif c.service_request_id is not null then select exists (select 1 from public.service_requests r where r.id=c.service_request_id and r.created_by=auth.uid()) into allowed; end if; if not allowed then raise exception 'Only the request recipient can allow text'; end if; update public.conversations set text_allowed=true,text_allowed_by=auth.uid(),text_allowed_at=now() where id=c.id and text_allowed=false; return true; end; $$;


ALTER FUNCTION "public"."allow_conversation_text"("p_conversation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."attribute_booking_to_promotion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_promotion_id uuid;
begin
  if new.service_id is null then
    return new;
  end if;

  if new.promotion_id is null then
    select sp.id into v_promotion_id
    from public.service_promotions sp
    where sp.service_id = new.service_id
      and sp.status = 'active'
      and sp.starts_at <= now()
      and sp.ends_at > now()
    order by sp.ends_at desc
    limit 1;
    new.promotion_id := v_promotion_id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."attribute_booking_to_promotion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consume_password_reset_rate_limit"("p_email_hash" "text", "p_limit" integer DEFAULT 3, "p_window_seconds" integer DEFAULT 900) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_row public.password_reset_rate_limits%rowtype;
  v_now timestamptz := now();
  v_retry_after integer;
begin

  select *
  into v_row
  from public.password_reset_rate_limits
  where email_hash = p_email_hash
  for update;

  -- First request.
  if not found then

    insert into public.password_reset_rate_limits (
      email_hash,
      attempts,
      window_started_at
    )
    values (
      p_email_hash,
      1,
      v_now
    );

    return jsonb_build_object(
      'allowed', true,
      'attempts', 1,
      'retry_after_seconds', 0
    );
  end if;


  -- Start a new 15-minute window.
  if v_now >=
     v_row.window_started_at
     + make_interval(secs => p_window_seconds)
  then

    update public.password_reset_rate_limits
    set
      attempts = 1,
      window_started_at = v_now
    where email_hash = p_email_hash;

    return jsonb_build_object(
      'allowed', true,
      'attempts', 1,
      'retry_after_seconds', 0
    );
  end if;


  -- Limit reached.
  if v_row.attempts >= p_limit then

    v_retry_after := greatest(
      1,
      ceil(
        extract(
          epoch from (
            v_row.window_started_at
            + make_interval(secs => p_window_seconds)
            - v_now
          )
        )
      )::integer
    );

    return jsonb_build_object(
      'allowed', false,
      'attempts', v_row.attempts,
      'retry_after_seconds', v_retry_after
    );
  end if;


  -- Consume another attempt.
  update public.password_reset_rate_limits
  set attempts = attempts + 1
  where email_hash = p_email_hash;

  return jsonb_build_object(
    'allowed', true,
    'attempts', v_row.attempts + 1,
    'retry_after_seconds', 0
  );

end;
$$;


ALTER FUNCTION "public"."consume_password_reset_rate_limit"("p_email_hash" "text", "p_limit" integer, "p_window_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_booking_conversation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  professional_user uuid;
  conversation_uuid uuid;
begin
  select p.user_id into professional_user from public.professionals p where p.id = new.professional_id;
  if professional_user is null or professional_user = new.customer_id then return new; end if;

  select c.id into conversation_uuid
  from public.conversations c
  where (c.participant_a = new.customer_id and c.participant_b = professional_user)
     or (c.participant_b = new.customer_id and c.participant_a = professional_user)
  order by c.last_message_at desc nulls last limit 1;

  if conversation_uuid is not null then
    update public.conversations
    set participant_a = new.customer_id,
        participant_b = professional_user,
        booking_id = new.id,
        service_request_id = null,
        offer_id = null,
        last_message = 'Booking request: ' || coalesce(new.title,new.service_name,'Booking'),
        last_message_at = now()
    where id = conversation_uuid;
  else
    insert into public.conversations(participant_a,participant_b,booking_id,last_message,last_message_at)
    values(new.customer_id,professional_user,new.id,
      'Booking request: ' || coalesce(new.title,new.service_name,'Booking'),now())
    returning id into conversation_uuid;
  end if;

  insert into public.messages(conversation_id,sender_id,text,kind,card)
  values(
    conversation_uuid,new.customer_id,
    'Booking request: ' || coalesce(new.title,new.service_name,'Booking'),
    'request_card',
    jsonb_build_object(
      'kind','booking',
      'title',coalesce(new.title,new.service_name,'Booking'),
      'category',new.service_name,
      'location',coalesce(new.location,new.address),
      'description',new.notes,
      'amount',coalesce(new.amount,0),
      'date',new.display_date,
      'statusLabel',
        case lower(coalesce(new.status,'pending'))
          when 'pending' then 'Waiting for professional to accept'
          when 'declined' then 'This booking was declined'
          when 'cancelled' then 'This booking was declined'
          else 'Accepted'
        end
    )
  );
  return new;
end; $$;


ALTER FUNCTION "public"."create_booking_conversation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_offer_conversation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  request_row record;
  conversation_uuid uuid;
begin
  select r.created_by,r.title,r.category,r.location,r.city,r.description
  into request_row
  from public.service_requests r where r.id = new.request_id;

  if request_row.created_by is null or new.user_id is null or request_row.created_by = new.user_id then return new; end if;

  select c.id into conversation_uuid
  from public.conversations c
  where (c.participant_a = request_row.created_by and c.participant_b = new.user_id)
     or (c.participant_b = request_row.created_by and c.participant_a = new.user_id)
  order by c.last_message_at desc nulls last limit 1;

  if conversation_uuid is not null then
    update public.conversations
    set participant_a = request_row.created_by,
        participant_b = new.user_id,
        service_request_id = new.request_id,
        offer_id = new.id,
        booking_id = null,
        last_message = 'Offer: ₦' || to_char(new.amount,'FM999,999,999,990') ||
          ' on "' || coalesce(request_row.title,'Service request') || '"',
        last_message_at = now()
    where id = conversation_uuid;
  else
    insert into public.conversations(
      participant_a,participant_b,service_request_id,offer_id,last_message,last_message_at
    )
    values(
      request_row.created_by,new.user_id,new.request_id,new.id,
      'Offer: ₦' || to_char(new.amount,'FM999,999,999,990') ||
        ' on "' || coalesce(request_row.title,'Service request') || '"',now()
    )
    returning id into conversation_uuid;
  end if;

  insert into public.messages(conversation_id,sender_id,text,kind,card)
  values(
    conversation_uuid,new.user_id,
    'Offer: ₦' || to_char(new.amount,'FM999,999,999,990') ||
      ' on "' || coalesce(request_row.title,'Service request') || '"',
    'request_card',
    jsonb_build_object(
      'kind','offer',
      'title',coalesce(request_row.title,'Service request'),
      'category',request_row.category,
      'location',coalesce(request_row.location,request_row.city),
      'description',request_row.description,
      'amount',new.amount,
      'date',to_char(new.created_at,'DD Mon YYYY'),
      'statusLabel',
        case when lower(coalesce(new.status,'pending'))='accepted'
          then 'Offer accepted'
          else 'Waiting for customer to accept'
        end
    )
  );
  return new;
end; $$;


ALTER FUNCTION "public"."create_offer_conversation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_my_conversation"("p_conversation_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  delete from public.conversations
  where id = p_conversation_id
    and (participant_a = auth.uid() or participant_b = auth.uid());
$$;


ALTER FUNCTION "public"."delete_my_conversation"("p_conversation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_chat_message_rules"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  pro_user boolean;
  credits integer;
  period_started timestamptz;
  next_started timestamptz;
  booking_status text;
  offer_status text;
begin
  if new.kind in ('text', 'image') then
    if new.sender_id <> auth.uid() then
      raise exception 'You can only send messages as yourself';
    end if;

    if not exists (
      select 1 from public.conversations c
      where c.id = new.conversation_id
        and (c.participant_a = new.sender_id or c.participant_b = new.sender_id)
    ) then
      raise exception 'You are not a participant in this conversation';
    end if;

    pro_user := public.is_chat_pro(new.sender_id);

    if new.kind = 'image' and not pro_user then
      raise exception 'IMAGE_CHAT_PRO_REQUIRED';
    end if;

    if not pro_user then
      insert into public.chat_credits (user_id, remaining, period_started_at)
      values (new.sender_id, 15, now())
      on conflict (user_id) do nothing;

      select period_started_at
        into period_started
      from public.chat_credits
      where user_id = new.sender_id
      for update;

      if now() >= period_started + interval '1 month' then
        next_started := period_started;

        while now() >= next_started + interval '1 month' loop
          next_started := next_started + interval '1 month';
        end loop;

        update public.chat_credits
        set remaining = 15,
            period_started_at = next_started,
            updated_at = now()
        where user_id = new.sender_id;
      end if;

      update public.chat_credits
      set remaining = remaining - 1,
          updated_at = now()
      where user_id = new.sender_id
        and remaining > 0
      returning remaining into credits;

      if not found then
        raise exception 'CHAT_CREDITS_EXHAUSTED';
      end if;
    end if;
  end if;

  if new.kind = 'location' then
    select lower(coalesce(b.status, ''))
    into booking_status
    from public.conversations c
    left join public.bookings b on b.id = c.booking_id
    where c.id = new.conversation_id;

    if booking_status is not null and booking_status <> '' then
      if booking_status not in ('accepted', 'ongoing', 'upcoming', 'booked', 'awaiting_approval') then
        raise exception 'LOCATION_REQUIRES_PROVIDER_APPROVAL';
      end if;
    else
      select lower(coalesce(sro.status, ''))
      into offer_status
      from public.conversations c
      left join public.service_request_offers sro on sro.id = c.offer_id
      where c.id = new.conversation_id;

      if offer_status is not null and offer_status <> '' and offer_status <> 'accepted' then
        raise exception 'LOCATION_REQUIRES_PROVIDER_APPROVAL';
      end if;
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_chat_message_rules"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finish_expired_service_promotions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  p record;
  v_system_user_id uuid;
  v_conversation_id uuid;
  v_impressions bigint;
  v_views bigint;
  v_requests bigint;
  v_bookings bigint;
  v_message text;
  v_count integer := 0;
begin
  select id into v_system_user_id
  from public.profiles
  where lower(email) = 'system@doovly.com'
  limit 1;

  -- If the Doovly system profile is not available yet, do not mark messages
  -- as delivered; a later scheduled run can retry the chat delivery.
  for p in
    select sp.id, sp.user_id, sp.service_id, sp.ends_at, sp.status, s.name as service_name
    from public.service_promotions sp
    left join public.services s on s.id = sp.service_id
    where sp.ends_at <= now()
      and (
        sp.status = 'active'
        or (sp.status = 'expired' and sp.end_notified_at is null)
      )
    order by sp.ends_at
    for update of sp skip locked
  loop
    if p.status is distinct from 'expired' then
      update public.service_promotions
      set status = 'expired', updated_at = now()
      where id = p.id and status = 'active';
    end if;

    if v_system_user_id is null then
      continue;
    end if;

    select
      coalesce(sum(a.impressions), 0),
      coalesce(sum(a.service_views), 0),
      coalesce(sum(a.booking_requests), 0),
      coalesce(sum(a.bookings), 0)
    into v_impressions, v_views, v_requests, v_bookings
    from public.service_promotion_analytics a
    where a.promotion_id = p.id;

    select c.id into v_conversation_id
    from public.conversations c
    where (c.participant_a = p.user_id and c.participant_b = v_system_user_id)
       or (c.participant_a = v_system_user_id and c.participant_b = p.user_id)
    order by c.created_at desc
    limit 1;

    if v_conversation_id is null then
      insert into public.conversations (
        participant_a, participant_b, last_message, last_message_at
      ) values (
        p.user_id, v_system_user_id,
        'Your promotion has ended. Your final results are ready.',
        now()
      )
      returning id into v_conversation_id;
    end if;

    v_message :=
      'Promotion ended — "' || coalesce(nullif(p.service_name, ''), 'Your service') ||
      '" has finished its promotion period.' || E'\n\n' ||
      'Final results:' || E'\n' ||
      '• Impressions: ' || v_impressions || E'\n' ||
      '• Service views: ' || v_views || E'\n' ||
      '• Booking requests: ' || v_requests || E'\n' ||
      '• Confirmed bookings: ' || v_bookings || E'\n\n' ||
      'The promotion is no longer active. You can promote this service again whenever you are ready.';

    insert into public.messages (conversation_id, sender_id, text, kind)
    values (v_conversation_id, v_system_user_id, v_message, 'system');

    update public.conversations
    set last_message = 'Promotion ended — final results are ready.',
        last_message_at = now()
    where id = v_conversation_id;

    insert into public.conversation_reads (
      conversation_id, user_id, unread_count, last_read_at
    ) values (
      v_conversation_id, p.user_id, 1, null
    )
    on conflict (conversation_id, user_id)
    do update set unread_count = public.conversation_reads.unread_count + 1;

    insert into public.notifications (
      user_id, type, title, body, unread, data
    ) values (
      p.user_id,
      'general',
      'Promotion ended',
      '"' || coalesce(nullif(p.service_name, ''), 'Your service') ||
      '" promotion has ended. Open Doovly chat to see your final results.',
      true,
      jsonb_build_object(
        'type', 'promotion_ended',
        'screen', 'chat',
        'promotion_id', p.id,
        'impressions', v_impressions,
        'service_views', v_views,
        'booking_requests', v_requests,
        'bookings', v_bookings
      )
    );

    update public.service_promotions
    set end_notified_at = now(), updated_at = now()
    where id = p.id and end_notified_at is null;

    v_count := v_count + 1;
    v_conversation_id := null;
  end loop;

  return v_count;
end;
$$;


ALTER FUNCTION "public"."finish_expired_service_promotions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_chat_credits"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  uid uuid := auth.uid();
  current_remaining integer;
  current_started timestamptz;
  next_started timestamptz;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.chat_credits (user_id, remaining, period_started_at)
  values (uid, 15, now())
  on conflict (user_id) do nothing;

  select remaining, period_started_at
    into current_remaining, current_started
  from public.chat_credits
  where user_id = uid
  for update;

  if now() >= current_started + interval '1 month' then
    next_started := current_started;
    while now() >= next_started + interval '1 month' loop
      next_started := next_started + interval '1 month';
    end loop;

    current_remaining := 15;

    update public.chat_credits
    set remaining = 15,
        period_started_at = next_started,
        updated_at = now()
    where user_id = uid;
  end if;

  return current_remaining;
end;
$$;


ALTER FUNCTION "public"."get_my_chat_credits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_profile_control_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF NOT COALESCE(public.is_admin(), false) THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
       OR NEW.pro_trial_started_at IS DISTINCT FROM OLD.pro_trial_started_at
       OR NEW.pro_trial_ends_at IS DISTINCT FROM OLD.pro_trial_ends_at
       OR NEW.mock_id IS DISTINCT FROM OLD.mock_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.member_since IS DISTINCT FROM OLD.member_since THEN
      RAISE EXCEPTION 'Profile account-control fields can only be changed by an administrator'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."guard_profile_control_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  next_role text;
  next_city text;
  next_profession text;
  next_phone text;
begin
  next_role := coalesce(new.raw_user_meta_data ->> 'role', 'user');

  if next_role not in ('user', 'admin', 'professional') then
    next_role := 'user';
  end if;

  next_city := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'city'), ''), 'Lagos');
  next_profession := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'profession'), ''), 'Other');
  next_phone := coalesce(nullif(btrim(new.phone), ''), nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''));

  insert into public.profiles (
    id, full_name, phone, email, role, city, profession, mock_id,
    pro_trial_started_at, pro_trial_ends_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'User'),
    new.phone,
    new.email,
    next_role,
    next_city,
    next_profession,
    new.raw_user_meta_data ->> 'mock_id',
    now(),
    now() + interval '30 days'
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    city = coalesce(excluded.city, public.profiles.city),
    profession = coalesce(excluded.profession, public.profiles.profession);

  if next_role <> 'admin' then
    insert into public.professionals (
      user_id, profession, city, price_from, price_from_value, email, phone
    )
    values (
      new.id, next_profession, next_city, '₦0', 0, new.email, next_phone
    )
    on conflict (user_id) do nothing;
  end if;

  insert into public.chat_credits (user_id, remaining)
  values (new.id, 15)
  on conflict (user_id) do nothing;

  insert into public.notifications (
    user_id, type, title, body, unread, avatar_url, time_label
  )
  values (
    new.id, 'general', 'Welcome to Doovly 👋',
    'Thanks for joining Doovly! Explore services and find trusted professionals near you.',
    true, null, 'Just now'
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_conversation_unread"("p_conversation_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_sender uuid := auth.uid();
  v_recipient uuid;
  v_is_member boolean;
begin
  if v_sender is null then raise exception 'Not authenticated'; end if;
  select exists(select 1 from public.conversations c where c.id=p_conversation_id and (c.participant_a=v_sender or c.participant_b=v_sender)) into v_is_member;
  if not v_is_member then raise exception 'Not a conversation participant'; end if;
  select case when participant_a=v_sender then participant_b else participant_a end into v_recipient from public.conversations where id=p_conversation_id;
  insert into public.conversation_reads(conversation_id,user_id,unread_count,last_read_at)
  values(p_conversation_id,v_recipient,1,null)
  on conflict (conversation_id,user_id) do update set unread_count=public.conversation_reads.unread_count+1;
end;
$$;


ALTER FUNCTION "public"."increment_conversation_unread"("p_conversation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and not is_suspended
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_chat_pro"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    exists (
      select 1
      from public.professionals p
      where p.user_id = p_user_id
        and p.subscribed = true
    )
    or exists (
      select 1
      from public.profiles pr
      where pr.id = p_user_id
        and pr.pro_trial_ends_at is not null
        and pr.pro_trial_ends_at > now()
    );
$$;


ALTER FUNCTION "public"."is_chat_pro"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_booking_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  target_user uuid;
begin
  select p.user_id into target_user
  from public.professionals p
  where p.id = new.professional_id;

  if target_user is not null then
    insert into public.notifications (user_id, type, title, body, unread)
    values (
      target_user,
      'booking',
      'New Booking Request',
      'You have received a new booking request.',
      true
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."notify_booking_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_offer_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  target_user uuid;
begin
  select sr.created_by into target_user
  from public.service_requests sr
  where sr.id = new.request_id;

  if target_user is not null and target_user <> new.user_id then
    insert into public.notifications (user_id, type, title, body, unread)
    values (
      target_user,
      'general',
      'New Offer',
      'Someone sent an offer of ₦' || to_char(new.amount, 'FM999,999,999,990') || ' on your service request.',
      true
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."notify_offer_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_duplicate_booking_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare existing_booking public.bookings; professional_user uuid;
begin
  select b.* into existing_booking from public.bookings b
  where b.customer_id=new.customer_id and b.professional_id=new.professional_id
    and lower(coalesce(b.title,''))=lower(coalesce(new.title,''))
    and coalesce(b.amount,0)=coalesce(new.amount,0)
    and lower(coalesce(b.location,''))=lower(coalesce(new.location,''))
    and lower(coalesce(b.status,'pending')) in ('pending','accepted')
  order by b.created_at desc limit 1;
  if existing_booking.id is not null then return existing_booking; end if;

  select p.user_id into professional_user from public.professionals p where p.id=new.professional_id;
  if professional_user is not null and exists (
    select 1 from public.conversations c
    where ((c.participant_a=new.customer_id and c.participant_b=professional_user)
       or (c.participant_b=new.customer_id and c.participant_a=professional_user))
      and (exists(select 1 from public.bookings b where b.id=c.booking_id and lower(coalesce(b.status,'pending'))='accepted')
       or exists(select 1 from public.service_request_offers o where o.id=c.offer_id and lower(coalesce(o.status,'pending'))='accepted'))
  ) then new.status:='accepted'; end if;
  return new;
end; $$;


ALTER FUNCTION "public"."prevent_duplicate_booking_order"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_non_admin_profile_privilege_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_admin() then
    if new.is_suspended is distinct from old.is_suspended then
      raise exception 'Only admins can suspend or unsuspend users';
    end if;

    if new.role is distinct from old.role then
      raise exception 'Only admins can change user roles';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."prevent_non_admin_profile_privilege_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_promotion_booking_metrics"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_promotion_id uuid;
begin
  v_promotion_id := new.promotion_id;
  if tg_op = 'UPDATE' and v_promotion_id is null then
    v_promotion_id := old.promotion_id;
  end if;

  if v_promotion_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if lower(coalesce(new.status, '')) in ('pending', 'accepted') then
      insert into public.service_promotion_analytics (promotion_id, metric_date, booking_requests)
      values (v_promotion_id, current_date, 1)
      on conflict (promotion_id, metric_date)
      do update set booking_requests = public.service_promotion_analytics.booking_requests + 1,
                    updated_at = now();
    end if;

    if lower(coalesce(new.status, '')) = 'accepted' then
      insert into public.service_promotion_analytics (promotion_id, metric_date, bookings)
      values (v_promotion_id, current_date, 1)
      on conflict (promotion_id, metric_date)
      do update set bookings = public.service_promotion_analytics.bookings + 1,
                    updated_at = now();
    end if;
  elsif tg_op = 'UPDATE'
    and lower(coalesce(old.status, '')) <> 'accepted'
    and lower(coalesce(new.status, '')) = 'accepted' then
    insert into public.service_promotion_analytics (promotion_id, metric_date, bookings)
    values (v_promotion_id, current_date, 1)
    on conflict (promotion_id, metric_date)
    do update set bookings = public.service_promotion_analytics.bookings + 1,
                  updated_at = now();
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."record_promotion_booking_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_notification_push"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
declare
  token text;
  payload jsonb;
begin
  select p.expo_push_token into token
  from public.profiles p
  where p.id = new.user_id
    and p.expo_push_token is not null
    and length(trim(p.expo_push_token)) > 0
  limit 1;

  if token is null then
    return new;
  end if;

  payload := jsonb_build_object(
    'to', token,
    'title', coalesce(new.title, 'Doovly'),
    'body', coalesce(new.body, ''),
    'sound', 'default',
    'data', coalesce(new.data, jsonb_build_object('notificationId', new.id::text)),
    'priority', 'high'
  );

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := payload
  );

  return new;
exception when others then
  raise warning '[push notification] %', sqlerrm;
  return new;
end;
$$;


ALTER FUNCTION "public"."send_notification_push"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_service_request_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_request_id uuid;
begin
  v_request_id := coalesce(NEW.request_id, OLD.request_id);

  update public.service_requests
  set likes_count = (
    select count(*)::integer
    from public.service_request_likes
    where request_id = v_request_id
  )
  where id = v_request_id;

  return coalesce(NEW, OLD);
end;
$$;


ALTER FUNCTION "public"."sync_service_request_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_service_promotion_event"("p_service_id" "uuid", "p_metric" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_promotion_id uuid;
  v_event_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_metric not in ('impressions', 'service_views') then
    raise exception 'Unsupported promotion metric';
  end if;

  select sp.id into v_promotion_id
  from public.service_promotions sp
  where sp.service_id = p_service_id
    and sp.user_id <> auth.uid()
    and sp.status = 'active'
    and sp.starts_at <= now()
    and sp.ends_at > now()
  order by sp.ends_at desc
  limit 1;

  if v_promotion_id is null then
    return;
  end if;

  insert into public.service_promotion_events (promotion_id, viewer_id, metric_date, metric_type)
  values (v_promotion_id, auth.uid(), current_date, p_metric)
  on conflict (promotion_id, viewer_id, metric_date, metric_type) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return;
  end if;

  insert into public.service_promotion_analytics (promotion_id, metric_date)
  values (v_promotion_id, current_date)
  on conflict (promotion_id, metric_date) do nothing;

  execute format(
    'update public.service_promotion_analytics set %I = %I + 1, updated_at = now() where promotion_id = $1 and metric_date = current_date',
    p_metric, p_metric
  ) using v_promotion_id;
end;
$_$;


ALTER FUNCTION "public"."track_service_promotion_event"("p_service_id" "uuid", "p_metric" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mock_id" "text",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "channels" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "sent_to" "text" DEFAULT 'all'::"text" NOT NULL,
    "sent_to_label" "text" DEFAULT 'All Users'::"text" NOT NULL,
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "link" "text",
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "admin_notifications_sent_to_check" CHECK (("sent_to" = ANY (ARRAY['all'::"text", 'verified'::"text", 'subscribed'::"text", 'free'::"text"]))),
    CONSTRAINT "admin_notifications_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'scheduled'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."admin_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mock_id" "text",
    "customer_id" "uuid" NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "service_name" "text",
    "professional_name" "text",
    "customer_name" "text",
    "professional_verified" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "amount" numeric(12,2),
    "location" "text",
    "address" "text",
    "notes" "text",
    "display_date" "text",
    "scheduled_at" timestamp with time zone,
    "rating" numeric(3,2),
    "reviews_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_offer_id" "uuid",
    "service_id" "uuid",
    "promotion_id" "uuid",
    CONSTRAINT "bookings_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_credits" (
    "user_id" "uuid" NOT NULL,
    "remaining" integer DEFAULT 15 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "period_started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chat_credits_remaining_check" CHECK (("remaining" >= 0))
);


ALTER TABLE "public"."chat_credits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cities" (
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."cities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_reads" (
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "unread_count" integer DEFAULT 0 NOT NULL,
    "last_read_at" timestamp with time zone
);


ALTER TABLE "public"."conversation_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mock_id" "text",
    "participant_a" "uuid" NOT NULL,
    "participant_b" "uuid" NOT NULL,
    "booking_id" "uuid",
    "service_request_id" "uuid",
    "last_message" "text" DEFAULT ''::"text" NOT NULL,
    "last_message_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "offer_id" "uuid",
    "text_allowed" boolean DEFAULT false NOT NULL,
    "text_allowed_by" "uuid",
    "text_allowed_at" timestamp with time zone,
    "blocked_by" "uuid",
    "blocked_at" timestamp with time zone,
    CONSTRAINT "conversations_distinct_participants" CHECK (("participant_a" <> "participant_b"))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mock_id" "text",
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "text" "text" DEFAULT ''::"text" NOT NULL,
    "kind" "text" DEFAULT 'text'::"text" NOT NULL,
    "location_label" "text",
    "latitude" double precision,
    "longitude" double precision,
    "card" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "image_url" "text",
    CONSTRAINT "messages_kind_check" CHECK (("kind" = ANY (ARRAY['text'::"text", 'image'::"text", 'location'::"text", 'location_stopped'::"text", 'request_card'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mock_id" "text",
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "unread" boolean DEFAULT true NOT NULL,
    "avatar_url" "text",
    "time_label" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "request_id" "uuid",
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['booking'::"text", 'upcoming'::"text", 'message'::"text", 'payment'::"text", 'verification'::"text", 'review'::"text", 'general'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."password_reset_rate_limits" (
    "email_hash" "text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "window_started_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."password_reset_rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portfolio_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "mock_id" "text",
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "image_key" "text",
    "image_url" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."portfolio_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professional_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mock_id" "text",
    "professional_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "plan_id" "uuid",
    "plan_code" "text" DEFAULT 'free'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "status_label" "text",
    "start_date" "date",
    "end_date" "date",
    "revenuecat_app_user_id" "text",
    "store_product_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "professional_subscriptions_plan_code_check" CHECK (("plan_code" = ANY (ARRAY['free'::"text", 'pro'::"text"]))),
    CONSTRAINT "professional_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."professional_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professionals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mock_id" "text",
    "user_id" "uuid" NOT NULL,
    "profession" "text" DEFAULT 'Other'::"text" NOT NULL,
    "bio" "text",
    "city" "text" NOT NULL,
    "price_from" "text" NOT NULL,
    "price_from_value" numeric(12,2),
    "is_verified" boolean DEFAULT false NOT NULL,
    "is_available" boolean DEFAULT true NOT NULL,
    "subscribed" boolean DEFAULT false NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "rating" numeric(3,2) DEFAULT 0,
    "review_count" integer DEFAULT 0 NOT NULL,
    "avatar_url" "text",
    "avatar_key" "text",
    "email" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."professionals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "mock_id" "text",
    "full_name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "avatar_url" "text",
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "city" "text",
    "is_suspended" boolean DEFAULT false NOT NULL,
    "is_online" boolean DEFAULT false NOT NULL,
    "last_active_at" timestamp with time zone,
    "last_active_label" "text",
    "member_since" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expo_push_token" "text",
    "profession" "text" DEFAULT 'Other'::"text" NOT NULL,
    "pro_trial_started_at" timestamp with time zone,
    "pro_trial_ends_at" timestamp with time zone,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text", 'professional'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promotion_packages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "duration_days" integer NOT NULL,
    "product_id" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "promotion_packages_duration_days_check" CHECK (("duration_days" > 0))
);


ALTER TABLE "public"."promotion_packages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "mock_id" "text",
    "user_name" "text" NOT NULL,
    "comment" "text" NOT NULL,
    "display_date" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_providers" (
    "user_id" "uuid" NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."saved_providers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mock_id" "text",
    "name" "text" NOT NULL,
    "icon" "text" DEFAULT 'briefcase-outline'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."service_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_promotion_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promotion_id" "uuid" NOT NULL,
    "metric_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "impressions" integer DEFAULT 0 NOT NULL,
    "service_views" integer DEFAULT 0 NOT NULL,
    "booking_requests" integer DEFAULT 0 NOT NULL,
    "bookings" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."service_promotion_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_promotion_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promotion_id" "uuid" NOT NULL,
    "viewer_id" "uuid" NOT NULL,
    "metric_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "metric_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "service_promotion_events_metric_type_check" CHECK (("metric_type" = ANY (ARRAY['impressions'::"text", 'service_views'::"text"])))
);


ALTER TABLE "public"."service_promotion_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_promotions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_id" "uuid" NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "package_id" "uuid" NOT NULL,
    "product_id" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "amount" numeric(12,2),
    "currency" "text" DEFAULT 'NGN'::"text",
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "revenuecat_app_user_id" "text",
    "transaction_id" "text",
    "revenuecat_event_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "end_notified_at" timestamp with time zone,
    CONSTRAINT "service_promotions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'expired'::"text", 'cancelled'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."service_promotions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_request_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mock_id" "text",
    "request_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "user_name" "text" NOT NULL,
    "user_avatar_url" "text",
    "text" "text" NOT NULL,
    "time_ago" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."service_request_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_request_likes" (
    "request_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."service_request_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_request_offers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mock_id" "text",
    "request_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "professional_id" "uuid",
    "amount" numeric(12,2),
    "message" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "service_request_offers_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text", 'withdrawn'::"text"])))
);


ALTER TABLE "public"."service_request_offers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mock_id" "text",
    "title" "text" NOT NULL,
    "category" "text" NOT NULL,
    "profession" "text" NOT NULL,
    "location" "text" NOT NULL,
    "city" "text" NOT NULL,
    "price" "text",
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "icon" "text" DEFAULT 'briefcase-outline'::"text" NOT NULL,
    "icon_background" "text" DEFAULT '#E8F5E9'::"text",
    "images" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "image_keys" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "time_ago" "text",
    "is_new" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "poster_name" "text" NOT NULL,
    "poster_avatar_url" "text",
    "poster_verified" boolean DEFAULT false NOT NULL,
    "likes_count" integer DEFAULT 0 NOT NULL,
    "max_offers" integer DEFAULT 5 NOT NULL,
    "offers_count" integer DEFAULT 0 NOT NULL,
    "offered_by" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."service_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "mock_id" "text",
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "price" "text" NOT NULL,
    "price_value" numeric(12,2) DEFAULT 0 NOT NULL,
    "icon" "text" DEFAULT 'briefcase-outline'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plan_features" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mock_id" "text",
    "plan_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "code" "text" NOT NULL
);


ALTER TABLE "public"."subscription_plan_features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plan_meta" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promo_title" "text" DEFAULT ''::"text" NOT NULL,
    "promo_subtitle" "text" DEFAULT ''::"text" NOT NULL,
    "yearly_save_percent" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscription_plan_meta" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mock_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "tagline" "text" DEFAULT ''::"text" NOT NULL,
    "monthly_price" numeric(12,2) DEFAULT 0 NOT NULL,
    "yearly_price" numeric(12,2) DEFAULT 0 NOT NULL,
    "popular" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "code" "text" NOT NULL
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_professionals_app" WITH ("security_invoker"='true') AS
 SELECT "p"."id",
    "p"."mock_id",
    COALESCE("pr"."full_name", ''::"text") AS "name",
    "p"."profession",
    "p"."city",
    "p"."price_from" AS "priceFrom",
    "p"."avatar_url" AS "image_url",
    "p"."is_verified" AS "verified",
    "p"."subscribed",
    "p"."latitude",
    "p"."longitude",
    "pr"."role",
    COALESCE("p"."email", "pr"."email") AS "email",
    COALESCE("p"."phone", "pr"."phone") AS "phone",
    "p"."bio",
    "p"."rating",
    "p"."review_count",
    "p"."user_id",
    "p"."is_available",
    "p"."created_at",
    "p"."updated_at"
   FROM ("public"."professionals" "p"
     JOIN "public"."profiles" "pr" ON (("pr"."id" = "p"."user_id")));


ALTER VIEW "public"."v_professionals_app" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."verification_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mock_id" "text",
    "professional_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "submitted_on" "date",
    "email" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "submitted_at" timestamp with time zone,
    "admin_notified_at" timestamp with time zone,
    CONSTRAINT "verification_applications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."verification_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."verification_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mock_id" "text",
    "application_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "doc_type" "text" DEFAULT 'other'::"text" NOT NULL,
    "uploaded" boolean DEFAULT false NOT NULL,
    "preview_key" "text",
    "file_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "verification_documents_doc_type_check" CHECK (("doc_type" = ANY (ARRAY['pdf'::"text", 'image'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."verification_documents" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_notifications"
    ADD CONSTRAINT "admin_notifications_mock_id_key" UNIQUE ("mock_id");



ALTER TABLE ONLY "public"."admin_notifications"
    ADD CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_credits"
    ADD CONSTRAINT "chat_credits_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_pkey" PRIMARY KEY ("name");



ALTER TABLE ONLY "public"."conversation_reads"
    ADD CONSTRAINT "conversation_reads_pkey" PRIMARY KEY ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_mock_id_key" UNIQUE ("mock_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_reset_rate_limits"
    ADD CONSTRAINT "password_reset_rate_limits_pkey" PRIMARY KEY ("email_hash");



ALTER TABLE ONLY "public"."portfolio_items"
    ADD CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."professional_subscriptions"
    ADD CONSTRAINT "professional_subscriptions_mock_id_key" UNIQUE ("mock_id");



ALTER TABLE ONLY "public"."professional_subscriptions"
    ADD CONSTRAINT "professional_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."professionals"
    ADD CONSTRAINT "professionals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."professionals"
    ADD CONSTRAINT "professionals_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promotion_packages"
    ADD CONSTRAINT "promotion_packages_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."promotion_packages"
    ADD CONSTRAINT "promotion_packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promotion_packages"
    ADD CONSTRAINT "promotion_packages_product_id_key" UNIQUE ("product_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_providers"
    ADD CONSTRAINT "saved_providers_pkey" PRIMARY KEY ("user_id", "professional_id");



ALTER TABLE ONLY "public"."service_categories"
    ADD CONSTRAINT "service_categories_mock_id_key" UNIQUE ("mock_id");



ALTER TABLE ONLY "public"."service_categories"
    ADD CONSTRAINT "service_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."service_categories"
    ADD CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_promotion_analytics"
    ADD CONSTRAINT "service_promotion_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_promotion_analytics"
    ADD CONSTRAINT "service_promotion_analytics_promotion_id_metric_date_key" UNIQUE ("promotion_id", "metric_date");



ALTER TABLE ONLY "public"."service_promotion_events"
    ADD CONSTRAINT "service_promotion_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_promotion_events"
    ADD CONSTRAINT "service_promotion_events_promotion_id_viewer_id_metric_date_key" UNIQUE ("promotion_id", "viewer_id", "metric_date", "metric_type");



ALTER TABLE ONLY "public"."service_promotions"
    ADD CONSTRAINT "service_promotions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_request_comments"
    ADD CONSTRAINT "service_request_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_request_likes"
    ADD CONSTRAINT "service_request_likes_pkey" PRIMARY KEY ("request_id", "user_id");



ALTER TABLE ONLY "public"."service_request_offers"
    ADD CONSTRAINT "service_request_offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plan_features"
    ADD CONSTRAINT "subscription_plan_features_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plan_meta"
    ADD CONSTRAINT "subscription_plan_meta_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_mock_id_key" UNIQUE ("mock_id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."verification_applications"
    ADD CONSTRAINT "verification_applications_mock_id_key" UNIQUE ("mock_id");



ALTER TABLE ONLY "public"."verification_applications"
    ADD CONSTRAINT "verification_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."verification_documents"
    ADD CONSTRAINT "verification_documents_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "bookings_active_duplicate_unique" ON "public"."bookings" USING "btree" ("customer_id", "professional_id", "lower"(COALESCE("title", ''::"text")), COALESCE("amount", (0)::numeric), "lower"(COALESCE("location", ''::"text"))) WHERE ("lower"(COALESCE("status", 'pending'::"text")) = ANY (ARRAY['pending'::"text", 'accepted'::"text"]));



CREATE UNIQUE INDEX "bookings_mock_id_key" ON "public"."bookings" USING "btree" ("mock_id") WHERE ("mock_id" IS NOT NULL);



CREATE UNIQUE INDEX "bookings_source_offer_id_unique" ON "public"."bookings" USING "btree" ("source_offer_id") WHERE ("source_offer_id" IS NOT NULL);



CREATE INDEX "conversations_blocked_by_idx" ON "public"."conversations" USING "btree" ("blocked_by");



CREATE UNIQUE INDEX "conversations_booking_id_unique" ON "public"."conversations" USING "btree" ("booking_id") WHERE ("booking_id" IS NOT NULL);



CREATE INDEX "conversations_offer_id_idx" ON "public"."conversations" USING "btree" ("offer_id");



CREATE UNIQUE INDEX "conversations_offer_id_unique" ON "public"."conversations" USING "btree" ("offer_id") WHERE ("offer_id" IS NOT NULL);



CREATE UNIQUE INDEX "conversations_one_thread_per_pair" ON "public"."conversations" USING "btree" (LEAST("participant_a", "participant_b"), GREATEST("participant_a", "participant_b"));



CREATE INDEX "conversations_text_allowed_idx" ON "public"."conversations" USING "btree" ("text_allowed");



CREATE INDEX "idx_admin_notifications_created_by" ON "public"."admin_notifications" USING "btree" ("created_by");



CREATE INDEX "idx_bookings_customer" ON "public"."bookings" USING "btree" ("customer_id");



CREATE INDEX "idx_bookings_professional" ON "public"."bookings" USING "btree" ("professional_id");



CREATE INDEX "idx_bookings_promotion_id" ON "public"."bookings" USING "btree" ("promotion_id");



CREATE INDEX "idx_bookings_status" ON "public"."bookings" USING "btree" ("status");



CREATE INDEX "idx_conversation_reads_user_id" ON "public"."conversation_reads" USING "btree" ("user_id");



CREATE INDEX "idx_conversations_a" ON "public"."conversations" USING "btree" ("participant_a");



CREATE INDEX "idx_conversations_b" ON "public"."conversations" USING "btree" ("participant_b");



CREATE INDEX "idx_conversations_booking_id" ON "public"."conversations" USING "btree" ("booking_id");



CREATE INDEX "idx_conversations_service_request_id" ON "public"."conversations" USING "btree" ("service_request_id");



CREATE INDEX "idx_messages_conversation" ON "public"."messages" USING "btree" ("conversation_id", "created_at");



CREATE UNIQUE INDEX "idx_messages_mock" ON "public"."messages" USING "btree" ("conversation_id", "mock_id") WHERE ("mock_id" IS NOT NULL);



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("user_id", "unread");



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_plan_features_mock" ON "public"."subscription_plan_features" USING "btree" ("plan_id", "mock_id") WHERE ("mock_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_portfolio_mock" ON "public"."portfolio_items" USING "btree" ("professional_id", "mock_id") WHERE ("mock_id" IS NOT NULL);



CREATE INDEX "idx_portfolio_professional" ON "public"."portfolio_items" USING "btree" ("professional_id");



CREATE INDEX "idx_pro_subs_professional" ON "public"."professional_subscriptions" USING "btree" ("professional_id");



CREATE INDEX "idx_professional_subscriptions_plan_id" ON "public"."professional_subscriptions" USING "btree" ("plan_id");



CREATE INDEX "idx_professional_subscriptions_user_id" ON "public"."professional_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_professionals_available" ON "public"."professionals" USING "btree" ("is_available");



CREATE INDEX "idx_professionals_city" ON "public"."professionals" USING "btree" ("city");



CREATE UNIQUE INDEX "idx_reviews_mock" ON "public"."reviews" USING "btree" ("professional_id", "mock_id") WHERE ("mock_id" IS NOT NULL);



CREATE INDEX "idx_reviews_professional" ON "public"."reviews" USING "btree" ("professional_id");



CREATE INDEX "idx_reviews_user_id" ON "public"."reviews" USING "btree" ("user_id");



CREATE INDEX "idx_saved_providers_professional_id" ON "public"."saved_providers" USING "btree" ("professional_id");



CREATE INDEX "idx_service_promotions_due_to_end" ON "public"."service_promotions" USING "btree" ("status", "ends_at") WHERE ("status" = ANY (ARRAY['active'::"text", 'ended'::"text"]));



CREATE INDEX "idx_service_promotions_package" ON "public"."service_promotions" USING "btree" ("package_id");



CREATE INDEX "idx_service_request_comments_user_id" ON "public"."service_request_comments" USING "btree" ("user_id");



CREATE INDEX "idx_service_request_likes_user_id" ON "public"."service_request_likes" USING "btree" ("user_id");



CREATE INDEX "idx_service_request_offers_professional_id" ON "public"."service_request_offers" USING "btree" ("professional_id");



CREATE INDEX "idx_service_request_offers_request_user" ON "public"."service_request_offers" USING "btree" ("request_id", "user_id");



CREATE INDEX "idx_service_request_offers_user_id" ON "public"."service_request_offers" USING "btree" ("user_id");



CREATE INDEX "idx_service_requests_city" ON "public"."service_requests" USING "btree" ("city");



CREATE INDEX "idx_service_requests_created_by" ON "public"."service_requests" USING "btree" ("created_by");



CREATE UNIQUE INDEX "idx_services_mock" ON "public"."services" USING "btree" ("professional_id", "mock_id") WHERE ("mock_id" IS NOT NULL);



CREATE INDEX "idx_services_professional" ON "public"."services" USING "btree" ("professional_id");



CREATE INDEX "idx_sr_comments_request" ON "public"."service_request_comments" USING "btree" ("request_id");



CREATE UNIQUE INDEX "idx_sr_offers_mock" ON "public"."service_request_offers" USING "btree" ("request_id", "mock_id") WHERE ("mock_id" IS NOT NULL);



CREATE INDEX "idx_sr_offers_request" ON "public"."service_request_offers" USING "btree" ("request_id");



CREATE INDEX "idx_verification_applications_user_id" ON "public"."verification_applications" USING "btree" ("user_id");



CREATE INDEX "idx_verification_apps_pro" ON "public"."verification_applications" USING "btree" ("professional_id");



CREATE INDEX "idx_verification_apps_status_created" ON "public"."verification_applications" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_verification_docs_application_title" ON "public"."verification_documents" USING "btree" ("application_id", "title");



CREATE UNIQUE INDEX "idx_verification_docs_mock" ON "public"."verification_documents" USING "btree" ("application_id", "mock_id") WHERE ("mock_id" IS NOT NULL);



CREATE UNIQUE INDEX "notifications_mock_id_key" ON "public"."notifications" USING "btree" ("mock_id") WHERE ("mock_id" IS NOT NULL);



CREATE UNIQUE INDEX "professionals_mock_id_key" ON "public"."professionals" USING "btree" ("mock_id") WHERE ("mock_id" IS NOT NULL);



CREATE UNIQUE INDEX "profiles_email_key" ON "public"."profiles" USING "btree" ("email") WHERE ("email" IS NOT NULL);



CREATE INDEX "profiles_expo_push_token_idx" ON "public"."profiles" USING "btree" ("expo_push_token") WHERE ("expo_push_token" IS NOT NULL);



CREATE UNIQUE INDEX "profiles_mock_id_key" ON "public"."profiles" USING "btree" ("mock_id") WHERE ("mock_id" IS NOT NULL);



CREATE INDEX "service_promotion_analytics_promotion_id_idx" ON "public"."service_promotion_analytics" USING "btree" ("promotion_id");



CREATE INDEX "service_promotions_professional_id_idx" ON "public"."service_promotions" USING "btree" ("professional_id");



CREATE INDEX "service_promotions_service_id_idx" ON "public"."service_promotions" USING "btree" ("service_id");



CREATE INDEX "service_promotions_status_dates_idx" ON "public"."service_promotions" USING "btree" ("status", "starts_at", "ends_at");



CREATE INDEX "service_promotions_user_id_idx" ON "public"."service_promotions" USING "btree" ("user_id");



CREATE UNIQUE INDEX "service_request_likes_request_user_unique" ON "public"."service_request_likes" USING "btree" ("request_id", "user_id");



CREATE UNIQUE INDEX "service_request_offers_request_user_unique" ON "public"."service_request_offers" USING "btree" ("request_id", "user_id");



CREATE UNIQUE INDEX "service_requests_mock_id_key" ON "public"."service_requests" USING "btree" ("mock_id") WHERE ("mock_id" IS NOT NULL);



CREATE UNIQUE INDEX "subscription_plan_features_plan_code_key" ON "public"."subscription_plan_features" USING "btree" ("plan_id", "code");



CREATE UNIQUE INDEX "subscription_plans_code_key" ON "public"."subscription_plans" USING "btree" ("code");



CREATE OR REPLACE TRIGGER "bookings_attribute_promotion" BEFORE INSERT ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."attribute_booking_to_promotion"();



CREATE OR REPLACE TRIGGER "bookings_record_promotion_insert_metrics" AFTER INSERT ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."record_promotion_booking_metrics"();



CREATE OR REPLACE TRIGGER "bookings_record_promotion_update_metrics" AFTER UPDATE OF "status" ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."record_promotion_booking_metrics"();



CREATE OR REPLACE TRIGGER "bookings_updated_at" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "guard_profile_control_fields" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profile_control_fields"();



CREATE OR REPLACE TRIGGER "notifications_send_push" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."send_notification_push"();



CREATE OR REPLACE TRIGGER "professional_subscriptions_updated_at" BEFORE UPDATE ON "public"."professional_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "professionals_updated_at" BEFORE UPDATE ON "public"."professionals" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "protect_profile_admin_fields" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_non_admin_profile_privilege_changes"();



CREATE OR REPLACE TRIGGER "subscription_plan_meta_updated_at" BEFORE UPDATE ON "public"."subscription_plan_meta" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "subscription_plans_updated_at" BEFORE UPDATE ON "public"."subscription_plans" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_create_booking_conversation" AFTER INSERT ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."create_booking_conversation"();



CREATE OR REPLACE TRIGGER "trg_create_offer_conversation" AFTER INSERT ON "public"."service_request_offers" FOR EACH ROW EXECUTE FUNCTION "public"."create_offer_conversation"();



CREATE OR REPLACE TRIGGER "trg_enforce_chat_message_rules" BEFORE INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_chat_message_rules"();



CREATE OR REPLACE TRIGGER "trg_notify_booking_created" AFTER INSERT ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."notify_booking_created"();



CREATE OR REPLACE TRIGGER "trg_notify_offer_created" AFTER INSERT ON "public"."service_request_offers" FOR EACH ROW EXECUTE FUNCTION "public"."notify_offer_created"();



CREATE OR REPLACE TRIGGER "trg_prevent_duplicate_booking_order" BEFORE INSERT ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_duplicate_booking_order"();



CREATE OR REPLACE TRIGGER "trg_sync_service_request_likes_count" AFTER INSERT OR DELETE ON "public"."service_request_likes" FOR EACH ROW EXECUTE FUNCTION "public"."sync_service_request_likes_count"();



CREATE OR REPLACE TRIGGER "verification_applications_updated_at" BEFORE UPDATE ON "public"."verification_applications" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."admin_notifications"
    ADD CONSTRAINT "admin_notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "public"."service_promotions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_source_offer_id_fkey" FOREIGN KEY ("source_offer_id") REFERENCES "public"."service_request_offers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_credits"
    ADD CONSTRAINT "chat_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_reads"
    ADD CONSTRAINT "conversation_reads_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_reads"
    ADD CONSTRAINT "conversation_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_blocked_by_fkey" FOREIGN KEY ("blocked_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."service_request_offers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_participant_a_fkey" FOREIGN KEY ("participant_a") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_participant_b_fkey" FOREIGN KEY ("participant_b") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portfolio_items"
    ADD CONSTRAINT "portfolio_items_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professional_subscriptions"
    ADD CONSTRAINT "professional_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."professional_subscriptions"
    ADD CONSTRAINT "professional_subscriptions_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professional_subscriptions"
    ADD CONSTRAINT "professional_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professionals"
    ADD CONSTRAINT "professionals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."saved_providers"
    ADD CONSTRAINT "saved_providers_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_providers"
    ADD CONSTRAINT "saved_providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_promotion_analytics"
    ADD CONSTRAINT "service_promotion_analytics_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "public"."service_promotions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_promotion_events"
    ADD CONSTRAINT "service_promotion_events_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "public"."service_promotions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_promotion_events"
    ADD CONSTRAINT "service_promotion_events_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_promotions"
    ADD CONSTRAINT "service_promotions_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."promotion_packages"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."service_promotions"
    ADD CONSTRAINT "service_promotions_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_promotions"
    ADD CONSTRAINT "service_promotions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_promotions"
    ADD CONSTRAINT "service_promotions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_request_comments"
    ADD CONSTRAINT "service_request_comments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_request_comments"
    ADD CONSTRAINT "service_request_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."service_request_likes"
    ADD CONSTRAINT "service_request_likes_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_request_likes"
    ADD CONSTRAINT "service_request_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_request_offers"
    ADD CONSTRAINT "service_request_offers_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."service_request_offers"
    ADD CONSTRAINT "service_request_offers_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_request_offers"
    ADD CONSTRAINT "service_request_offers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_plan_features"
    ADD CONSTRAINT "subscription_plan_features_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."verification_applications"
    ADD CONSTRAINT "verification_applications_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."verification_applications"
    ADD CONSTRAINT "verification_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."verification_documents"
    ADD CONSTRAINT "verification_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."verification_applications"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can create user notifications" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can delete plan features" ON "public"."subscription_plan_features" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can insert plan features" ON "public"."subscription_plan_features" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert plan meta" ON "public"."subscription_plan_meta" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."is_admin"() AS "is_admin"));



CREATE POLICY "Admins can insert subscription plans" ON "public"."subscription_plans" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."is_admin"() AS "is_admin"));



CREATE POLICY "Admins can manage professional subscriptions" ON "public"."professional_subscriptions" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can send broadcasts" ON "public"."admin_notifications" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update plan features" ON "public"."subscription_plan_features" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update plan meta" ON "public"."subscription_plan_meta" FOR UPDATE TO "authenticated" USING (( SELECT "public"."is_admin"() AS "is_admin")) WITH CHECK (( SELECT "public"."is_admin"() AS "is_admin"));



CREATE POLICY "Admins can update plans" ON "public"."subscription_plans" FOR UPDATE TO "authenticated" USING (( SELECT "public"."is_admin"() AS "is_admin")) WITH CHECK (( SELECT "public"."is_admin"() AS "is_admin"));



CREATE POLICY "Admins can update professionals" ON "public"."professionals" FOR UPDATE TO "authenticated" USING (( SELECT "public"."is_admin"() AS "is_admin")) WITH CHECK (( SELECT "public"."is_admin"() AS "is_admin"));



CREATE POLICY "Admins can update profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update verification" ON "public"."verification_applications" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins can view broadcast history" ON "public"."admin_notifications" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Authenticated can insert comments" ON "public"."service_request_comments" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated can insert reviews" ON "public"."reviews" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated can insert service requests" ON "public"."service_requests" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can view active promotion packages" ON "public"."promotion_packages" FOR SELECT TO "authenticated" USING (("active" = true));



CREATE POLICY "Involved users can view offers" ON "public"."service_request_offers" FOR SELECT USING (("public"."is_admin"() OR (( SELECT "auth"."uid"() AS "uid") = "user_id") OR (( SELECT "auth"."uid"() AS "uid") IN ( SELECT "service_requests"."created_by"
   FROM "public"."service_requests"
  WHERE ("service_requests"."id" = "service_request_offers"."request_id")))));



CREATE POLICY "Owners can delete service requests" ON "public"."service_requests" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid") = "created_by") OR "public"."is_admin"()));



CREATE POLICY "Owners can update service requests" ON "public"."service_requests" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid") = "created_by") OR "public"."is_admin"()));



CREATE POLICY "Owners may cancel own pending promotions" ON "public"."service_promotions" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text"))) WITH CHECK ((("auth"."uid"() = "user_id") AND ("status" = 'cancelled'::"text")));



CREATE POLICY "Professionals can delete own professional profile" ON "public"."professionals" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Professionals can delete own services" ON "public"."services" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."professionals" "p"
  WHERE (("p"."id" = "services"."professional_id") AND ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Professionals can insert own professional profile" ON "public"."professionals" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Professionals can insert own services" ON "public"."services" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."professionals" "p"
  WHERE (("p"."id" = "services"."professional_id") AND ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Professionals can update own professional profile" ON "public"."professionals" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Professionals can update own services" ON "public"."services" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."professionals" "p"
  WHERE (("p"."id" = "services"."professional_id") AND ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."professionals" "p"
  WHERE (("p"."id" = "services"."professional_id") AND ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Pros can delete own portfolio" ON "public"."portfolio_items" FOR DELETE TO "authenticated" USING (("public"."is_admin"() OR (( SELECT "auth"."uid"() AS "uid") IN ( SELECT "professionals"."user_id"
   FROM "public"."professionals"
  WHERE ("professionals"."id" = "portfolio_items"."professional_id")))));



CREATE POLICY "Pros can insert own portfolio" ON "public"."portfolio_items" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR (( SELECT "auth"."uid"() AS "uid") IN ( SELECT "professionals"."user_id"
   FROM "public"."professionals"
  WHERE ("professionals"."id" = "portfolio_items"."professional_id")))));



CREATE POLICY "Pros can update own portfolio" ON "public"."portfolio_items" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR (( SELECT "auth"."uid"() AS "uid") IN ( SELECT "professionals"."user_id"
   FROM "public"."professionals"
  WHERE ("professionals"."id" = "portfolio_items"."professional_id"))))) WITH CHECK (("public"."is_admin"() OR (( SELECT "auth"."uid"() AS "uid") IN ( SELECT "professionals"."user_id"
   FROM "public"."professionals"
  WHERE ("professionals"."id" = "portfolio_items"."professional_id")))));



CREATE POLICY "Public can view cities" ON "public"."cities" FOR SELECT USING (true);



CREATE POLICY "Public can view likes" ON "public"."service_request_likes" FOR SELECT USING (true);



CREATE POLICY "Public can view plan features" ON "public"."subscription_plan_features" FOR SELECT USING (true);



CREATE POLICY "Public can view plan meta" ON "public"."subscription_plan_meta" FOR SELECT USING (true);



CREATE POLICY "Public can view portfolio" ON "public"."portfolio_items" FOR SELECT USING (true);



CREATE POLICY "Public can view professionals" ON "public"."professionals" FOR SELECT USING (true);



CREATE POLICY "Public can view profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public can view request comments" ON "public"."service_request_comments" FOR SELECT USING (true);



CREATE POLICY "Public can view reviews" ON "public"."reviews" FOR SELECT USING (true);



CREATE POLICY "Public can view service categories" ON "public"."service_categories" FOR SELECT USING (true);



CREATE POLICY "Public can view service requests" ON "public"."service_requests" FOR SELECT USING (true);



CREATE POLICY "Public can view services" ON "public"."services" FOR SELECT USING (true);



CREATE POLICY "Public can view subscription plans" ON "public"."subscription_plans" FOR SELECT USING (true);



CREATE POLICY "Request owners can update offers" ON "public"."service_request_offers" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "service_requests"."created_by"
   FROM "public"."service_requests"
  WHERE ("service_requests"."id" = "service_request_offers"."request_id")))) WITH CHECK (("public"."is_admin"() OR ("auth"."uid"() = "user_id") OR ("auth"."uid"() IN ( SELECT "sr"."created_by"
   FROM "public"."service_requests" "sr"
  WHERE ("sr"."id" = "service_request_offers"."request_id")))));



CREATE POLICY "Users can create bookings" ON "public"."bookings" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "customer_id"));



CREATE POLICY "Users can create own pending promotions" ON "public"."service_promotions" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text") AND (EXISTS ( SELECT 1
   FROM (("public"."services" "s"
     JOIN "public"."professionals" "p" ON (("p"."id" = "s"."professional_id")))
     JOIN "public"."promotion_packages" "pp" ON ((("pp"."id" = "service_promotions"."package_id") AND ("pp"."product_id" = "service_promotions"."product_id") AND ("pp"."active" = true))))
  WHERE (("s"."id" = "service_promotions"."service_id") AND ("p"."id" = "service_promotions"."professional_id") AND ("p"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create verification applications" ON "public"."verification_applications" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."professionals" "p"
  WHERE (("p"."id" = "verification_applications"."professional_id") AND ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can create verification documents" ON "public"."verification_documents" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."verification_applications" "va"
     JOIN "public"."professionals" "p" ON (("p"."id" = "va"."professional_id")))
  WHERE (("va"."id" = "verification_documents"."application_id") AND (("va"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can delete own comments" ON "public"."service_request_comments" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own conversations" ON "public"."conversations" FOR DELETE TO "authenticated" USING (("public"."is_admin"() OR ("auth"."uid"() = "participant_a") OR ("auth"."uid"() = "participant_b")));



CREATE POLICY "Users can delete own notifications" ON "public"."notifications" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert conversations they join" ON "public"."conversations" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "participant_a") OR (( SELECT "auth"."uid"() AS "uid") = "participant_b")));



CREATE POLICY "Users can like as themselves" ON "public"."service_request_likes" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can manage own saved providers" ON "public"."saved_providers" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can send messages in own conversations" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "sender_id") AND (EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND (("c"."participant_a" = ( SELECT "auth"."uid"() AS "uid")) OR ("c"."participant_b" = ( SELECT "auth"."uid"() AS "uid"))) AND (("messages"."kind" <> 'location'::"text") OR (("c"."booking_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."bookings" "b"
          WHERE (("b"."id" = "c"."booking_id") AND ("lower"(COALESCE("b"."status", 'pending'::"text")) = 'accepted'::"text"))))) OR (("c"."offer_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."service_request_offers" "o"
          WHERE (("o"."id" = "c"."offer_id") AND ("lower"(COALESCE("o"."status", 'pending'::"text")) = 'accepted'::"text")))))))))));



CREATE POLICY "Users can submit own offers" ON "public"."service_request_offers" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can unlike themselves" ON "public"."service_request_likes" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own bookings" ON "public"."bookings" FOR UPDATE USING (("public"."is_admin"() OR (( SELECT "auth"."uid"() AS "uid") = "customer_id") OR (( SELECT "auth"."uid"() AS "uid") IN ( SELECT "professionals"."user_id"
   FROM "public"."professionals"
  WHERE ("professionals"."id" = "bookings"."professional_id")))));



CREATE POLICY "Users can update own comments" ON "public"."service_request_comments" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own conversations" ON "public"."conversations" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid") = "participant_a") OR (( SELECT "auth"."uid"() AS "uid") = "participant_b"))) WITH CHECK (("public"."is_admin"() OR ("auth"."uid"() = "participant_a") OR ("auth"."uid"() = "participant_b")));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can update own verification applications" ON "public"."verification_applications" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("status" = ANY (ARRAY['pending'::"text", 'rejected'::"text"])))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("status" = ANY (ARRAY['pending'::"text", 'rejected'::"text"]))));



CREATE POLICY "Users can update verification documents" ON "public"."verification_documents" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."verification_applications" "va"
     JOIN "public"."professionals" "p" ON (("p"."id" = "va"."professional_id")))
  WHERE (("va"."id" = "verification_documents"."application_id") AND (("va"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."verification_applications" "va"
     JOIN "public"."professionals" "p" ON (("p"."id" = "va"."professional_id")))
  WHERE (("va"."id" = "verification_documents"."application_id") AND (("va"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view messages in own conversations" ON "public"."messages" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "messages"."conversation_id") AND (("c"."participant_a" = ( SELECT "auth"."uid"() AS "uid")) OR ("c"."participant_b" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Users can view own bookings" ON "public"."bookings" FOR SELECT USING (("public"."is_admin"() OR (( SELECT "auth"."uid"() AS "uid") = "customer_id") OR (( SELECT "auth"."uid"() AS "uid") IN ( SELECT "professionals"."user_id"
   FROM "public"."professionals"
  WHERE ("professionals"."id" = "bookings"."professional_id")))));



CREATE POLICY "Users can view own chat credits" ON "public"."chat_credits" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own conversations" ON "public"."conversations" FOR SELECT USING (("public"."is_admin"() OR (( SELECT "auth"."uid"() AS "uid") = "participant_a") OR (( SELECT "auth"."uid"() AS "uid") = "participant_b")));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Users can view own or active promotions" ON "public"."service_promotions" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("status" = 'active'::"text") AND ("starts_at" <= "now"()) AND ("ends_at" > "now"()))));



CREATE POLICY "Users can view own promotion analytics" ON "public"."service_promotion_analytics" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."service_promotions" "sp"
  WHERE (("sp"."id" = "service_promotion_analytics"."promotion_id") AND ("sp"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view related verification" ON "public"."verification_applications" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"() OR (( SELECT "auth"."uid"() AS "uid") IN ( SELECT "professionals"."user_id"
   FROM "public"."professionals"
  WHERE ("professionals"."id" = "verification_applications"."professional_id")))));



CREATE POLICY "Users can view related verification docs" ON "public"."verification_documents" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."verification_applications" "va"
     JOIN "public"."professionals" "p" ON (("p"."id" = "va"."professional_id")))
  WHERE (("va"."id" = "verification_documents"."application_id") AND (("va"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Users manage own conversation reads" ON "public"."conversation_reads" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"())) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



ALTER TABLE "public"."admin_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_credits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_reads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."password_reset_rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."portfolio_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."professional_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."professionals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."promotion_packages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_promotion_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_promotion_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_promotions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_request_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_request_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_request_offers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_plan_features" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_plan_meta" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."verification_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."verification_documents" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."allow_conversation_text"("p_conversation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."allow_conversation_text"("p_conversation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."allow_conversation_text"("p_conversation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."allow_conversation_text"("p_conversation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."attribute_booking_to_promotion"() TO "anon";
GRANT ALL ON FUNCTION "public"."attribute_booking_to_promotion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."attribute_booking_to_promotion"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."consume_password_reset_rate_limit"("p_email_hash" "text", "p_limit" integer, "p_window_seconds" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."consume_password_reset_rate_limit"("p_email_hash" "text", "p_limit" integer, "p_window_seconds" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_booking_conversation"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_booking_conversation"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_offer_conversation"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_offer_conversation"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_my_conversation"("p_conversation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_my_conversation"("p_conversation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_my_conversation"("p_conversation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_my_conversation"("p_conversation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_chat_message_rules"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_chat_message_rules"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."finish_expired_service_promotions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finish_expired_service_promotions"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_chat_credits"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_chat_credits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_chat_credits"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."guard_profile_control_fields"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."guard_profile_control_fields"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_conversation_unread"("p_conversation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_conversation_unread"("p_conversation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_conversation_unread"("p_conversation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_conversation_unread"("p_conversation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_chat_pro"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_chat_pro"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_booking_created"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_booking_created"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_offer_created"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_offer_created"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_duplicate_booking_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_duplicate_booking_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_duplicate_booking_order"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_non_admin_profile_privilege_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_non_admin_profile_privilege_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_non_admin_profile_privilege_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."record_promotion_booking_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."record_promotion_booking_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_promotion_booking_metrics"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."send_notification_push"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."send_notification_push"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_service_request_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_service_request_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_service_request_likes_count"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."track_service_promotion_event"("p_service_id" "uuid", "p_metric" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."track_service_promotion_event"("p_service_id" "uuid", "p_metric" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_service_promotion_event"("p_service_id" "uuid", "p_metric" "text") TO "service_role";



GRANT ALL ON TABLE "public"."admin_notifications" TO "anon";
GRANT ALL ON TABLE "public"."admin_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."chat_credits" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."chat_credits" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_credits" TO "service_role";



GRANT ALL ON TABLE "public"."cities" TO "anon";
GRANT ALL ON TABLE "public"."cities" TO "authenticated";
GRANT ALL ON TABLE "public"."cities" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_reads" TO "anon";
GRANT ALL ON TABLE "public"."conversation_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_reads" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."password_reset_rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."portfolio_items" TO "anon";
GRANT ALL ON TABLE "public"."portfolio_items" TO "authenticated";
GRANT ALL ON TABLE "public"."portfolio_items" TO "service_role";



GRANT ALL ON TABLE "public"."professional_subscriptions" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."professional_subscriptions" TO "authenticated";



GRANT ALL ON TABLE "public"."professionals" TO "anon";
GRANT ALL ON TABLE "public"."professionals" TO "authenticated";
GRANT ALL ON TABLE "public"."professionals" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."profiles" TO "anon";



GRANT SELECT("full_name") ON TABLE "public"."profiles" TO "anon";



GRANT SELECT("avatar_url") ON TABLE "public"."profiles" TO "anon";



GRANT SELECT("city") ON TABLE "public"."profiles" TO "anon";



GRANT SELECT("is_online") ON TABLE "public"."profiles" TO "anon";



GRANT SELECT("last_active_label") ON TABLE "public"."profiles" TO "anon";



GRANT SELECT("member_since") ON TABLE "public"."profiles" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."profiles" TO "anon";



GRANT SELECT("profession") ON TABLE "public"."profiles" TO "anon";



GRANT ALL ON TABLE "public"."promotion_packages" TO "anon";
GRANT ALL ON TABLE "public"."promotion_packages" TO "authenticated";
GRANT ALL ON TABLE "public"."promotion_packages" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."saved_providers" TO "anon";
GRANT ALL ON TABLE "public"."saved_providers" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_providers" TO "service_role";



GRANT ALL ON TABLE "public"."service_categories" TO "anon";
GRANT ALL ON TABLE "public"."service_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."service_categories" TO "service_role";



GRANT ALL ON TABLE "public"."service_promotion_analytics" TO "anon";
GRANT ALL ON TABLE "public"."service_promotion_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."service_promotion_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."service_promotion_events" TO "service_role";



GRANT ALL ON TABLE "public"."service_promotions" TO "service_role";
GRANT SELECT ON TABLE "public"."service_promotions" TO "authenticated";



GRANT INSERT("service_id") ON TABLE "public"."service_promotions" TO "authenticated";



GRANT INSERT("professional_id") ON TABLE "public"."service_promotions" TO "authenticated";



GRANT INSERT("user_id") ON TABLE "public"."service_promotions" TO "authenticated";



GRANT INSERT("package_id") ON TABLE "public"."service_promotions" TO "authenticated";



GRANT INSERT("product_id") ON TABLE "public"."service_promotions" TO "authenticated";



GRANT UPDATE("status") ON TABLE "public"."service_promotions" TO "authenticated";



GRANT ALL ON TABLE "public"."service_request_comments" TO "anon";
GRANT ALL ON TABLE "public"."service_request_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."service_request_comments" TO "service_role";



GRANT ALL ON TABLE "public"."service_request_likes" TO "anon";
GRANT ALL ON TABLE "public"."service_request_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."service_request_likes" TO "service_role";



GRANT ALL ON TABLE "public"."service_request_offers" TO "anon";
GRANT ALL ON TABLE "public"."service_request_offers" TO "authenticated";
GRANT ALL ON TABLE "public"."service_request_offers" TO "service_role";



GRANT ALL ON TABLE "public"."service_requests" TO "anon";
GRANT ALL ON TABLE "public"."service_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."service_requests" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plan_features" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plan_features" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plan_features" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plan_meta" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plan_meta" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plan_meta" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."v_professionals_app" TO "anon";
GRANT ALL ON TABLE "public"."v_professionals_app" TO "authenticated";
GRANT ALL ON TABLE "public"."v_professionals_app" TO "service_role";



GRANT ALL ON TABLE "public"."verification_applications" TO "anon";
GRANT ALL ON TABLE "public"."verification_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."verification_applications" TO "service_role";



GRANT ALL ON TABLE "public"."verification_documents" TO "anon";
GRANT ALL ON TABLE "public"."verification_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."verification_documents" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







