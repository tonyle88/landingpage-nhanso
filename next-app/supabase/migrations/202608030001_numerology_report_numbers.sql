begin;

create sequence if not exists public.numerology_report_number_seq
  as bigint
  start with 1
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;

alter table public.numerology_records
  add column if not exists report_number bigint;

with missing_numbers as (
  select id,
    nextval('public.numerology_report_number_seq'::regclass) as report_number
  from public.numerology_records
  where report_number is null
  order by created_at, id
)
update public.numerology_records as records
set report_number = missing_numbers.report_number
from missing_numbers
where records.id = missing_numbers.id;

alter table public.numerology_records
  alter column report_number set default
    nextval('public.numerology_report_number_seq'::regclass),
  alter column report_number set not null;

alter table public.numerology_records
  drop constraint if exists numerology_records_report_number_positive;
alter table public.numerology_records
  add constraint numerology_records_report_number_positive
  check (report_number between 1 and 999999999);

create unique index if not exists numerology_records_report_number_key
  on public.numerology_records (report_number);

select setval(
  'public.numerology_report_number_seq'::regclass,
  greatest(
    coalesce((select max(report_number) from public.numerology_records), 0),
    1
  ),
  exists(select 1 from public.numerology_records)
);

create or replace function public.reserve_numerology_report_number()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report_number bigint;
begin
  if public.current_admin_role() is null then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  loop
    v_report_number := nextval('public.numerology_report_number_seq'::regclass);
    exit when not exists (
      select 1
      from public.numerology_records
      where report_number = v_report_number
    );
  end loop;

  return v_report_number;
end;
$$;

revoke all on sequence public.numerology_report_number_seq from public, anon, authenticated;
grant usage, select on sequence public.numerology_report_number_seq to service_role;
revoke all on function public.reserve_numerology_report_number() from public, anon;
grant execute on function public.reserve_numerology_report_number() to authenticated, service_role;

commit;
