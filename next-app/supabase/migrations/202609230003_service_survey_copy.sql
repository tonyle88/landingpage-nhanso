begin;

alter table public.service_surveys
  add column display_copy jsonb not null default '{}'::jsonb
  check (jsonb_typeof(display_copy) = 'object' and octet_length(display_copy::text) <= 12000);

comment on column public.service_surveys.display_copy is
  'Editable text displayed around survey questions and on the thank-you page.';

commit;
