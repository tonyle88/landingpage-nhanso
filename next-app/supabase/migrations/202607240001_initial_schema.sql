begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.admin_role as enum ('admin', 'editor', 'auditor');
create type public.content_status as enum ('draft', 'published', 'archived');
create type public.booking_status as enum ('pending', 'held', 'paid', 'confirmed', 'cancelled', 'expired');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'ignored');
create type public.webhook_status as enum ('received', 'processed', 'ignored', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.admin_role not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table public.site_settings (
  key citext primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  is_public boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.landing_sections (
  id uuid primary key default gen_random_uuid(),
  section_key citext not null unique,
  section_type text not null default 'generic'
    check (section_type in ('builtin', 'generic')),
  display_name text not null,
  title text,
  eyebrow text,
  content_html text,
  enabled boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  code citext not null unique,
  name text not null,
  online_price bigint check (online_price >= 0),
  offline_price bigint check (offline_price >= 0),
  currency char(3) not null default 'VND',
  unit text,
  icon text,
  accent_color text,
  featured boolean not null default false,
  badge text,
  features jsonb not null default '[]'::jsonb
    check (jsonb_typeof(features) = 'array'),
  button_text text,
  enabled boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (online_price is not null or offline_price is not null)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  object_path text not null,
  public_url text,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  alt_text text,
  is_public boolean not null default false,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bucket, object_path)
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid references public.media_assets(id) on delete set null,
  image_url text,
  alt_text text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (media_asset_id is not null or image_url is not null)
);

create table public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  name text not null,
  description text,
  enabled boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.blog_categories(id) on delete set null,
  slug citext not null unique,
  title text not null,
  summary text,
  content_html text not null,
  cover_asset_id uuid references public.media_assets(id) on delete set null,
  cover_url text,
  pinned boolean not null default false,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  customer_name text not null,
  date_of_birth date,
  phone text not null,
  email citext not null,
  consultation_type text not null check (consultation_type in ('online', 'offline')),
  package_id uuid references public.packages(id) on delete set null,
  package_code text not null,
  package_name text not null,
  amount bigint not null check (amount >= 0),
  currency char(3) not null default 'VND',
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  concern text,
  payment_provider text,
  payment_order_id text unique,
  status public.booking_status not null default 'pending',
  hold_expires_at timestamptz,
  calendar_event_id text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slot_end > slot_start)
);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  provider text not null,
  provider_transaction_id text,
  order_id text not null,
  amount bigint not null check (amount >= 0),
  currency char(3) not null default 'VND',
  status public.payment_status not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_transaction_id)
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text,
  signature_valid boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  status public.webhook_status not null default 'received',
  attempts integer not null default 0 check (attempts >= 0),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role public.admin_role,
  action text not null,
  target_type text,
  target_id text,
  status text not null default 'success' check (status in ('success', 'failure')),
  message text,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index landing_sections_public_order_idx
  on public.landing_sections (sort_order, section_key) where enabled;
create index packages_public_order_idx
  on public.packages (sort_order, code) where enabled;
create index testimonials_public_order_idx
  on public.testimonials (sort_order, created_at) where enabled;
create index blog_categories_public_order_idx
  on public.blog_categories (sort_order, slug) where enabled;
create index blog_posts_public_idx
  on public.blog_posts (pinned desc, published_at desc) where status = 'published';
create index blog_posts_category_idx on public.blog_posts (category_id, published_at desc);
create index bookings_slot_idx on public.bookings (slot_start, slot_end);
create index bookings_status_idx on public.bookings (status, created_at desc);
create index payment_transactions_booking_idx
  on public.payment_transactions (booking_id, created_at desc);
create index payment_transactions_order_idx
  on public.payment_transactions (provider, order_id);
create index webhook_events_status_idx
  on public.webhook_events (status, received_at);
create index audit_logs_target_idx
  on public.audit_logs (target_type, target_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.has_admin_role(required_roles public.admin_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_roles
    where user_id = auth.uid()
      and role = any(required_roles)
  );
$$;

revoke all on function public.has_admin_role(public.admin_role[]) from public;
grant execute on function public.has_admin_role(public.admin_role[]) to authenticated;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger site_settings_set_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();
create trigger landing_sections_set_updated_at before update on public.landing_sections
  for each row execute function public.set_updated_at();
create trigger packages_set_updated_at before update on public.packages
  for each row execute function public.set_updated_at();
create trigger testimonials_set_updated_at before update on public.testimonials
  for each row execute function public.set_updated_at();
create trigger blog_categories_set_updated_at before update on public.blog_categories
  for each row execute function public.set_updated_at();
create trigger blog_posts_set_updated_at before update on public.blog_posts
  for each row execute function public.set_updated_at();
create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.admin_roles enable row level security;
alter table public.site_settings enable row level security;
alter table public.landing_sections enable row level security;
alter table public.packages enable row level security;
alter table public.media_assets enable row level security;
alter table public.testimonials enable row level security;
alter table public.blog_categories enable row level security;
alter table public.blog_posts enable row level security;
alter table public.bookings enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.webhook_events enable row level security;
alter table public.audit_logs enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.site_settings, public.landing_sections, public.packages,
  public.media_assets, public.testimonials, public.blog_categories,
  public.blog_posts to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

create policy "profiles_self_read" on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "profiles_self_update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_admin_all" on public.profiles for all to authenticated
  using (public.has_admin_role(array['admin']::public.admin_role[]))
  with check (public.has_admin_role(array['admin']::public.admin_role[]));

create policy "admin_roles_admin_all" on public.admin_roles for all to authenticated
  using (public.has_admin_role(array['admin']::public.admin_role[]))
  with check (public.has_admin_role(array['admin']::public.admin_role[]));

create policy "site_settings_public_read" on public.site_settings for select
  to anon, authenticated using (is_public);
create policy "site_settings_admin_editor_all" on public.site_settings for all to authenticated
  using (public.has_admin_role(array['admin','editor']::public.admin_role[]))
  with check (public.has_admin_role(array['admin','editor']::public.admin_role[]));

create policy "landing_sections_public_read" on public.landing_sections for select
  to anon, authenticated using (enabled);
create policy "landing_sections_admin_editor_all" on public.landing_sections for all to authenticated
  using (public.has_admin_role(array['admin','editor']::public.admin_role[]))
  with check (public.has_admin_role(array['admin','editor']::public.admin_role[]));

create policy "packages_public_read" on public.packages for select
  to anon, authenticated using (enabled);
create policy "packages_admin_editor_all" on public.packages for all to authenticated
  using (public.has_admin_role(array['admin','editor']::public.admin_role[]))
  with check (public.has_admin_role(array['admin','editor']::public.admin_role[]));

create policy "media_assets_public_read" on public.media_assets for select
  to anon, authenticated using (is_public);
create policy "media_assets_admin_editor_all" on public.media_assets for all to authenticated
  using (public.has_admin_role(array['admin','editor']::public.admin_role[]))
  with check (public.has_admin_role(array['admin','editor']::public.admin_role[]));

create policy "testimonials_public_read" on public.testimonials for select
  to anon, authenticated using (enabled);
create policy "testimonials_admin_editor_all" on public.testimonials for all to authenticated
  using (public.has_admin_role(array['admin','editor']::public.admin_role[]))
  with check (public.has_admin_role(array['admin','editor']::public.admin_role[]));

create policy "blog_categories_public_read" on public.blog_categories for select
  to anon, authenticated using (enabled);
create policy "blog_categories_admin_editor_all" on public.blog_categories for all to authenticated
  using (public.has_admin_role(array['admin','editor']::public.admin_role[]))
  with check (public.has_admin_role(array['admin','editor']::public.admin_role[]));

create policy "blog_posts_public_read" on public.blog_posts for select
  to anon, authenticated
  using (status = 'published' and published_at <= now());
create policy "blog_posts_admin_editor_all" on public.blog_posts for all to authenticated
  using (public.has_admin_role(array['admin','editor']::public.admin_role[]))
  with check (public.has_admin_role(array['admin','editor']::public.admin_role[]));

create policy "bookings_admin_auditor_read" on public.bookings for select to authenticated
  using (public.has_admin_role(array['admin','auditor']::public.admin_role[]));
create policy "bookings_admin_all" on public.bookings for all to authenticated
  using (public.has_admin_role(array['admin']::public.admin_role[]))
  with check (public.has_admin_role(array['admin']::public.admin_role[]));

create policy "payment_transactions_admin_auditor_read"
  on public.payment_transactions for select to authenticated
  using (public.has_admin_role(array['admin','auditor']::public.admin_role[]));
create policy "payment_transactions_admin_all"
  on public.payment_transactions for all to authenticated
  using (public.has_admin_role(array['admin']::public.admin_role[]))
  with check (public.has_admin_role(array['admin']::public.admin_role[]));

create policy "webhook_events_admin_auditor_read"
  on public.webhook_events for select to authenticated
  using (public.has_admin_role(array['admin','auditor']::public.admin_role[]));
create policy "webhook_events_admin_all"
  on public.webhook_events for all to authenticated
  using (public.has_admin_role(array['admin']::public.admin_role[]))
  with check (public.has_admin_role(array['admin']::public.admin_role[]));

create policy "audit_logs_admin_auditor_read"
  on public.audit_logs for select to authenticated
  using (public.has_admin_role(array['admin','auditor']::public.admin_role[]));
create policy "audit_logs_admin_insert"
  on public.audit_logs for insert to authenticated
  with check (public.has_admin_role(array['admin']::public.admin_role[]));

commit;
