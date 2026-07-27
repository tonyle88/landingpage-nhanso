alter table public.blog_posts
  add column if not exists thumbnail_asset_id uuid
    references public.media_assets(id) on delete set null,
  add column if not exists thumbnail_url text;

create index if not exists blog_posts_thumbnail_asset_id_idx
  on public.blog_posts(thumbnail_asset_id)
  where thumbnail_asset_id is not null;

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
  v_media public.media_assets;
  v_thumbnail_media public.media_assets;
  v_cover_asset_id uuid := nullif(p_payload->>'cover_asset_id', '')::uuid;
  v_thumbnail_asset_id uuid := nullif(p_payload->>'thumbnail_asset_id', '')::uuid;
  v_slug text := lower(trim(coalesce(p_payload->>'slug', '')));
  v_title text := trim(coalesce(p_payload->>'title', ''));
  v_summary text := trim(coalesce(p_payload->>'summary', ''));
  v_content text := trim(coalesce(p_payload->>'content_html', ''));
  v_cover_url text := trim(coalesce(p_payload->>'cover_url', ''));
  v_thumbnail_url text := trim(coalesce(p_payload->>'thumbnail_url', ''));
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

  if v_cover_asset_id is not null then
    select * into v_media from public.media_assets
    where id = v_cover_asset_id and bucket = 'content-images'
      and is_public and public_url is not null;
    if not found then
      raise exception 'invalid blog cover media asset' using errcode = '22023';
    end if;
    v_cover_url := v_media.public_url;
  end if;

  if v_thumbnail_asset_id is not null then
    select * into v_thumbnail_media from public.media_assets
    where id = v_thumbnail_asset_id and bucket = 'content-images'
      and is_public and public_url is not null;
    if not found then
      raise exception 'invalid blog thumbnail media asset' using errcode = '22023';
    end if;
    v_thumbnail_url := v_thumbnail_media.public_url;
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
  if v_summary ~* '<[[:space:]]*(script|iframe|object|embed|style)'
    or v_summary ~* 'on[a-z]+[[:space:]]*='
    or v_summary ~* 'javascript[[:space:]]*:'
  then
    raise exception 'unsafe blog summary' using errcode = '22023';
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
  if char_length(v_thumbnail_url) > 2048
    or (v_thumbnail_url <> '' and v_thumbnail_url !~ '^https://[^[:space:]]+$')
  then
    raise exception 'invalid blog thumbnail URL' using errcode = '22023';
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
      category_id, slug, title, summary, content_html, cover_asset_id,
      cover_url, thumbnail_asset_id, thumbnail_url, pinned, status,
      published_at, author_id
    ) values (
      v_category_id, v_slug, v_title, nullif(v_summary, ''), v_content,
      v_cover_asset_id, nullif(v_cover_url, ''), v_thumbnail_asset_id,
      nullif(v_thumbnail_url, ''),
      coalesce((p_payload->>'pinned')::boolean, false),
      v_status, v_published_at, auth.uid()
    ) returning * into v_after;
  else
    select * into v_before from public.blog_posts where id = p_id for update;
    if not found then
      raise exception 'blog post not found' using errcode = 'P0002';
    end if;
    update public.blog_posts set
      category_id = v_category_id,
      slug = v_slug,
      title = v_title,
      summary = nullif(v_summary, ''),
      content_html = v_content,
      cover_asset_id = v_cover_asset_id,
      cover_url = nullif(v_cover_url, ''),
      thumbnail_asset_id = v_thumbnail_asset_id,
      thumbnail_url = nullif(v_thumbnail_url, ''),
      pinned = coalesce((p_payload->>'pinned')::boolean, false),
      status = v_status,
      published_at = v_published_at
    where id = p_id returning * into v_after;
  end if;

  insert into public.audit_logs (
    actor_id, actor_role, action, target_type, target_id, before_data, after_data
  ) values (
    auth.uid(), v_role,
    case when p_id is null then 'blog_post.create' else 'blog_post.update' end,
    'blog_post', v_after.id::text,
    case when p_id is null then null else to_jsonb(v_before) end,
    to_jsonb(v_after)
  );
  return v_after;
end;
$$;

revoke all on function public.admin_save_blog_post(uuid, jsonb) from public;
grant execute on function public.admin_save_blog_post(uuid, jsonb) to authenticated;
