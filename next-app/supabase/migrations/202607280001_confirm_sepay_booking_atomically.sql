begin;

do $migration$
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
    'update public.bookings
    set status = ''paid'', updated_at = now()
    where id = v_booking.id;',
    'update public.bookings
    set
      status = ''confirmed'',
      confirmed_at = coalesce(confirmed_at, now()),
      updated_at = now()
    where id = v_booking.id;'
  );
  v_definition := replace(
    v_definition,
    '    update public.webhook_events
    set status = ''processed'', processed_at = now(), error_message = null
    where id = v_event.id;',
    '    insert into public.audit_logs (
      action,
      target_type,
      target_id,
      before_data,
      after_data
    ) values (
      ''booking.sepay_auto_confirmed'',
      ''booking'',
      v_booking.id::text,
      jsonb_build_object(''status'', ''paid''),
      jsonb_build_object(''status'', ''confirmed'')
    );

    update public.webhook_events
    set status = ''processed'', processed_at = now(), error_message = null
    where id = v_event.id;'
  );

  if v_definition = v_original
    or position('status = ''confirmed''' in v_definition) = 0
    or position('booking.sepay_auto_confirmed' in v_definition) = 0
  then
    raise exception 'expected SePay confirmation insertion points not found';
  end if;

  execute v_definition;
end;
$migration$;

notify pgrst, 'reload schema';

commit;
