begin;

create or replace function public.admin_save_testimonial(
  p_id uuid,
  p_payload jsonb
)
returns public.testimonials
language plpgsql
set search_path = ''
as $$
declare
  v_role public.admin_role;
  v_before public.testimonials;
  v_after public.testimonials;
  v_image_url text := trim(coalesce(p_payload->>'image_url', ''));
  v_alt_text text := trim(coalesce(p_payload->>'alt_text', ''));
  v_sort_order integer := coalesce((p_payload->>'sort_order')::integer, 0);
begin
  v_role := public.current_admin_role();
  if v_role is null or v_role not in ('owner', 'admin', 'editor') then
    raise exception 'insufficient testimonial permission' using errcode = '42501';
  end if;
  if v_image_url !~ '^https://[^[:space:]]{1,2039}$' then
    raise exception 'invalid testimonial image URL' using errcode = '22023';
  end if;
  if char_length(v_alt_text) < 2 or char_length(v_alt_text) > 240 then
    raise exception 'invalid testimonial alt text' using errcode = '22023';
  end if;
  if v_sort_order < 0 or v_sort_order > 10000 then
    raise exception 'invalid testimonial sort order' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.testimonials (image_url, alt_text, enabled, sort_order)
    values (
      v_image_url,
      v_alt_text,
      coalesce((p_payload->>'enabled')::boolean, true),
      v_sort_order
    )
    returning * into v_after;
  else
    select * into v_before
    from public.testimonials
    where id = p_id
    for update;
    if not found then
      raise exception 'testimonial not found' using errcode = 'P0002';
    end if;
    update public.testimonials set
      image_url = v_image_url,
      alt_text = v_alt_text,
      enabled = coalesce((p_payload->>'enabled')::boolean, true),
      sort_order = v_sort_order
    where id = p_id
    returning * into v_after;
  end if;

  insert into public.audit_logs (
    actor_id, actor_role, action, target_type, target_id, before_data, after_data
  ) values (
    auth.uid(),
    v_role,
    case when p_id is null then 'testimonial.create' else 'testimonial.update' end,
    'testimonial',
    v_after.id::text,
    case when p_id is null then null else to_jsonb(v_before) end,
    to_jsonb(v_after)
  );
  return v_after;
end;
$$;

create or replace function public.admin_delete_testimonial(p_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_role public.admin_role;
  v_before public.testimonials;
begin
  v_role := public.current_admin_role();
  if v_role is null or v_role not in ('owner', 'admin', 'editor') then
    raise exception 'insufficient testimonial permission' using errcode = '42501';
  end if;
  delete from public.testimonials where id = p_id returning * into v_before;
  if not found then
    raise exception 'testimonial not found' using errcode = 'P0002';
  end if;
  insert into public.audit_logs (
    actor_id, actor_role, action, target_type, target_id, before_data
  ) values (
    auth.uid(), v_role, 'testimonial.delete', 'testimonial', p_id::text,
    to_jsonb(v_before)
  );
  return p_id;
end;
$$;

revoke all on function public.admin_save_testimonial(uuid, jsonb) from public;
revoke all on function public.admin_delete_testimonial(uuid) from public;
grant execute on function public.admin_save_testimonial(uuid, jsonb) to authenticated;
grant execute on function public.admin_delete_testimonial(uuid) to authenticated;

commit;
