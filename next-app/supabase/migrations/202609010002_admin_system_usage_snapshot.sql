begin;

create extension if not exists pg_cron;

create or replace function public.refresh_admin_system_usage_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_database_bytes bigint;
  v_storage_bytes bigint;
  v_storage_objects bigint;
  v_snapshot jsonb;
begin
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

  v_snapshot := jsonb_build_object(
    'database_bytes', v_database_bytes,
    'storage_bytes', v_storage_bytes,
    'storage_objects', v_storage_objects,
    'checked_at', pg_catalog.now()
  );

  insert into public.site_settings (key, value, description, is_public)
  values (
    'system.capacity_snapshot',
    v_snapshot,
    'Ảnh chụp dung lượng Supabase tự cập nhật để trang trạng thái có thể đọc khi RPC đang làm mới schema cache.',
    false
  )
  on conflict (key) do update set
    value = excluded.value,
    description = excluded.description,
    is_public = false;

  return v_snapshot;
end;
$$;

revoke all on function public.refresh_admin_system_usage_snapshot() from public;
revoke all on function public.refresh_admin_system_usage_snapshot() from anon;
revoke all on function public.refresh_admin_system_usage_snapshot() from authenticated;

select public.refresh_admin_system_usage_snapshot();

select cron.schedule(
  'refresh-admin-system-usage-snapshot',
  '*/15 * * * *',
  'select public.refresh_admin_system_usage_snapshot();'
);

commit;
