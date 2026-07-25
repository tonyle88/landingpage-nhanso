begin;

alter table public.bookings
  add column if not exists idempotency_key uuid,
  add column if not exists request_fingerprint text;

create unique index if not exists bookings_idempotency_key_unique
  on public.bookings (idempotency_key)
  where idempotency_key is not null;

create unique index if not exists bookings_active_slot_unique
  on public.bookings (slot_start)
  where status in ('pending', 'held', 'paid', 'confirmed');

create or replace function public.enforce_booking_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if (old.status = 'pending' and new.status in ('held', 'cancelled', 'expired'))
    or (old.status = 'held' and new.status in ('paid', 'cancelled', 'expired'))
    or (old.status = 'paid' and new.status = 'confirmed')
    or (old.status = 'confirmed' and new.status = 'cancelled')
  then
    return new;
  end if;
  raise exception 'invalid booking status transition: % -> %',
    old.status, new.status using errcode = '22023';
end;
$$;

drop trigger if exists bookings_enforce_status_transition on public.bookings;
create trigger bookings_enforce_status_transition
  before update of status on public.bookings
  for each row execute function public.enforce_booking_status_transition();

create or replace function public.create_booking_reservation(
  p_idempotency_key uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.bookings;
  v_package public.packages;
  v_booking public.bookings;
  v_name text := trim(coalesce(p_payload->>'customer_name', ''));
  v_phone text := regexp_replace(coalesce(p_payload->>'phone', ''), '[^0-9+]', '', 'g');
  v_email text := lower(trim(coalesce(p_payload->>'email', '')));
  v_consultation text := lower(trim(coalesce(p_payload->>'consultation_type', '')));
  v_package_code text := lower(trim(coalesce(p_payload->>'package_code', '')));
  v_concern text := trim(coalesce(p_payload->>'concern', ''));
  v_slot_start timestamptz := nullif(p_payload->>'slot_start', '')::timestamptz;
  v_slot_end timestamptz := nullif(p_payload->>'slot_end', '')::timestamptz;
  v_dob date := nullif(p_payload->>'date_of_birth', '')::date;
  v_provider text := lower(trim(coalesce(p_payload->>'payment_provider', 'manual_qr')));
  v_amount bigint;
  v_fingerprint text;
begin
  if p_idempotency_key is null then
    raise exception 'idempotency key is required' using errcode = '22023';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'invalid customer name' using errcode = '22023';
  end if;
  if v_phone !~ '^\+?[0-9]{9,15}$' then
    raise exception 'invalid phone' using errcode = '22023';
  end if;
  if char_length(v_email) > 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  if v_consultation not in ('online', 'offline') then
    raise exception 'invalid consultation type' using errcode = '22023';
  end if;
  if char_length(v_concern) > 2000 then
    raise exception 'concern is too long' using errcode = '22023';
  end if;
  if v_dob is not null and (v_dob < date '1900-01-01' or v_dob > current_date) then
    raise exception 'invalid date of birth' using errcode = '22023';
  end if;
  if v_slot_start is null
    or v_slot_end is null
    or v_slot_start < now() + interval '5 minutes'
    or v_slot_start > now() + interval '180 days'
    or v_slot_end <= v_slot_start
    or v_slot_end > v_slot_start + interval '4 hours'
  then
    raise exception 'invalid booking slot' using errcode = '22023';
  end if;
  if v_provider not in ('sepay', 'manual_qr') then
    raise exception 'invalid payment provider' using errcode = '22023';
  end if;

  select * into v_package
  from public.packages
  where code = v_package_code and enabled;
  if not found then
    raise exception 'package not available' using errcode = '22023';
  end if;
  v_amount := case
    when v_consultation = 'online' then v_package.online_price
    else v_package.offline_price
  end;
  if v_amount is null or v_amount < 0 then
    raise exception 'package price not available' using errcode = '22023';
  end if;

  v_fingerprint := encode(extensions.digest(
    concat_ws('|',
      v_name, v_phone, v_email, coalesce(v_dob::text, ''), v_consultation,
      v_package.code::text, v_slot_start::text, v_slot_end::text, v_concern
    ),
    'sha256'
  ), 'hex');

  select * into v_existing
  from public.bookings
  where idempotency_key = p_idempotency_key;
  if found then
    if v_existing.request_fingerprint <> v_fingerprint then
      raise exception 'idempotency key payload mismatch' using errcode = '22023';
    end if;
    return jsonb_build_object(
      'bookingId', v_existing.public_id,
      'paymentOrderId', v_existing.payment_order_id,
      'amount', v_existing.amount,
      'currency', v_existing.currency,
      'holdExpiresAt', v_existing.hold_expires_at,
      'status', v_existing.status,
      'replayed', true
    );
  end if;

  update public.bookings
  set status = 'expired'
  where status = 'held' and hold_expires_at <= now();

  insert into public.bookings (
    public_id, customer_name, date_of_birth, phone, email, consultation_type,
    package_id, package_code, package_name, amount, currency, slot_start,
    slot_end, concern, payment_provider, payment_order_id, status,
    hold_expires_at, idempotency_key, request_fingerprint
  ) values (
    'BKG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
    v_name, v_dob, v_phone, v_email, v_consultation,
    v_package.id, v_package.code::text, v_package.name, v_amount,
    v_package.currency, v_slot_start, v_slot_end, nullif(v_concern, ''),
    v_provider,
    'CCP' || to_char(now() at time zone 'UTC', 'YYYYMMDD') ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    'held', now() + interval '15 minutes', p_idempotency_key, v_fingerprint
  )
  returning * into v_booking;

  return jsonb_build_object(
    'bookingId', v_booking.public_id,
    'paymentOrderId', v_booking.payment_order_id,
    'amount', v_booking.amount,
    'currency', v_booking.currency,
    'holdExpiresAt', v_booking.hold_expires_at,
    'status', v_booking.status,
    'replayed', false
  );
exception
  when unique_violation then
    raise exception 'booking slot is no longer available' using errcode = '23P01';
end;
$$;

create or replace function public.cancel_booking_reservation(
  p_public_id text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking
  from public.bookings
  where public_id = trim(coalesce(p_public_id, ''))
    and idempotency_key = p_idempotency_key
  for update;
  if not found then
    raise exception 'booking not found' using errcode = 'P0002';
  end if;
  if v_booking.status in ('pending', 'held') then
    update public.bookings
    set status = 'cancelled'
    where id = v_booking.id
    returning * into v_booking;
  end if;
  return jsonb_build_object(
    'bookingId', v_booking.public_id,
    'status', v_booking.status
  );
end;
$$;

revoke all on function public.create_booking_reservation(uuid, jsonb) from public;
revoke all on function public.cancel_booking_reservation(text, uuid) from public;
grant execute on function public.create_booking_reservation(uuid, jsonb)
  to anon, authenticated;
grant execute on function public.cancel_booking_reservation(text, uuid)
  to anon, authenticated;

commit;
