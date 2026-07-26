# M4 admin authorization contract

Public signup is disabled. Admin identities are invite-only and every
authenticated user must also have exactly one row in `public.admin_roles`.
Authentication alone never grants access to the admin surface.

| Role | Content | Booking/payment/webhook | Audit | Role assignment |
|---|---|---|---|---|
| `owner` | Read/write | Read/write | Read | Yes |
| `admin` | Read/write | Read/write | Read | No |
| `editor` | Read/write | None | None | No |
| `auditor` | None | Read only | Read only | No |

`owner` is a break-glass role, not a daily account. Creating the first owner or
recovering ownership must be done by the project owner through the Supabase
Dashboard/server-only administration path, followed by verification of the
`profiles` and `admin_roles` rows. Never expose a service/secret key to the
browser and never store a manual admin token in browser storage.

Every protected page and mutation must verify the signed token with
`auth.getClaims()` and resolve the database role server-side. UI visibility is
not authorization. Role-sensitive writes remain protected by RLS.
