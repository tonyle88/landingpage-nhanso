begin;

-- Data API table/function exposure grants EXECUTE to API roles. Only the
-- server-side service key may consume a survey rate-limit bucket.
create or replace function public.consume_service_survey_rate_limit(p_survey_id uuid, p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bucket timestamptz := date_bin(interval '15 minutes', now(), timestamptz '1970-01-01 00:00:00+00');
  v_count integer;
  v_role text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    current_setting('request.jwt.claim.role', true),
    ''
  );
begin
  if v_role <> 'service_role' then
    raise exception 'survey rate limit is server-only' using errcode = '42501';
  end if;
  if p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid survey rate limit identifier' using errcode = '22023';
  end if;
  delete from public.service_survey_rate_limits where bucket_start < now() - interval '2 days';
  insert into public.service_survey_rate_limits (survey_id, ip_hash, bucket_start)
  values (p_survey_id, p_ip_hash, v_bucket)
  on conflict (survey_id, ip_hash, bucket_start) do update
    set attempt_count = public.service_survey_rate_limits.attempt_count + 1
  returning attempt_count into v_count;
  return v_count <= 5;
end;
$$;

commit;
