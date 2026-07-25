begin;

create or replace function public.admin_save_site_setting(
  p_key text,
  p_payload jsonb
)
returns public.site_settings
language plpgsql
set search_path = ''
as $$
declare
  v_role public.admin_role;
  v_key text := lower(trim(coalesce(p_key, '')));
  v_value jsonb := p_payload->'value';
  v_description text := trim(coalesce(p_payload->>'description', ''));
  v_before public.site_settings;
  v_after public.site_settings;
  v_action text;
begin
  v_role := public.current_admin_role();
  if v_role is null or v_role not in ('owner', 'admin', 'editor') then
    raise exception 'insufficient setting permission' using errcode = '42501';
  end if;
  if v_key !~ '^[a-z0-9][a-z0-9._-]{1,119}$' then
    raise exception 'invalid setting key' using errcode = '22023';
  end if;
  if v_value is null or char_length(v_value::text) > 100000 then
    raise exception 'invalid setting value' using errcode = '22023';
  end if;
  if char_length(v_description) > 500 then
    raise exception 'invalid setting description' using errcode = '22023';
  end if;

  select * into v_before
  from public.site_settings
  where key = v_key
  for update;

  if found then
    update public.site_settings set
      value = v_value,
      description = nullif(v_description, ''),
      is_public = coalesce((p_payload->>'is_public')::boolean, false),
      updated_by = auth.uid()
    where key = v_key
    returning * into v_after;
    v_action := 'site_setting.update';
  else
    insert into public.site_settings (
      key, value, description, is_public, updated_by
    ) values (
      v_key,
      v_value,
      nullif(v_description, ''),
      coalesce((p_payload->>'is_public')::boolean, false),
      auth.uid()
    )
    returning * into v_after;
    v_action := 'site_setting.create';
  end if;

  insert into public.audit_logs (
    actor_id, actor_role, action, target_type, target_id, before_data, after_data
  ) values (
    auth.uid(),
    v_role,
    v_action,
    'site_setting',
    v_key,
    case when v_before.key is null then null else jsonb_build_object(
      'key', v_before.key,
      'is_public', v_before.is_public,
      'description', v_before.description,
      'value_sha256', encode(public.digest(v_before.value::text, 'sha256'), 'hex')
    ) end,
    jsonb_build_object(
      'key', v_after.key,
      'is_public', v_after.is_public,
      'description', v_after.description,
      'value_sha256', encode(public.digest(v_after.value::text, 'sha256'), 'hex')
    )
  );
  return v_after;
end;
$$;

create or replace function public.admin_delete_site_setting(p_key text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_role public.admin_role;
  v_key text := lower(trim(coalesce(p_key, '')));
  v_before public.site_settings;
begin
  v_role := public.current_admin_role();
  if v_role is null or v_role not in ('owner', 'admin', 'editor') then
    raise exception 'insufficient setting permission' using errcode = '42501';
  end if;
  delete from public.site_settings where key = v_key returning * into v_before;
  if not found then
    raise exception 'site setting not found' using errcode = 'P0002';
  end if;
  insert into public.audit_logs (
    actor_id, actor_role, action, target_type, target_id, before_data
  ) values (
    auth.uid(),
    v_role,
    'site_setting.delete',
    'site_setting',
    v_key,
    jsonb_build_object(
      'key', v_before.key,
      'is_public', v_before.is_public,
      'description', v_before.description,
      'value_sha256', encode(public.digest(v_before.value::text, 'sha256'), 'hex')
    )
  );
  return v_key;
end;
$$;

revoke all on function public.admin_save_site_setting(text, jsonb) from public;
revoke all on function public.admin_delete_site_setting(text) from public;
grant execute on function public.admin_save_site_setting(text, jsonb) to authenticated;
grant execute on function public.admin_delete_site_setting(text) to authenticated;

commit;
