begin;

insert into public.site_settings (key, value, description, is_public)
values (
  'admin.numerology_history_limit',
  '{"limit": 50}'::jsonb,
  'Số hồ sơ nhân số học gần nhất được giữ trong kho riêng tư (20-1000).',
  false
)
on conflict (key) do nothing;

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'numerology-exports',
  'numerology-exports',
  false,
  12582912,
  array['application/pdf', 'image/jpeg']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.numerology_records (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 2 and 160),
  normalized_name text not null check (char_length(normalized_name) between 2 and 180),
  birth_date date not null check (birth_date >= date '1900-01-01' and birth_date <= current_date),
  result_data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(result_data) = 'object' and octet_length(result_data::text) <= 200000),
  full_pdf_path text not null check (full_pdf_path ~ '^records/[0-9a-f-]{36}/full\.pdf$'),
  a4_image_path text not null check (a4_image_path ~ '^records/[0-9a-f-]{36}/a4\.jpg$'),
  pdf_byte_size bigint not null default 0 check (pdf_byte_size between 1 and 12582912),
  image_byte_size bigint not null default 0 check (image_byte_size between 1 and 5242880),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_name, birth_date)
);

create index if not exists numerology_records_recent_idx
  on public.numerology_records (updated_at desc, id desc);

alter table public.numerology_records enable row level security;

drop policy if exists "numerology_records_admin_read" on public.numerology_records;
create policy "numerology_records_admin_read"
  on public.numerology_records for select to authenticated
  using (public.current_admin_role() is not null);

drop policy if exists "numerology_records_content_manager_write" on public.numerology_records;
create policy "numerology_records_content_manager_write"
  on public.numerology_records for all to authenticated
  using (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]))
  with check (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]));

revoke all on public.numerology_records from public, anon;
grant select on public.numerology_records to authenticated;
grant select, insert, update, delete on public.numerology_records to service_role;

commit;
