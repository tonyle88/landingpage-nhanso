begin;

create or replace function public.admin_save_blog_post(
  p_id uuid,
  p_payload jsonb
)
returns public.blog_posts
language plpgsql
set search_path = ''
as $$
declare
  v_role public.admin_role;
  v_before public.blog_posts;
  v_after public.blog_posts;
  v_slug text := lower(trim(coalesce(p_payload->>'slug', '')));
  v_title text := trim(coalesce(p_payload->>'title', ''));
  v_summary text := trim(coalesce(p_payload->>'summary', ''));
  v_content text := trim(coalesce(p_payload->>'content_html', ''));
  v_cover_url text := trim(coalesce(p_payload->>'cover_url', ''));
  v_status public.content_status :=
    coalesce(nullif(p_payload->>'status', ''), 'draft')::public.content_status;
  v_category_id uuid := nullif(p_payload->>'category_id', '')::uuid;
  v_published_at timestamptz :=
    nullif(p_payload->>'published_at', '')::timestamptz;
begin
  v_role := public.current_admin_role();
  if v_role is null or v_role not in ('owner', 'admin', 'editor') then
    raise exception 'insufficient blog permission' using errcode = '42501';
  end if;
  if v_slug !~ '^[a-z0-9][a-z0-9-]{1,159}$' then
    raise exception 'invalid blog slug' using errcode = '22023';
  end if;
  if char_length(v_title) < 2 or char_length(v_title) > 200 then
    raise exception 'invalid blog title' using errcode = '22023';
  end if;
  if char_length(v_summary) > 600 then
    raise exception 'invalid blog summary' using errcode = '22023';
  end if;
  if char_length(v_content) < 1 or char_length(v_content) > 100000 then
    raise exception 'invalid blog content' using errcode = '22023';
  end if;
  if v_content ~* '<[[:space:]]*(script|iframe|object|embed|style)'
    or v_content ~* 'on[a-z]+[[:space:]]*='
    or v_content ~* 'javascript[[:space:]]*:'
  then
    raise exception 'unsafe blog content' using errcode = '22023';
  end if;
  if char_length(v_cover_url) > 2048
    or (v_cover_url <> '' and v_cover_url !~ '^https://[^[:space:]]+$')
  then
    raise exception 'invalid blog cover URL' using errcode = '22023';
  end if;
  if v_category_id is not null and not exists (
    select 1 from public.blog_categories where id = v_category_id
  ) then
    raise exception 'blog category not found' using errcode = '22023';
  end if;
  if v_status = 'published' and v_published_at is null then
    v_published_at := now();
  end if;

  if p_id is null then
    insert into public.blog_posts (
      category_id, slug, title, summary, content_html, cover_url, pinned,
      status, published_at, author_id
    ) values (
      v_category_id, v_slug, v_title, nullif(v_summary, ''), v_content,
      nullif(v_cover_url, ''), coalesce((p_payload->>'pinned')::boolean, false),
      v_status, v_published_at, auth.uid()
    )
    returning * into v_after;
  else
    select * into v_before
    from public.blog_posts
    where id = p_id
    for update;
    if not found then
      raise exception 'blog post not found' using errcode = 'P0002';
    end if;
    update public.blog_posts set
      category_id = v_category_id,
      slug = v_slug,
      title = v_title,
      summary = nullif(v_summary, ''),
      content_html = v_content,
      cover_url = nullif(v_cover_url, ''),
      pinned = coalesce((p_payload->>'pinned')::boolean, false),
      status = v_status,
      published_at = v_published_at
    where id = p_id
    returning * into v_after;
  end if;

  insert into public.audit_logs (
    actor_id, actor_role, action, target_type, target_id, before_data, after_data
  ) values (
    auth.uid(),
    v_role,
    case when p_id is null then 'blog_post.create' else 'blog_post.update' end,
    'blog_post',
    v_after.id::text,
    case when p_id is null then null else to_jsonb(v_before) end,
    to_jsonb(v_after)
  );
  return v_after;
end;
$$;

create or replace function public.admin_delete_blog_post(p_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_role public.admin_role;
  v_before public.blog_posts;
begin
  v_role := public.current_admin_role();
  if v_role is null or v_role not in ('owner', 'admin', 'editor') then
    raise exception 'insufficient blog permission' using errcode = '42501';
  end if;
  delete from public.blog_posts where id = p_id returning * into v_before;
  if not found then
    raise exception 'blog post not found' using errcode = 'P0002';
  end if;
  insert into public.audit_logs (
    actor_id, actor_role, action, target_type, target_id, before_data
  ) values (
    auth.uid(), v_role, 'blog_post.delete', 'blog_post', p_id::text,
    to_jsonb(v_before)
  );
  return p_id;
end;
$$;

revoke all on function public.admin_save_blog_post(uuid, jsonb) from public;
revoke all on function public.admin_delete_blog_post(uuid) from public;
grant execute on function public.admin_save_blog_post(uuid, jsonb) to authenticated;
grant execute on function public.admin_delete_blog_post(uuid) to authenticated;

commit;
