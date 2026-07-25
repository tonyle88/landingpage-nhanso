begin;

do $$
declare
  v_oid oid;
  v_definition text;
  v_original text;
begin
  select pg_proc.oid
  into v_oid
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
    'case when v_reason is null then ''paid'' else ''ignored'' end,',
    '(case when v_reason is null then ''paid'' else ''ignored'' end)::public.payment_status,'
  );

  if v_definition = v_original then
    if position('::public.payment_status' in v_definition) > 0
      and position('v_reason is null' in v_definition) > 0
    then
      return;
    end if;
    raise exception 'expected SePay payment status expression not found';
  end if;

  execute v_definition;
end;
$$;

commit;
