begin;

drop policy if exists "audit_logs_privileged_insert" on public.audit_logs;
create policy "audit_logs_content_manager_insert"
  on public.audit_logs for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and actor_role = public.current_admin_role()
    and public.has_admin_role(
      array['owner','admin','editor']::public.admin_role[]
    )
  );

create or replace function public.admin_save_package(
  p_id uuid,
  p_payload jsonb
)
returns public.packages
language plpgsql
set search_path = ''
as $$
declare
  v_role public.admin_role;
  v_before public.packages;
  v_after public.packages;
  v_code text := lower(trim(coalesce(p_payload->>'code', '')));
  v_name text := trim(coalesce(p_payload->>'name', ''));
  v_features jsonb := coalesce(p_payload->'features', '[]'::jsonb);
  v_online_price bigint := nullif(p_payload->>'online_price', '')::bigint;
  v_offline_price bigint := nullif(p_payload->>'offline_price', '')::bigint;
begin
  v_role := public.current_admin_role();
  if v_role is null or v_role not in ('owner', 'admin', 'editor') then
    raise exception 'insufficient package permission' using errcode = '42501';
  end if;
  if v_code !~ '^[a-z0-9][a-z0-9-]{1,63}$' then
    raise exception 'invalid package code' using errcode = '22023';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 160 then
    raise exception 'invalid package name' using errcode = '22023';
  end if;
  if jsonb_typeof(v_features) <> 'array' then
    raise exception 'features must be an array' using errcode = '22023';
  end if;
  if v_online_price is null and v_offline_price is null then
    raise exception 'at least one price is required' using errcode = '22023';
  end if;
  if coalesce(v_online_price, 0) < 0 or coalesce(v_offline_price, 0) < 0 then
    raise exception 'prices cannot be negative' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.packages (
      code, name, online_price, offline_price, currency, unit, icon,
      accent_color, featured, badge, features, button_text, enabled, sort_order
    ) values (
      v_code,
      v_name,
      v_online_price,
      v_offline_price,
      upper(coalesce(nullif(trim(p_payload->>'currency'), ''), 'VND')),
      nullif(trim(p_payload->>'unit'), ''),
      nullif(trim(p_payload->>'icon'), ''),
      nullif(trim(p_payload->>'accent_color'), ''),
      coalesce((p_payload->>'featured')::boolean, false),
      nullif(trim(p_payload->>'badge'), ''),
      v_features,
      nullif(trim(p_payload->>'button_text'), ''),
      coalesce((p_payload->>'enabled')::boolean, true),
      coalesce((p_payload->>'sort_order')::integer, 0)
    )
    returning * into v_after;
  else
    select * into v_before
    from public.packages
    where id = p_id
    for update;
    if not found then
      raise exception 'package not found' using errcode = 'P0002';
    end if;

    update public.packages set
      code = v_code,
      name = v_name,
      online_price = v_online_price,
      offline_price = v_offline_price,
      currency = upper(coalesce(nullif(trim(p_payload->>'currency'), ''), 'VND')),
      unit = nullif(trim(p_payload->>'unit'), ''),
      icon = nullif(trim(p_payload->>'icon'), ''),
      accent_color = nullif(trim(p_payload->>'accent_color'), ''),
      featured = coalesce((p_payload->>'featured')::boolean, false),
      badge = nullif(trim(p_payload->>'badge'), ''),
      features = v_features,
      button_text = nullif(trim(p_payload->>'button_text'), ''),
      enabled = coalesce((p_payload->>'enabled')::boolean, true),
      sort_order = coalesce((p_payload->>'sort_order')::integer, 0)
    where id = p_id
    returning * into v_after;
  end if;

  insert into public.audit_logs (
    actor_id, actor_role, action, target_type, target_id, before_data, after_data
  ) values (
    auth.uid(),
    v_role,
    case when p_id is null then 'package.create' else 'package.update' end,
    'package',
    v_after.id::text,
    case when p_id is null then null else to_jsonb(v_before) end,
    to_jsonb(v_after)
  );
  return v_after;
end;
$$;

create or replace function public.admin_delete_package(p_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_role public.admin_role;
  v_before public.packages;
begin
  v_role := public.current_admin_role();
  if v_role is null or v_role not in ('owner', 'admin', 'editor') then
    raise exception 'insufficient package permission' using errcode = '42501';
  end if;
  delete from public.packages
  where id = p_id
  returning * into v_before;
  if not found then
    raise exception 'package not found' using errcode = 'P0002';
  end if;
  insert into public.audit_logs (
    actor_id, actor_role, action, target_type, target_id, before_data
  ) values (
    auth.uid(), v_role, 'package.delete', 'package', p_id::text, to_jsonb(v_before)
  );
  return p_id;
end;
$$;

revoke all on function public.admin_save_package(uuid, jsonb) from public;
revoke all on function public.admin_delete_package(uuid) from public;
grant execute on function public.admin_save_package(uuid, jsonb) to authenticated;
grant execute on function public.admin_delete_package(uuid) to authenticated;

commit;
