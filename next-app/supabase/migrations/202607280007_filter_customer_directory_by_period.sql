begin;

create or replace function public.admin_list_booking_customers(
  p_search text,
  p_year integer,
  p_month integer,
  p_limit integer,
  p_offset integer
)
returns table (
  customer_key text,
  customer_name text,
  date_of_birth date,
  email text,
  phone text,
  latest_confirmed_at timestamptz,
  first_confirmed_at timestamptz,
  successful_bookings bigint,
  latest_booking_public_id text,
  latest_package_name text,
  total_customers bigint,
  total_successful_bookings bigint,
  returning_customers bigint
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_role public.admin_role;
  v_search text := nullif(btrim(p_search), '');
  v_year integer := case
    when p_year between 2000 and 2100 then p_year
    else null
  end;
  v_month integer := case
    when p_year between 2000 and 2100 and p_month between 1 and 12 then p_month
    else null
  end;
  v_limit integer := least(greatest(coalesce(p_limit, 10), 1), 5000);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  v_role := public.current_admin_role();
  if v_role is null or v_role not in ('owner', 'admin', 'auditor') then
    raise exception 'insufficient customer directory permission'
      using errcode = '42501';
  end if;

  return query
  with confirmed_in_period as (
    select
      b.*,
      coalesce(b.confirmed_at, b.created_at) as effective_confirmed_at
    from public.bookings b
    where
      b.status = 'confirmed'
      and (
        v_year is null
        or extract(
          year from coalesce(b.confirmed_at, b.created_at)
          at time zone 'Asia/Ho_Chi_Minh'
        )::integer = v_year
      )
      and (
        v_month is null
        or extract(
          month from coalesce(b.confirmed_at, b.created_at)
          at time zone 'Asia/Ho_Chi_Minh'
        )::integer = v_month
      )
  ),
  ranked as (
    select
      lower(btrim(b.email::text)) as normalized_email,
      b.customer_name,
      b.date_of_birth,
      b.email::text as email,
      b.phone,
      b.effective_confirmed_at,
      b.public_id,
      b.package_name,
      row_number() over (
        partition by lower(btrim(b.email::text))
        order by b.effective_confirmed_at desc, b.created_at desc
      ) as latest_rank,
      count(*) over (
        partition by lower(btrim(b.email::text))
      ) as booking_count,
      min(b.effective_confirmed_at) over (
        partition by lower(btrim(b.email::text))
      ) as first_booking_at
    from confirmed_in_period b
  ),
  customers as (
    select
      r.normalized_email,
      r.customer_name,
      r.date_of_birth,
      r.email,
      r.phone,
      r.effective_confirmed_at,
      r.first_booking_at,
      r.booking_count,
      r.public_id,
      r.package_name
    from ranked r
    where r.latest_rank = 1
  ),
  filtered as (
    select *
    from customers c
    where
      v_search is null
      or c.customer_name ilike '%' || v_search || '%'
      or c.email ilike '%' || v_search || '%'
      or c.phone ilike '%' || v_search || '%'
  )
  select
    f.normalized_email,
    f.customer_name,
    f.date_of_birth,
    f.email,
    f.phone,
    f.effective_confirmed_at,
    f.first_booking_at,
    f.booking_count,
    f.public_id,
    f.package_name,
    count(*) over (),
    coalesce(sum(f.booking_count) over (), 0)::bigint,
    count(*) filter (where f.booking_count > 1) over ()
  from filtered f
  order by f.effective_confirmed_at desc, f.customer_name asc
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.admin_list_booking_customers(
  text, integer, integer, integer, integer
) from public;
grant execute on function public.admin_list_booking_customers(
  text, integer, integer, integer, integer
) to authenticated;

commit;
