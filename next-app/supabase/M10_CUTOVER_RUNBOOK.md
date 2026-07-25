# M10 Cutover and Rollback Runbook

## Trang thai va pham vi

- Trang thai: Phase A preparation only.
- M9 dang `DEFERRED - OWNER ACCEPTED RESIDUAL RISK`, khong phai `PASS`.
- Ket qua security so bo con 3 Medium va 4 Low; chua ghi nhan P0/P1.
- Khong thao tac production, DNS, custom domain, webhook ngan hang that hoac
  gia tri secret trong Phase A.

## Release candidate

- HEAD tham chieu khi lap runbook:
  `4c21c2a0f0d002fc01d41b30ac3aa1fdc4ceed18`.
- Branch: `codex/nextjs-supabase-migration`.
- SHA tren chua duoc chot lam release candidate vi working tree dang co thay
  doi ke hoach M10 va cac file PDF/anh ca nhan cua owner.
- Chi ghi nhan release-candidate SHA sau khi co mot commit sach, review dung
  pham vi va xac nhan khong dua PDF/anh ca nhan vao Git.

## Phase A - read-only preparation

- [ ] Ghi deployment ID va Vercel hostname cua release candidate.
- [ ] Ghi hostname deployment cu dung cho rollback.
- [ ] Xuat DNS truoc cutover; khong ghi token/cookie vao artifact.
- [ ] Chot cua so cutover, owner thuc hien va owner phe duyet rollback.
- [ ] Chot baseline Google Sheets/public content: timestamp, count va SHA-256.
- [ ] Tao delta dry-run theo `M8_DATA_MIGRATION_RUNBOOK.md`; delete phai co
  manifest owner phe duyet.
- [ ] Xac nhan Apps Script cu van san sang o che do rollback/read-only.
- [ ] Chot noi luu network/proxy/firewall evidence va thoi gian luu.

## Production secret inventory

Chi doi chieu **ten va noi quan ly**, khong doc/in gia tri:

| Secret/config | Noi quan ly | Gate |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Vercel env | Dat domain production duoc phe duyet |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel env | Dung production project ref |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel env | Public key dung project |
| `SUPABASE_SECRET_KEY` | Vercel Sensitive Env | Server-only, rotate khi cutover |
| `BOOKING_RATE_LIMIT_SECRET` | Vercel Sensitive Env | Random, toi thieu 32 ky tu |
| `SEPAY_WEBHOOK_SECRET` | SePay + Vercel Sensitive Env | HMAC-SHA256, rotate dong bo |
| `SEPAY_BANK_ACCOUNT_NUMBER` | Vercel Sensitive Env | Doi chieu tai khoan nhan |
| `BOOKING_WEBHOOK_FORWARD_SECRET` | Apps Script + Vercel | Chi giu trong rollback window |

Khong tai su dung staging secret cho production. Neu secret tung xuat hien trong
anh/chat/Git history, coi la da lo va rotate truoc cutover.

## Mini-gate truoc moi production mutation

Tat ca muc sau phai dat:

- [x] Auth local/static: role matrix, invite-only, SSR session, owner bootstrap.
- [x] RLS isolated: anon/authenticated/editor/auditor/admin dat 11/11 pgTAP.
- [x] Booking local/static: reserve/status/cancel, state machine, idempotency,
  slot lock va rate limit.
- [x] Payment local/static: valid HMAC, tamper, expired timestamp,
  replay/idempotency,
  amount/account mismatch va manual reconciliation.
- [x] Upload local/static: role, MIME/magic byte, size, lifecycle cleanup.
- [~] HTTP local: `/`, `/blog`, legacy redirect va CSP collector pass; HTTPS,
  `/admin/login`, API no-store va live headers van can release-candidate smoke.
- [ ] Rollback: nguoi thuc hien, trigger, deployment cu va data recovery path.
- [ ] Owner xac nhan lai residual 3 Medium/4 Low.

Neu co P0/P1, sai quyen RLS, sai lech du lieu, webhook khong doi soat duoc hoac
rollback chua san sang thi dung M10 va quay lai M9.

## Thu tu cutover

1. Ghi release SHA/deployment ID va xac nhan deployment xanh.
2. Backup Google Sheets, ghi baseline, freeze write he cu.
3. Export delta, dry-run, import transaction va doi chieu sai lech bang 0.
4. Rotate/set production secrets qua secret manager; khong dua vao shell log.
5. Gan custom domain khi DNS van `DNS only`, xac minh TLS hop le.
6. Chuyen web record theo `CLOUDFLARE_DEPLOYMENT.md`.
7. Chay smoke auth, booking, payment, headers va reconciliation.
8. Theo doi tang cuong toi thieu 2 gio va hypercare 72 gio.
9. Giu he cu read-only; chi tat Apps Script khi traffic bang 0 da co evidence.

## Rollback

Trigger:

- Booking/payment error vuot nguong duoc owner chot.
- Count/checksum/foreign key lech hoac delta import loi.
- Auth/RLS cho phep sai quyen.
- Webhook khong the reconciliation.
- P0 security/reliability incident.

Action:

1. Dung write tren he moi va luu evidence su co.
2. Disable payment cutover/webhook neu lien quan.
3. Chuyen domain/traffic ve deployment cu; Cloudflare proxy loi thi ve
   `DNS only`.
4. Mo lai Apps Script theo quyet dinh rollback.
5. Export delta moi neu an toan, doi chieu booking/payment va phuc hoi theo
   snapshot da duyet.
6. Khong xoa deployment, zone, log hoac snapshot trong ngay su co.

## Bang chung bat buoc

- Release SHA, deployment ID va rollback URL.
- DNS export truoc/sau; TLS/header response va Cloudflare Ray IDs.
- Ket qua mini-gate va count/checksum delta.
- Network evidence tu chinh moi truong thuc thi.
- Timeline, nguoi phe duyet, trigger va quyet dinh rollback/cutover.

Khong luu secret, cookie, raw webhook, booking PII hoac thong tin thanh toan
day du trong runbook/artifact.

## Phase A evidence - 2026-07-25

- Offline/local mini-gate: 68/68 tests pass sau khi khoi dong dung local parity
  server tai `127.0.0.1:4327`.
- Isolated RLS: 11/11 pgTAP pass; Docker evidence
  `network=none published={}`; container va volume tam da cleanup.
- Da sua test harness RLS de doi sau 6 lan `pg_isready` lien tiep (3 giay),
  tranh bat nham PostgreSQL initialization server cua Supabase image.
- Local dev server da dung sau test. Dev watcher co canh bao `EMFILE` va mot
  canh bao anh `src=""`; hai canh bao khong lam parity test fail, nhung can
  theo doi trong build/release-candidate smoke.
- Khong chay script `staging:*`, khong doc production secret, khong thay doi
  DNS/domain/webhook/production data.
- Luu y egress: RLS container co network evidence `network=none`; cac test Node
  local khong co packet/proxy capture rieng, vi vay khong dung ket qua nay de
  tuyen bo toan bo phien khong co egress.
