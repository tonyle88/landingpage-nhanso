begin;

alter table public.bookings
  add column if not exists manual_payment_claimed_at timestamptz;

create or replace function public.list_booking_unavailable_slots(
  p_from timestamptz,
  p_to timestamptz
)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_from is null
    or p_to is null
    or p_to <= p_from
    or p_to > p_from + interval '31 days'
  then
    raise exception 'invalid slot range' using errcode = '22023';
  end if;

  return query
  select bookings.slot_start, bookings.slot_end
  from public.bookings
  where bookings.slot_start < p_to
    and bookings.slot_end > p_from
    and bookings.status in ('pending', 'held', 'paid', 'confirmed')
    and (
      bookings.status <> 'held'
      or bookings.hold_expires_at is null
      or bookings.hold_expires_at > now()
    )
  order by bookings.slot_start;
end;
$$;

create or replace function public.get_booking_reservation_status(
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
    and idempotency_key = p_idempotency_key;
  if not found then
    raise exception 'booking not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'bookingId', v_booking.public_id,
    'status', v_booking.status,
    'holdExpiresAt', v_booking.hold_expires_at,
    'confirmedAt', v_booking.confirmed_at,
    'manualPaymentClaimedAt', v_booking.manual_payment_claimed_at
  );
end;
$$;

create or replace function public.acknowledge_manual_booking_payment(
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
  if v_booking.payment_provider <> 'manual_qr' then
    raise exception 'manual payment acknowledgement is unavailable'
      using errcode = '22023';
  end if;
  if v_booking.status <> 'held'
    or (
      v_booking.hold_expires_at is not null
      and v_booking.hold_expires_at <= now()
    )
  then
    raise exception 'booking is not awaiting manual payment'
      using errcode = '22023';
  end if;

  update public.bookings
  set
    manual_payment_claimed_at = coalesce(manual_payment_claimed_at, now()),
    hold_expires_at = greatest(
      coalesce(hold_expires_at, now()),
      now() + interval '48 hours'
    )
  where id = v_booking.id
  returning * into v_booking;

  return jsonb_build_object(
    'bookingId', v_booking.public_id,
    'status', 'manual_review',
    'holdExpiresAt', v_booking.hold_expires_at,
    'manualPaymentClaimedAt', v_booking.manual_payment_claimed_at
  );
end;
$$;

revoke all on function public.list_booking_unavailable_slots(
  timestamptz, timestamptz
) from public, anon, authenticated;
revoke all on function public.get_booking_reservation_status(
  text, uuid
) from public, anon, authenticated;
revoke all on function public.acknowledge_manual_booking_payment(
  text, uuid
) from public, anon, authenticated;

grant execute on function public.list_booking_unavailable_slots(
  timestamptz, timestamptz
) to service_role;
grant execute on function public.get_booking_reservation_status(
  text, uuid
) to service_role;
grant execute on function public.acknowledge_manual_booking_payment(
  text, uuid
) to service_role;

commit;
