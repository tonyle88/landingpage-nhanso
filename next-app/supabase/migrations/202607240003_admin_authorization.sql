begin;

create or replace function public.current_admin_role()
returns public.admin_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.admin_roles
  where user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_admin_role() from public;
grant execute on function public.current_admin_role() to authenticated;

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_owner_admin_all" on public.profiles for all to authenticated
  using (public.has_admin_role(array['owner','admin']::public.admin_role[]))
  with check (public.has_admin_role(array['owner','admin']::public.admin_role[]));

drop policy if exists "admin_roles_admin_all" on public.admin_roles;
create policy "admin_roles_self_read" on public.admin_roles for select to authenticated
  using (user_id = auth.uid());
create policy "admin_roles_owner_all" on public.admin_roles for all to authenticated
  using (public.has_admin_role(array['owner']::public.admin_role[]))
  with check (public.has_admin_role(array['owner']::public.admin_role[]));

drop policy if exists "site_settings_admin_editor_all" on public.site_settings;
create policy "site_settings_content_manager_all" on public.site_settings for all to authenticated
  using (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]))
  with check (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]));

drop policy if exists "landing_sections_admin_editor_all" on public.landing_sections;
create policy "landing_sections_content_manager_all" on public.landing_sections for all to authenticated
  using (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]))
  with check (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]));

drop policy if exists "packages_admin_editor_all" on public.packages;
create policy "packages_content_manager_all" on public.packages for all to authenticated
  using (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]))
  with check (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]));

drop policy if exists "media_assets_admin_editor_all" on public.media_assets;
create policy "media_assets_content_manager_all" on public.media_assets for all to authenticated
  using (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]))
  with check (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]));

drop policy if exists "testimonials_admin_editor_all" on public.testimonials;
create policy "testimonials_content_manager_all" on public.testimonials for all to authenticated
  using (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]))
  with check (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]));

drop policy if exists "blog_categories_admin_editor_all" on public.blog_categories;
create policy "blog_categories_content_manager_all" on public.blog_categories for all to authenticated
  using (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]))
  with check (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]));

drop policy if exists "blog_posts_admin_editor_all" on public.blog_posts;
create policy "blog_posts_content_manager_all" on public.blog_posts for all to authenticated
  using (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]))
  with check (public.has_admin_role(array['owner','admin','editor']::public.admin_role[]));

drop policy if exists "bookings_admin_auditor_read" on public.bookings;
create policy "bookings_operations_read" on public.bookings for select to authenticated
  using (public.has_admin_role(array['owner','admin','auditor']::public.admin_role[]));
drop policy if exists "bookings_admin_all" on public.bookings;
create policy "bookings_operations_all" on public.bookings for all to authenticated
  using (public.has_admin_role(array['owner','admin']::public.admin_role[]))
  with check (public.has_admin_role(array['owner','admin']::public.admin_role[]));

drop policy if exists "payment_transactions_admin_auditor_read" on public.payment_transactions;
create policy "payment_transactions_operations_read" on public.payment_transactions for select to authenticated
  using (public.has_admin_role(array['owner','admin','auditor']::public.admin_role[]));
drop policy if exists "payment_transactions_admin_all" on public.payment_transactions;
create policy "payment_transactions_operations_all" on public.payment_transactions for all to authenticated
  using (public.has_admin_role(array['owner','admin']::public.admin_role[]))
  with check (public.has_admin_role(array['owner','admin']::public.admin_role[]));

drop policy if exists "webhook_events_admin_auditor_read" on public.webhook_events;
create policy "webhook_events_operations_read" on public.webhook_events for select to authenticated
  using (public.has_admin_role(array['owner','admin','auditor']::public.admin_role[]));
drop policy if exists "webhook_events_admin_all" on public.webhook_events;
create policy "webhook_events_operations_all" on public.webhook_events for all to authenticated
  using (public.has_admin_role(array['owner','admin']::public.admin_role[]))
  with check (public.has_admin_role(array['owner','admin']::public.admin_role[]));

drop policy if exists "audit_logs_admin_auditor_read" on public.audit_logs;
create policy "audit_logs_privileged_read" on public.audit_logs for select to authenticated
  using (public.has_admin_role(array['owner','admin','auditor']::public.admin_role[]));
drop policy if exists "audit_logs_admin_insert" on public.audit_logs;
create policy "audit_logs_privileged_insert" on public.audit_logs for insert to authenticated
  with check (public.has_admin_role(array['owner','admin']::public.admin_role[]));

commit;
