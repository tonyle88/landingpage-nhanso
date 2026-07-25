# SePay reconciliation runbook

This procedure is for `owner` and `admin` operators. Auditors may inspect the
same records but must not change booking state.

## When an alert appears

1. Open **Admin → Đối soát thanh toán** and record the SePay transaction ID,
   payment code, amount, reason, and received time. Do not copy raw webhook
   payloads into chat, tickets, or logs.
2. Open the transaction in SePay or the receiving bank account. Confirm that it
   is an incoming, settled transaction to the configured account.
3. Match the transfer content/payment code to exactly one booking. Confirm the
   amount equals the trusted amount stored on that booking.
4. If all checks pass, open **Admin → Lịch hẹn** and use **Đã xác nhận tiền**.
   The existing state machine and audit log must record this action. Then use
   **Đã xác nhận lịch** only after the appointment itself is accepted.
5. If account, amount, code, or settlement cannot be proven, leave the booking
   unchanged. Contact the customer using the approved support process.

## Common alert reasons

- `booking_not_found`: the transfer code did not match a booking.
- `amount_mismatch`: the received amount differs from the trusted booking amount.
- `account_mismatch`: the callback account differs from the server configuration.
- `booking_not_held`: the booking is expired, cancelled, paid, or confirmed.
- `outbound_transfer`: the callback was not an incoming transfer.

## Recovery and escalation

- A replay with the same SePay transaction ID must not create another payment.
- Never edit `webhook_events`, `payment_transactions`, or booking status directly.
- For a suspected forged callback or secret exposure, disable the Supabase
  cutover flag, disable the SePay webhook, rotate the HMAC secret in SePay and
  the deployment secret manager, then run tamper/replay verification again.
- Review ignored/failed events daily during cutover. Escalate unresolved events
  before their booking hold expires.
