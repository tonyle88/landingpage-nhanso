begin;

create or replace function public.admin_save_landing_section(
  p_id uuid,
  p_payload jsonb
)
returns public.landing_sections
language plpgsql
set search_path = ''
as $$
declare
  v_role public.admin_role;
  v_before public.landing_sections;
  v_after public.landing_sections;
  v_display_name text := trim(coalesce(p_payload->>'display_name', ''));
  v_title text := trim(coalesce(p_payload->>'title', ''));
  v_eyebrow text := trim(coalesce(p_payload->>'eyebrow', ''));
  v_content_html text := trim(coalesce(p_payload->>'content_html', ''));
  v_sort_order integer;
begin
  v_role := public.current_admin_role();
  if v_role is null or v_role not in ('owner', 'admin', 'editor') then
    raise exception 'insufficient section permission' using errcode = '42501';
  end if;
  begin
    v_sort_order := (p_payload->>'sort_order')::integer;
  exception when others then
    raise exception 'invalid section sort order' using errcode = '22023';
  end;
  if char_length(v_display_name) < 2 or char_length(v_display_name) > 160
    or char_length(v_title) > 300 or char_length(v_eyebrow) > 160
    or char_length(v_content_html) > 100000
    or v_sort_order < 0 or v_sort_order > 10000
    or v_content_html ~* '<\s*(script|iframe|object|embed|style)\b|on[a-z]+\s*=|javascript\s*:' then
    raise exception 'invalid landing section payload' using errcode = '22023';
  end if;

  select * into v_before from public.landing_sections where id = p_id for update;
  if not found then
    raise exception 'landing section not found' using errcode = 'P0002';
  end if;

  update public.landing_sections set
    display_name = v_display_name,
    title = nullif(v_title, ''),
    eyebrow = nullif(v_eyebrow, ''),
    content_html = nullif(v_content_html, ''),
    enabled = coalesce((p_payload->>'enabled')::boolean, false),
    sort_order = v_sort_order
  where id = p_id
  returning * into v_after;

  insert into public.audit_logs (
    actor_id, actor_role, action, target_type, target_id, before_data, after_data
  ) values (
    auth.uid(), v_role, 'landing_section.update', 'landing_section', p_id::text,
    jsonb_build_object(
      'section_key', v_before.section_key, 'display_name', v_before.display_name,
      'enabled', v_before.enabled, 'sort_order', v_before.sort_order,
      'content_sha256', encode(public.digest(coalesce(v_before.content_html, ''), 'sha256'), 'hex')
    ),
    jsonb_build_object(
      'section_key', v_after.section_key, 'display_name', v_after.display_name,
      'enabled', v_after.enabled, 'sort_order', v_after.sort_order,
      'content_sha256', encode(public.digest(coalesce(v_after.content_html, ''), 'sha256'), 'hex')
    )
  );
  return v_after;
end;
$$;

revoke all on function public.admin_save_landing_section(uuid, jsonb) from public;
grant execute on function public.admin_save_landing_section(uuid, jsonb) to authenticated;

commit;
