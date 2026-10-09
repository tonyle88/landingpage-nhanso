begin;

-- Tổng được lưu riêng: xóa dữ liệu chống đếm lặp không làm giảm số lượt lịch sử.
-- Bắt đầu từ 0 khi kích hoạt; không tạo hoặc suy đoán lượt của những ngày trước đó.
create table public.landing_visit_totals (
  id smallint primary key check (id = 1),
  total bigint not null default 0 check (total >= 0)
);
insert into public.landing_visit_totals (id, total) values (1, 0);

-- Chỉ lưu HMAC của mã phiên ngẫu nhiên, không lưu ID gốc, IP, tên hoặc email.
create table public.landing_visit_sessions (
  session_hash text primary key check (session_hash ~ '^[0-9a-f]{64}$'),
  counted_at timestamptz not null
);
create index landing_visit_sessions_cleanup_idx
  on public.landing_visit_sessions (counted_at);

create table public.landing_visit_rate_buckets (
  network_hash text not null check (network_hash ~ '^[0-9a-f]{64}$'),
  bucket_start timestamptz not null,
  attempts integer not null check (attempts between 1 and 121),
  primary key (network_hash, bucket_start)
);
create index landing_visit_rate_buckets_cleanup_idx
  on public.landing_visit_rate_buckets (bucket_start);

alter table public.landing_visit_totals enable row level security;
alter table public.landing_visit_sessions enable row level security;
alter table public.landing_visit_rate_buckets enable row level security;
revoke all on table public.landing_visit_totals,
  public.landing_visit_sessions, public.landing_visit_rate_buckets
  from public, anon, authenticated;

/**
 * API server gọi RPC này để giới hạn spam, chống đếm lặp trong 30 phút và tăng tổng.
 * ON CONFLICT khóa theo mã phiên; UPDATE total = total + 1 tránh lost update.
 * Mỗi IP đã băm có tối đa 120 request/phút; bot nhận diện được chỉ đọc tổng.
 * Xóa tối đa 200 dòng cũ mỗi bảng mỗi request được chấp nhận, có index và SKIP LOCKED.
 * Giữ bảng tạm theo cửa sổ 24 giờ, không tăng dữ liệu lịch sử theo mỗi lần tải trang.
 */
create function public.record_landing_visit(
  p_session_hash text,
  p_network_hash text,
  p_count_visit boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_bucket timestamptz := date_trunc('minute', v_now);
  v_attempts integer;
  v_counted boolean := false;
  v_total bigint;
begin
  if coalesce(p_session_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_network_hash, '') !~ '^[0-9a-f]{64}$'
    or p_count_visit is null then
    raise exception 'invalid visit identifiers' using errcode = '22023';
  end if;

  insert into public.landing_visit_rate_buckets (network_hash, bucket_start, attempts)
  values (p_network_hash, v_bucket, 1)
  on conflict (network_hash, bucket_start) do update
    set attempts = least(public.landing_visit_rate_buckets.attempts + 1, 121)
  returning attempts into v_attempts;
  if v_attempts > 120 then
    return jsonb_build_object('allowed', false);
  end if;

  delete from public.landing_visit_sessions
  where session_hash in (
    select session_hash from public.landing_visit_sessions
    where counted_at < v_now - interval '24 hours'
    order by counted_at limit 200 for update skip locked
  );
  delete from public.landing_visit_rate_buckets
  where (network_hash, bucket_start) in (
    select network_hash, bucket_start from public.landing_visit_rate_buckets
    where bucket_start < v_now - interval '24 hours'
    order by bucket_start limit 200 for update skip locked
  );

  if p_count_visit then
    insert into public.landing_visit_sessions (session_hash, counted_at)
    values (p_session_hash, v_now)
    on conflict (session_hash) do update set counted_at = v_now
      where public.landing_visit_sessions.counted_at <= v_now - interval '30 minutes'
    returning true into v_counted;
    if coalesce(v_counted, false) then
      update public.landing_visit_totals set total = total + 1 where id = 1
      returning total into v_total;
    end if;
  end if;
  if v_total is null then
    select total into v_total from public.landing_visit_totals where id = 1;
  end if;

  -- Trả chuỗi để JS không mất chính xác khi bigint vượt Number.MAX_SAFE_INTEGER.
  return jsonb_build_object('allowed', true, 'total', v_total::text);
end;
$$;

revoke all on function public.record_landing_visit(text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.record_landing_visit(text, text, boolean) to service_role;

commit;
