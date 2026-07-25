begin;

alter table public.webhook_events
  add column if not exists payload_sha256 text,
  add column if not exists signature_timestamp timestamptz;

create or replace function public.process_sepay_webhook(
  p_payload jsonb,
  p_payload_sha256 text,
  p_signature_timestamp bigint,
  p_expected_account_number text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id text := btrim(coalesce(p_payload->>'id', ''));
  v_transfer_type text := lower(btrim(coalesce(p_payload->>'transferType', '')));
  v_account_number text := btrim(coalesce(p_payload->>'accountNumber', ''));
  v_expected_account text := btrim(coalesce(p_expected_account_number, ''));
  v_order_id text := upper(btrim(coalesce(p_payload->>'code', '')));
  v_content text := upper(coalesce(p_payload->>'content', ''));
  v_amount bigint;
  v_event public.webhook_events;
  v_booking public.bookings;
  v_transaction public.payment_transactions;
  v_occurred_at timestamptz;
  v_reason text;
begin
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid webhook payload' using errcode = '22023';
  end if;
  if v_event_id !~ '^[0-9]{1,40}$' then
    raise exception 'invalid webhook transaction id' using errcode = '22023';
  end if;
  if p_payload_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid webhook payload hash' using errcode = '22023';
  end if;
  if p_signature_timestamp <= 0 then
    raise exception 'invalid webhook signature timestamp' using errcode = '22023';
  end if;
  if v_expected_account = '' then
    raise exception 'expected account is not configured' using errcode = '22023';
  end if;
  if coalesce(p_payload->>'transferAmount', '') !~ '^[0-9]{1,18}$' then
    raise exception 'invalid webhook transfer amount' using errcode = '22023';
  end if;
  v_amount := (p_payload->>'transferAmount')::bigint;
  if v_amount <= 0 then
    raise exception 'invalid webhook transfer amount' using errcode = '22023';
  end if;

  insert into public.webhook_events (
    provider,
    event_id,
    event_type,
    signature_valid,
    payload,
    payload_sha256,
    signature_timestamp,
    status,
    attempts
  ) values (
    'sepay',
    v_event_id,
    'bank_transfer',
    true,
    p_payload,
    p_payload_sha256,
    to_timestamp(p_signature_timestamp),
    'received',
    1
  )
  on conflict (provider, event_id) do update
  set attempts = public.webhook_events.attempts + 1
  returning * into v_event;

  if v_event.payload_sha256 <> p_payload_sha256 then
    raise exception 'webhook transaction payload mismatch'
      using errcode = '22023';
  end if;
  if v_event.status <> 'received' then
    return jsonb_build_object(
      'processed', v_event.status = 'processed',
      'duplicate', true,
      'status', v_event.status
    );
  end if;

  if v_transfer_type <> 'in' then
    v_reason := 'outbound_transfer';
  elsif v_account_number <> v_expected_account then
    v_reason := 'account_mismatch';
  else
    if v_order_id <> '' then
      select * into v_booking
      from public.bookings
      where payment_order_id = v_order_id
      for update;
    end if;

    if v_booking.id is null and v_content <> '' then
      select * into v_booking
      from public.bookings
      where payment_order_id is not null
        and position(upper(payment_order_id) in v_content) > 0
      order by length(payment_order_id) desc
      limit 1
      for update;
    end if;

    if v_booking.id is null then
      v_reason := 'booking_not_found';
    elsif v_booking.amount <> v_amount then
      v_reason := 'amount_mismatch';
    elsif v_booking.status <> 'held' then
      v_reason := 'booking_not_held';
    else
      v_order_id := v_booking.payment_order_id;
    end if;
  end if;

  if coalesce(p_payload->>'transactionDate', '')
    ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$'
  then
    begin
      v_occurred_at := (p_payload->>'transactionDate')::timestamp
        at time zone 'Asia/Ho_Chi_Minh';
    exception when others then
      v_occurred_at := null;
    end;
  end if;

  insert into public.payment_transactions (
    booking_id,
    provider,
    provider_transaction_id,
    order_id,
    amount,
    currency,
    status,
    payload,
    occurred_at
  ) values (
    v_booking.id,
    'sepay',
    v_event_id,
    coalesce(nullif(v_order_id, ''), 'UNMATCHED'),
    v_amount,
    'VND',
    (case when v_reason is null then 'paid' else 'ignored' end)
      ::public.payment_status,
    jsonb_build_object(
      'gateway', left(coalesce(p_payload->>'gateway', ''), 80),
      'referenceCode', left(coalesce(p_payload->>'referenceCode', ''), 120)
    ),
    v_occurred_at
  )
  returning * into v_transaction;

  if v_reason is null then
    update public.bookings
    set status = 'paid', updated_at = now()
    where id = v_booking.id;

    insert into public.audit_logs (
      action,
      target_type,
      target_id,
      before_data,
      after_data
    ) values (
      'booking.payment_verified',
      'booking',
      v_booking.id::text,
      jsonb_build_object('status', 'held'),
      jsonb_build_object(
        'status', 'paid',
        'provider', 'sepay',
        'transaction_id', v_event_id
      )
    );

    update public.webhook_events
    set status = 'processed', processed_at = now(), error_message = null
    where id = v_event.id;
    return jsonb_build_object(
      'processed', true,
      'duplicate', false,
      'status', 'processed'
    );
  end if;

  update public.webhook_events
  set
    status = 'ignored',
    processed_at = now(),
    error_message = v_reason
  where id = v_event.id;
  return jsonb_build_object(
    'processed', false,
    'duplicate', false,
    'status', 'ignored',
    'reason', v_reason
  );
exception
  when unique_violation then
    select * into v_transaction
    from public.payment_transactions
    where provider = 'sepay'
      and provider_transaction_id = v_event_id;
    return jsonb_build_object(
      'processed', v_transaction.status = 'paid',
      'duplicate', true,
      'status', case
        when v_transaction.status = 'paid' then 'processed'
        else 'ignored'
      end
    );
end;
$$;

revoke all on function public.process_sepay_webhook(
  jsonb, text, bigint, text
) from public;
grant execute on function public.process_sepay_webhook(
  jsonb, text, bigint, text
) to service_role;

commit;
