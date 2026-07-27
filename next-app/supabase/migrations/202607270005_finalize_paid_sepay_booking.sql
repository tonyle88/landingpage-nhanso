begin;

create or replace function public.finalize_paid_sepay_booking(p_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.bookings;
  v_after public.bookings;
begin
  select * into v_before
  from public.bookings
  where id = p_id
  for update;

  if not found then
    raise exception 'booking not found' using errcode = 'P0002';
  end if;

  if v_before.status = 'confirmed' then
    return v_before;
  end if;

  if v_before.status <> 'paid' or v_before.payment_provider <> 'sepay' then
    raise exception 'booking is not a paid SePay booking'
      using errcode = '22023';
  end if;

  update public.bookings
  set
    status = 'confirmed',
    confirmed_at = coalesce(confirmed_at, now()),
    updated_at = now()
  where id = v_before.id
  returning * into v_after;

  insert into public.audit_logs (
    action,
    target_type,
    target_id,
    before_data,
    after_data
  ) values (
    'booking.sepay_auto_confirmed',
    'booking',
    v_after.id::text,
    jsonb_build_object('status', v_before.status),
    jsonb_build_object('status', v_after.status)
  );

  return v_after;
end;
$$;

revoke all on function public.finalize_paid_sepay_booking(uuid)
from public, anon, authenticated;
grant execute on function public.finalize_paid_sepay_booking(uuid)
to service_role;

commit;
