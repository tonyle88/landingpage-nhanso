begin;

update public.site_settings
set description = 'Số hồ sơ nhân số học gần nhất được giữ riêng cho mỗi tài khoản (20-1000).'
where key = 'admin.numerology_history_limit';

-- Each signed-in admin owns an independent numerology archive. Existing rows
-- keep their current owner; rows without an owner remain invisible to users.
drop policy if exists "numerology_records_admin_read" on public.numerology_records;
create policy "numerology_records_owner_read"
  on public.numerology_records for select to authenticated
  using (
    public.current_admin_role() is not null
    and created_by = auth.uid()
  );

drop policy if exists "numerology_records_content_manager_write" on public.numerology_records;
create policy "numerology_records_owner_write"
  on public.numerology_records for all to authenticated
  using (
    created_by = auth.uid()
    and public.has_admin_role(array['owner','admin','editor']::public.admin_role[])
  )
  with check (
    created_by = auth.uid()
    and public.has_admin_role(array['owner','admin','editor']::public.admin_role[])
  );

alter table public.numerology_records
  drop constraint if exists numerology_records_normalized_name_birth_date_key;

create unique index if not exists numerology_records_owner_customer_key
  on public.numerology_records (created_by, normalized_name, birth_date);

drop index if exists public.numerology_records_report_number_key;
create unique index if not exists numerology_records_owner_report_number_key
  on public.numerology_records (created_by, report_number);

create index if not exists numerology_records_owner_recent_idx
  on public.numerology_records (created_by, updated_at desc, id desc);

alter table public.numerology_records
  drop constraint if exists numerology_records_full_pdf_path_check,
  drop constraint if exists numerology_records_a4_image_path_check;

alter table public.numerology_records
  add constraint numerology_records_full_pdf_path_check check (
    full_pdf_path = 'records/' || id::text || '/full.pdf'
    or (
      created_by is not null
      and full_pdf_path = 'users/' || created_by::text || '/records/' || id::text || '/full.pdf'
    )
  ),
  add constraint numerology_records_a4_image_path_check check (
    a4_image_path = 'records/' || id::text || '/a4.jpg'
    or (
      created_by is not null
      and a4_image_path = 'users/' || created_by::text || '/records/' || id::text || '/a4.jpg'
    )
  );

comment on table public.numerology_records is
  'Private per-user numerology archive. Every authenticated admin can access only rows they created.';

commit;
