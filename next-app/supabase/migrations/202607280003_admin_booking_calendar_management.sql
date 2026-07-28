begin;

create or replace function public.admin_reschedule_confirmed_booking(
  p_id uuid,
  p_expected_slot_start timestamptz,
  p_slot_start timestamptz,
  p_slot_end timestamptz
)
returns public.bookings
language plpgsql
set search_path = ''
as $$
declare
  v_role public.admin_role;
  v_before public.bookings;
  v_after public.bookings;
begin
  v_role := public.current_admin_role();
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'insufficient booking permission' using errcode = '42501';
  end if;

  select * into v_before
  from public.bookings
  where id = p_id
  for update;
  if not found then
    raise exception 'booking not found' using errcode = 'P0002';
  end if;
  if v_before.status <> 'confirmed' then
    raise exception 'only confirmed bookings can be rescheduled'
      using errcode = '22023';
  end if;
  if v_before.slot_start <> p_expected_slot_start then
    raise exception 'booking schedule changed; reload before retrying'
      using errcode = '40001';
  end if;
  if v_before.slot_start < now() + interval '72 hours' then
    raise exception 'booking is inside the 72-hour change window'
      using errcode = '22023';
  end if;
  if p_slot_start < now() + interval '72 hours'
    or p_slot_start > now() + interval '180 days'
    or p_slot_end <> p_slot_start + interval '2 hours'
  then
    raise exception 'invalid replacement booking slot'
      using errcode = '22023';
  end if;
  if exists (
    select 1
    from public.bookings
    where id <> v_before.id
      and status in ('pending', 'held', 'paid', 'confirmed')
      and slot_start < p_slot_end
      and slot_end > p_slot_start
      and (
        status <> 'held'
        or hold_expires_at is null
        or hold_expires_at > now()
      )
  ) then
    raise exception 'booking slot is no longer available'
      using errcode = '23P01';
  end if;

  update public.bookings
  set
    slot_start = p_slot_start,
    slot_end = p_slot_end,
    updated_at = now()
  where id = v_before.id
  returning * into v_after;

  insert into public.audit_logs (
    actor_id,
    actor_role,
    action,
    target_type,
    target_id,
    before_data,
    after_data
  ) values (
    auth.uid(),
    v_role,
    'booking.rescheduled',
    'booking',
    v_after.id::text,
    jsonb_build_object('slot_start', v_before.slot_start, 'slot_end', v_before.slot_end),
    jsonb_build_object('slot_start', v_after.slot_start, 'slot_end', v_after.slot_end)
  );

  return v_after;
end;
$$;

create or replace function public.admin_cancel_confirmed_booking(
  p_id uuid,
  p_expected_slot_start timestamptz
)
returns public.bookings
language plpgsql
set search_path = ''
as $$
declare
  v_role public.admin_role;
  v_before public.bookings;
  v_after public.bookings;
begin
  v_role := public.current_admin_role();
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'insufficient booking permission' using errcode = '42501';
  end if;

  select * into v_before
  from public.bookings
  where id = p_id
  for update;
  if not found then
    raise exception 'booking not found' using errcode = 'P0002';
  end if;
  if v_before.status <> 'confirmed' then
    raise exception 'only confirmed bookings can be cancelled here'
      using errcode = '22023';
  end if;
  if v_before.slot_start <> p_expected_slot_start then
    raise exception 'booking schedule changed; reload before retrying'
      using errcode = '40001';
  end if;
  if v_before.slot_start < now() + interval '72 hours' then
    raise exception 'booking is inside the 72-hour cancellation window'
      using errcode = '22023';
  end if;

  update public.bookings
  set status = 'cancelled', updated_at = now()
  where id = v_before.id
  returning * into v_after;

  insert into public.audit_logs (
    actor_id,
    actor_role,
    action,
    target_type,
    target_id,
    before_data,
    after_data
  ) values (
    auth.uid(),
    v_role,
    'booking.cancelled_by_admin',
    'booking',
    v_after.id::text,
    jsonb_build_object('status', v_before.status, 'slot_start', v_before.slot_start),
    jsonb_build_object('status', v_after.status, 'slot_start', v_after.slot_start)
  );

  return v_after;
end;
$$;

revoke all on function public.admin_reschedule_confirmed_booking(
  uuid, timestamptz, timestamptz, timestamptz
) from public;
grant execute on function public.admin_reschedule_confirmed_booking(
  uuid, timestamptz, timestamptz, timestamptz
) to authenticated;

revoke all on function public.admin_cancel_confirmed_booking(
  uuid, timestamptz
) from public;
grant execute on function public.admin_cancel_confirmed_booking(
  uuid, timestamptz
) to authenticated;

commit;
