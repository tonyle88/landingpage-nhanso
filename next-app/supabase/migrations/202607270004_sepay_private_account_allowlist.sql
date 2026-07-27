begin;

insert into public.site_settings (key, value, description, is_public)
values (
  'payments.sepay_expected_accounts',
  '[]'::jsonb,
  'Danh sách tài khoản ngân hàng hoặc tài khoản ảo SePay được phép nhận thanh toán.',
  false
)
on conflict (key) do nothing;

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
    'v_expected_account text := btrim(coalesce(p_expected_account_number, ''''));',
    'v_expected_account text := btrim(coalesce(p_expected_account_number, ''''));
  v_expected_accounts jsonb := ''[]''::jsonb;'
  );
  v_definition := replace(
    v_definition,
    'if v_expected_account = '''' then',
    'select value into v_expected_accounts
  from public.site_settings
  where key = ''payments.sepay_expected_accounts''
    and jsonb_typeof(value) = ''array'';
  v_expected_accounts := coalesce(v_expected_accounts, ''[]''::jsonb);

  if v_expected_account = '''' and jsonb_array_length(v_expected_accounts) = 0 then'
  );
  v_definition := replace(
    v_definition,
    'elsif v_account_number <> v_expected_account
    and v_sub_account <> v_expected_account then',
    'elsif v_account_number <> v_expected_account
    and v_sub_account <> v_expected_account
    and not (v_expected_accounts ? v_account_number)
    and not (v_expected_accounts ? v_sub_account) then'
  );

  if v_definition = v_original
    or position('payments.sepay_expected_accounts' in v_definition) = 0
    or position('v_expected_accounts ? v_sub_account' in v_definition) = 0
  then
    raise exception 'expected SePay private account allowlist was not installed';
  end if;

  execute v_definition;
end;
$$;

commit;
