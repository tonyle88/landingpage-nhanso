begin;

insert into public.site_settings (key, value, description, is_public)
values (
  'system.capacity_limits',
  jsonb_build_object(
    'supabase_plan', 'free',
    'database_limit_bytes', 524288000,
    'storage_limit_bytes', 1073741824
  ),
  'Mốc dung lượng dùng để cảnh báo trong trang Trạng thái hệ thống.',
  false
)
on conflict (key) do nothing;

create or replace function public.admin_get_system_usage()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role public.admin_role;
  v_database_bytes bigint;
  v_storage_bytes bigint;
  v_storage_objects bigint;
begin
  v_role := public.current_admin_role();
  if v_role is distinct from 'owner'::public.admin_role then
    raise exception 'owner permission required' using errcode = '42501';
  end if;

  select pg_catalog.pg_database_size(pg_catalog.current_database())
  into v_database_bytes;

  select
    coalesce(sum(
      case
        when metadata ? 'size'
          and coalesce(metadata->>'size', '') ~ '^[0-9]+$'
          then (metadata->>'size')::bigint
        else 0
      end
    ), 0)::bigint,
    count(*)::bigint
  into v_storage_bytes, v_storage_objects
  from storage.objects;

  return jsonb_build_object(
    'database_bytes', v_database_bytes,
    'storage_bytes', v_storage_bytes,
    'storage_objects', v_storage_objects,
    'checked_at', pg_catalog.now()
  );
end;
$$;

revoke all on function public.admin_get_system_usage() from public;
revoke all on function public.admin_get_system_usage() from anon;
grant execute on function public.admin_get_system_usage() to authenticated;

commit;
