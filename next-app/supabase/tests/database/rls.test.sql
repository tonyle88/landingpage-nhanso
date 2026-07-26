begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', 'regular@example.test', now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'editor@example.test', now(), now()),
  ('10000000-0000-0000-0000-000000000003', 'auditor@example.test', now(), now()),
  ('10000000-0000-0000-0000-000000000004', 'admin@example.test', now(), now());

insert into public.profiles (id, display_name)
values
  ('10000000-0000-0000-0000-000000000001', 'Synthetic Regular'),
  ('10000000-0000-0000-0000-000000000002', 'Synthetic Editor'),
  ('10000000-0000-0000-0000-000000000003', 'Synthetic Auditor'),
  ('10000000-0000-0000-0000-000000000004', 'Synthetic Admin');

insert into public.admin_roles (user_id, role)
values
  ('10000000-0000-0000-0000-000000000002', 'editor'),
  ('10000000-0000-0000-0000-000000000003', 'auditor'),
  ('10000000-0000-0000-0000-000000000004', 'admin');

insert into public.packages
  (code, name, online_price, enabled)
values
  ('RLS-PUBLIC', 'Synthetic public package', 100000, true),
  ('RLS-HIDDEN', 'Synthetic hidden package', 100000, false);

insert into public.blog_posts
  (slug, title, content_html, status)
values
  ('rls-draft', 'Synthetic draft', '<p>Test only</p>', 'draft');

insert into public.bookings
  (public_id, customer_name, phone, email, consultation_type, package_code,
   package_name, amount, slot_start, slot_end)
values
  ('RLS-BOOKING-1', 'Synthetic Customer', '0000000000',
   'customer@example.test', 'online', 'RLS-PUBLIC',
   'Synthetic public package', 100000, now() + interval '1 day',
   now() + interval '1 day 1 hour');

set local role anon;

select results_eq(
  $$select count(*)::bigint from public.packages where code like 'RLS-%'$$,
  array[1::bigint],
  'anon sees only enabled packages'
);
select throws_ok(
  $$select * from public.bookings$$,
  '42501',
  'permission denied for table bookings',
  'anon has no booking read grant'
);
select throws_ok(
  $$insert into public.bookings
    (public_id, customer_name, phone, email, consultation_type, package_code,
     package_name, amount, slot_start, slot_end)
    values ('RLS-DENIED', 'Denied', '0000000000', 'denied@example.test',
      'online', 'RLS-PUBLIC', 'Synthetic public package', 1, now(),
      now() + interval '1 hour')$$,
  '42501',
  'permission denied for table bookings',
  'anon cannot create bookings directly'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select results_eq(
  $$select count(*)::bigint from public.bookings$$,
  array[0::bigint],
  'regular authenticated user cannot read bookings'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select results_eq(
  $$select count(*)::bigint from public.blog_posts where slug = 'rls-draft'$$,
  array[1::bigint],
  'editor can read draft posts'
);
select lives_ok(
  $$insert into public.packages (code, name, online_price)
    values ('RLS-EDITOR', 'Editor package', 100000)$$,
  'editor can create content'
);
select results_eq(
  $$select count(*)::bigint from public.bookings$$,
  array[0::bigint],
  'editor cannot read bookings'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000003',
  true
);
set local role authenticated;

select results_eq(
  $$select count(*)::bigint from public.bookings$$,
  array[1::bigint],
  'auditor can read bookings'
);
select results_eq(
  $$with changed as (
      update public.bookings set status = 'confirmed'
      where public_id = 'RLS-BOOKING-1' returning 1
    ) select count(*)::bigint from changed$$,
  array[0::bigint],
  'auditor cannot update bookings'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000004',
  true
);
set local role authenticated;

select results_eq(
  $$select count(*)::bigint from public.bookings$$,
  array[1::bigint],
  'admin can read bookings'
);
select results_eq(
  $$with changed as (
      update public.bookings set status = 'confirmed'
      where public_id = 'RLS-BOOKING-1' returning 1
    ) select count(*)::bigint from changed$$,
  array[1::bigint],
  'admin can update bookings'
);

reset role;
select * from finish();
rollback;
