begin;

insert into public.site_settings (key, value, description, is_public)
values (
  'payments.sepay_auto_confirmation',
  '{"enabled":false}'::jsonb,
  'Cho phép SePay tự động xác nhận thanh toán và chuyển lịch hẹn sang đã thanh toán.',
  false
)
on conflict (key) do nothing;

create or replace function public.admin_set_sepay_auto_confirmation(p_enabled boolean)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_role public.admin_role;
  v_before boolean := false;
begin
  v_role := public.current_admin_role();
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'insufficient payment setting permission' using errcode = '42501';
  end if;

  select coalesce((value->>'enabled')::boolean, false)
  into v_before
  from public.site_settings
  where key = 'payments.sepay_auto_confirmation';

  insert into public.site_settings (
    key, value, description, is_public, updated_by
  ) values (
    'payments.sepay_auto_confirmation',
    jsonb_build_object('enabled', p_enabled),
    'Cho phép SePay tự động xác nhận thanh toán và chuyển lịch hẹn sang đã thanh toán.',
    false,
    auth.uid()
  )
  on conflict (key) do update set
    value = excluded.value,
    description = excluded.description,
    is_public = false,
    updated_by = auth.uid();

  insert into public.audit_logs (
    actor_id, actor_role, action, target_type, target_id, before_data, after_data
  ) values (
    auth.uid(),
    v_role,
    'payment.sepay_auto_confirmation.update',
    'site_setting',
    'payments.sepay_auto_confirmation',
    jsonb_build_object('enabled', v_before),
    jsonb_build_object('enabled', p_enabled)
  );

  return p_enabled;
end;
$$;

revoke all on function public.admin_set_sepay_auto_confirmation(boolean) from public;
grant execute on function public.admin_set_sepay_auto_confirmation(boolean) to authenticated;

do $$
declare
  v_oid oid;
  v_definition text;
  v_original text;
begin
  select pg_proc.oid into v_oid
  from pg_proc
  join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
  where pg_namespace.nspname = 'public'
    and pg_proc.proname = 'admin_save_site_setting';

  v_definition := pg_get_functiondef(v_oid);
  v_original := v_definition;
  v_definition := replace(
    v_definition,
    'if v_key !~',
    'if v_key = ''payments.sepay_auto_confirmation'' and v_role not in (''owner'', ''admin'') then
    raise exception ''insufficient payment setting permission'' using errcode = ''42501'';
  end if;
  if v_key !~'
  );
  if v_definition = v_original then
    raise exception 'expected admin setting validation not found';
  end if;
  execute v_definition;

  select pg_proc.oid into v_oid
  from pg_proc
  join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
  where pg_namespace.nspname = 'public'
    and pg_proc.proname = 'admin_delete_site_setting';

  v_definition := pg_get_functiondef(v_oid);
  v_original := v_definition;
  v_definition := replace(
    v_definition,
    'delete from public.site_settings',
    'if v_key = ''payments.sepay_auto_confirmation'' then
    raise exception ''protected operational setting'' using errcode = ''42501'';
  end if;
  delete from public.site_settings'
  );
  if v_definition = v_original then
    raise exception 'expected admin setting delete statement not found';
  end if;
  execute v_definition;
end;
$$;

do $$
declare
  v_oid oid;
  v_definition text;
  v_original text;
begin
  select pg_proc.oid into v_oid
  from pg_proc
  join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
  where pg_namespace.nspname = 'public'
    and pg_proc.proname = 'process_sepay_webhook'
    and pg_get_function_identity_arguments(pg_proc.oid)
      = 'p_payload jsonb, p_payload_sha256 text, p_signature_timestamp bigint, p_expected_account_number text';

  if v_oid is null then
    raise exception 'process_sepay_webhook function not found';
  end if;

  v_definition := pg_get_functiondef(v_oid);
  v_original := v_definition;
  v_definition := replace(
    v_definition,
    'v_reason text;',
    'v_reason text;
  v_auto_confirmation boolean := false;'
  );
  v_definition := replace(
    v_definition,
    'insert into public.payment_transactions (',
    'select coalesce((value->>''enabled'')::boolean, false)
  into v_auto_confirmation
  from public.site_settings
  where key = ''payments.sepay_auto_confirmation'';

  if v_reason is null and not coalesce(v_auto_confirmation, false) then
    v_reason := ''manual_confirmation_required'';
  end if;

  insert into public.payment_transactions ('
  );

  if v_definition = v_original
    or position('manual_confirmation_required' in v_definition) = 0
  then
    raise exception 'expected SePay webhook insertion point not found';
  end if;
  execute v_definition;
end;
$$;

commit;
