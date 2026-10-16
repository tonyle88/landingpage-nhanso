begin;

-- PK gộp nhiều tab cùng trình duyệt. Chỉ lưu HMAC và heartbeat, không IP/URL/ID gốc.
create table public.site_visit_presence (
  visitor_hash text primary key check (visitor_hash ~ '^[0-9a-f]{64}$'),
  seen_at timestamptz not null
);
create index site_visit_presence_seen_idx on public.site_visit_presence(seen_at);
alter table public.site_visit_presence enable row level security;
revoke all on public.site_visit_presence from public, anon, authenticated;

/** Trang chủ/blog dùng chung RPC. Tái sử dụng RPC cũ cho rate limit, tăng tổng nguyên tử,
 * chống gửi trùng và dọn lượt xem. Giữ tổng lịch sử. Heartbeat không tăng lượt.
 * Online là trình duyệt có tín hiệu trong 2 phút. Bot/probe chỉ đọc tổng, không tạo online.
 */
create function public.record_site_visit(
  p_view_hash text, p_visitor_hash text, p_network_hash text,
  p_count_view boolean, p_is_active boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_result jsonb;
  v_now timestamptz := statement_timestamp();
  v_online bigint;
begin
  if coalesce(p_visitor_hash, '') !~ '^[0-9a-f]{64}$' or p_is_active is null
    or p_count_view is null or (p_count_view and not p_is_active) then
    raise exception 'invalid visit identifiers' using errcode = '22023';
  end if;
  v_result := public.record_landing_visit(p_view_hash, p_network_hash, p_count_view);
  if (v_result->>'allowed')::boolean is not true then return v_result; end if;
  delete from public.site_visit_presence where visitor_hash in (
    select visitor_hash from public.site_visit_presence
    where seen_at < v_now - interval '2 minutes'
    order by seen_at limit 200 for update skip locked
  );
  if p_is_active then
    insert into public.site_visit_presence(visitor_hash, seen_at) values(p_visitor_hash, v_now)
    on conflict(visitor_hash) do update set seen_at = greatest(public.site_visit_presence.seen_at, excluded.seen_at)
      where public.site_visit_presence.seen_at < excluded.seen_at - interval '15 seconds';
  end if;
  select count(*) into v_online from public.site_visit_presence where seen_at >= v_now - interval '2 minutes';
  return v_result || jsonb_build_object('online', v_online::text);
end;
$$;
revoke all on function public.record_site_visit(text,text,text,boolean,boolean) from public, anon, authenticated;
grant execute on function public.record_site_visit(text,text,text,boolean,boolean) to service_role;
notify pgrst, 'reload schema';
commit;
