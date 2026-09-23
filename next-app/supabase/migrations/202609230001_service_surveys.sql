begin;

create table public.service_surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 5 and 160),
  intro text not null check (char_length(trim(intro)) between 10 and 1200),
  questions jsonb not null check (
    jsonb_typeof(questions) = 'array'
    and jsonb_array_length(questions) between 1 and 10
    and octet_length(questions::text) <= 10000
  ),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.service_surveys(id) on delete restrict,
  respondent_name text not null check (char_length(trim(respondent_name)) between 1 and 120),
  rating smallint not null check (rating between 1 and 5),
  answers jsonb not null check (
    jsonb_typeof(answers) = 'array'
    and jsonb_array_length(answers) between 1 and 10
    and octet_length(answers::text) <= 30000
  ),
  created_at timestamptz not null default now()
);

create index service_survey_responses_recent_idx
  on public.service_survey_responses (survey_id, created_at desc);

create table public.service_survey_rate_limits (
  survey_id uuid not null references public.service_surveys(id) on delete cascade,
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  bucket_start timestamptz not null,
  attempt_count integer not null default 1 check (attempt_count > 0),
  primary key (survey_id, ip_hash, bucket_start)
);

create index service_survey_rate_limits_cleanup_idx
  on public.service_survey_rate_limits (bucket_start);

create trigger service_surveys_set_updated_at before update on public.service_surveys
  for each row execute function public.set_updated_at();

alter table public.service_surveys enable row level security;
alter table public.service_survey_responses enable row level security;
alter table public.service_survey_rate_limits enable row level security;

revoke all on public.service_surveys, public.service_survey_responses, public.service_survey_rate_limits from public, anon, authenticated;
grant select, insert, update on public.service_surveys to authenticated;
grant select on public.service_survey_responses to authenticated;
grant select, insert, update, delete on public.service_surveys, public.service_survey_responses, public.service_survey_rate_limits to service_role;

create policy "service_surveys_content_manager_all" on public.service_surveys
  for all to authenticated
  using (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]))
  with check (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]));
create policy "service_survey_responses_content_manager_read" on public.service_survey_responses
  for select to authenticated
  using (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]));

create function public.consume_service_survey_rate_limit(p_survey_id uuid, p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bucket timestamptz := date_bin(interval '15 minutes', now(), timestamptz '1970-01-01 00:00:00+00');
  v_count integer;
begin
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

revoke all on function public.consume_service_survey_rate_limit(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_service_survey_rate_limit(uuid, text) to service_role;

insert into public.service_surveys (title, intro, questions) values (
  'Lắng nghe trải nghiệm của bạn',
  'Sau buổi xem thần số học, em có thể giúp anh trả lời vài câu hỏi để anh cải thiện nội dung và kỹ năng tư vấn không? Biết ơn em nhiều.',
  '[{"id":"goc-nhin","prompt":"Đâu là thông điệp hoặc góc nhìn từ buổi tư vấn mà em cảm thấy giá trị và đúng với bản thân nhất?"},{"id":"ro-rang","prompt":"Cách mình phân tích các chỉ số đã đủ rõ ràng, dễ hiểu và giúp em vạch ra hướng đi thực tế chưa?"},{"id":"ky-vong","prompt":"Mức độ chi tiết và thời lượng của buổi tư vấn đã đáp ứng kỳ vọng ban đầu của em như thế nào?"}]'::jsonb
);

commit;
