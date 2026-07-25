begin;

create or replace function public.admin_transition_booking(
  p_id uuid,
  p_expected_status public.booking_status,
  p_next_status public.booking_status
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
  if v_before.status <> p_expected_status then
    raise exception 'booking status changed; reload before retrying'
      using errcode = '40001';
  end if;
  if p_next_status = p_expected_status then
    raise exception 'booking status is unchanged' using errcode = '22023';
  end if;

  update public.bookings
  set
    status = p_next_status,
    confirmed_at = case
      when p_next_status = 'confirmed' then coalesce(confirmed_at, now())
      else confirmed_at
    end,
    updated_at = now()
  where id = p_id
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
    'booking.status_transition',
    'booking',
    v_after.id::text,
    jsonb_build_object(
      'status', v_before.status,
      'manual_payment_claimed',
        v_before.manual_payment_claimed_at is not null
    ),
    jsonb_build_object(
      'status', v_after.status,
      'manual_payment_claimed',
        v_after.manual_payment_claimed_at is not null
    )
  );

  return v_after;
end;
$$;

revoke all on function public.admin_transition_booking(
  uuid, public.booking_status, public.booking_status
) from public;
grant execute on function public.admin_transition_booking(
  uuid, public.booking_status, public.booking_status
) to authenticated;

commit;
