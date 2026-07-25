begin;

create table if not exists public.booking_rate_limit_buckets (
  scope text not null check (scope in ('ip', 'email', 'phone')),
  identifier_hash text not null check (identifier_hash ~ '^[0-9a-f]{64}$'),
  bucket_start timestamptz not null,
  attempt_count integer not null default 1 check (attempt_count > 0),
  updated_at timestamptz not null default now(),
  primary key (scope, identifier_hash, bucket_start)
);

alter table public.booking_rate_limit_buckets enable row level security;

create index if not exists booking_rate_limit_bucket_cleanup_idx
  on public.booking_rate_limit_buckets (bucket_start);

create or replace function public.consume_booking_rate_limit(
  p_ip_hash text,
  p_email text default null,
  p_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bucket timestamptz := date_bin(
    interval '15 minutes',
    now(),
    timestamptz '1970-01-01 00:00:00+00'
  );
  v_email text := lower(trim(coalesce(p_email, '')));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_email_hash text;
  v_phone_hash text;
  v_ip_count integer;
  v_email_count integer := 0;
  v_phone_count integer := 0;
  v_retry_after integer;
begin
  if coalesce(p_ip_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid rate limit identifier' using errcode = '22023';
  end if;

  delete from public.booking_rate_limit_buckets
  where bucket_start < now() - interval '2 days';

  insert into public.booking_rate_limit_buckets (
    scope, identifier_hash, bucket_start, attempt_count
  ) values (
    'ip', p_ip_hash, v_bucket, 1
  )
  on conflict (scope, identifier_hash, bucket_start)
  do update set
    attempt_count = public.booking_rate_limit_buckets.attempt_count + 1,
    updated_at = now()
  returning attempt_count into v_ip_count;

  if v_email <> '' then
    v_email_hash := encode(
      extensions.digest(convert_to(v_email, 'UTF8'), 'sha256'),
      'hex'
    );
    insert into public.booking_rate_limit_buckets (
      scope, identifier_hash, bucket_start, attempt_count
    ) values (
      'email', v_email_hash, v_bucket, 1
    )
    on conflict (scope, identifier_hash, bucket_start)
    do update set
      attempt_count = public.booking_rate_limit_buckets.attempt_count + 1,
      updated_at = now()
    returning attempt_count into v_email_count;
  end if;

  if v_phone <> '' then
    v_phone_hash := encode(
      extensions.digest(convert_to(v_phone, 'UTF8'), 'sha256'),
      'hex'
    );
    insert into public.booking_rate_limit_buckets (
      scope, identifier_hash, bucket_start, attempt_count
    ) values (
      'phone', v_phone_hash, v_bucket, 1
    )
    on conflict (scope, identifier_hash, bucket_start)
    do update set
      attempt_count = public.booking_rate_limit_buckets.attempt_count + 1,
      updated_at = now()
    returning attempt_count into v_phone_count;
  end if;

  v_retry_after := greatest(
    1,
    ceil(extract(epoch from (v_bucket + interval '15 minutes' - now())))::integer
  );
  return jsonb_build_object(
    'allowed',
      v_ip_count <= 20
      and (v_email_count = 0 or v_email_count <= 5)
      and (v_phone_count = 0 or v_phone_count <= 5),
    'retryAfter', v_retry_after
  );
end;
$$;

revoke all on table public.booking_rate_limit_buckets
  from public, anon, authenticated;
revoke all on function public.consume_booking_rate_limit(text, text, text)
  from public, anon, authenticated;
revoke execute on function public.create_booking_reservation(uuid, jsonb)
  from anon, authenticated;
revoke execute on function public.cancel_booking_reservation(text, uuid)
  from anon, authenticated;

grant execute on function public.consume_booking_rate_limit(text, text, text)
  to service_role;
grant execute on function public.create_booking_reservation(uuid, jsonb)
  to service_role;
grant execute on function public.cancel_booking_reservation(text, uuid)
  to service_role;

commit;
