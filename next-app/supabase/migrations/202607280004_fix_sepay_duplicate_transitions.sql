begin;

do $migration$
declare
  v_oid oid;
  v_definition text;
  v_original text;
  v_duplicate_transitions text := 'update public.bookings
    set status = ''paid'', updated_at = now()
    where id = v_booking.id;

    update public.bookings
    set
      status = ''confirmed'',
      confirmed_at = coalesce(confirmed_at, now()),
      updated_at = now()
    where id = v_booking.id;

    update public.bookings
    set status = ''paid'', updated_at = now()
    where id = v_booking.id;

    update public.bookings
    set
      status = ''confirmed'',
      confirmed_at = coalesce(confirmed_at, now()),
      updated_at = now()
    where id = v_booking.id;';
  v_canonical_transitions text := 'update public.bookings
    set status = ''paid'', updated_at = now()
    where id = v_booking.id;

    update public.bookings
    set
      status = ''confirmed'',
      confirmed_at = coalesce(confirmed_at, now()),
      updated_at = now()
    where id = v_booking.id;';
  v_duplicate_audits text := 'insert into public.audit_logs (
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

    insert into public.audit_logs (
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
    );';
  v_canonical_audit text := 'insert into public.audit_logs (
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
    );';
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
    v_duplicate_transitions,
    v_canonical_transitions
  );
  v_definition := replace(
    v_definition,
    v_duplicate_audits,
    v_canonical_audit
  );

  if v_definition = v_original
    or position(v_duplicate_transitions in v_definition) > 0
    or position(v_duplicate_audits in v_definition) > 0
    or position(v_canonical_transitions in v_definition) = 0
    or (
      length(v_definition)
      - length(replace(
        v_definition,
        'booking.sepay_auto_confirmed',
        ''
      ))
    ) <> length('booking.sepay_auto_confirmed')
  then
    raise exception 'expected duplicate SePay transitions were not repaired';
  end if;

  execute v_definition;
end;
$migration$;

notify pgrst, 'reload schema';

commit;
