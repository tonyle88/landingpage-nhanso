# M10 Cutover and Rollback Runbook

## Trang thai va pham vi

- Trang thai: release-candidate staging `READY`; production cutover chua duoc
  phe duyet.
- M9 dang `DEFERRED - OWNER ACCEPTED RESIDUAL RISK`, khong phai `PASS`.
- Ket qua security so bo con 3 Medium va 4 Low; chua ghi nhan P0/P1.
- Khong thao tac production, DNS, custom domain, webhook ngan hang that hoac
  gia tri secret trong Phase A.

## Release candidate

- Release-candidate source SHA:
  `03ad8623f2e906da03dfc6d6e1bcdc69cc818325`.
- Branch: `codex/m10-release-candidate`.
- Remote branch da duoc owner push va xac minh cung SHA truoc khi deploy.
- Commit `75bea605ee75743f9bcc3aba208c344a5c71a61e` chi cap nhat bang
  chung/runbook sau deploy; khong thay doi artifact da deploy.
- Branch release candidate khong chua commit PDF/anh ca nhan ngoai pham vi.

## Phase A - read-only preparation

- [x] Ghi deployment ID va Vercel hostname cua release candidate:
  `dpl_8D8aZKnJ5mizRX6RDfs7FjKBqe9b`,
  `https://nhanso-staging-4hxir5vq5-cuongle88.vercel.app`.
- [x] Ghi deployment cu dung cho rollback staging:
  `dpl_4TPSdvvCcn5TeLSYW3gHaJAXQjbY`,
  `https://nhanso-staging-9qjhyw9ca-cuongle88.vercel.app`.
- [~] Da chup DNS cong khai/HTTPS baseline production; van can Cloudflare zone
  export day du truoc cutover, khong ghi token/cookie vao artifact.
- [ ] Chot cua so cutover, owner thuc hien va owner phe duyet rollback.
- [~] Da tao baseline read-only Google/public content; owner van can chot
  snapshot cuoi sau freeze.
- [~] Delta tooling da bao ve media va rehearsal pass; van can tao final delta
  sau freeze truoc khi duoc phep apply.
- [ ] Xac nhan Apps Script cu van san sang o che do rollback/read-only.
- [ ] Chot noi luu network/proxy/firewall evidence va thoi gian luu.

## Buoc ke tiep da chot - Production pre-cutover inventory

Pham vi duoc phep o buoc ke tiep chi la read-only/export:

1. Xac nhan ten project/zone production va deployment hien tai; khong doc gia
   tri secret.
2. Export DNS truoc cutover va ghi TTL/record dang phuc vu; khong sua record.
3. Export backup Google Sheets/public content, ghi timestamp, count va
   SHA-256; khong khoa ghi.
4. Tao delta dry-run va bao cao insert/update/delete. Delete phai nam trong
   manifest rieng de owner phe duyet.
5. Dien owner thuc hien, owner phe duyet rollback, cua so cutover, nguong
   rollback va data recovery path.

Diem dung bat buoc: khong freeze he cu, import production, rotate secret,
chuyen webhook, gan domain hay sua Cloudflare trong buoc nay. Moi mutation can
mot phe duyet rieng sau khi tat ca artifact tren duoc review.

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
- [x] HTTP/HTTPS release candidate: `/`, `/blog`, `/admin/login` pass `200`;
  CSP collector `204`; unsigned SePay `401`; API `no-store`; CSP nonce va cac
  security headers hien dien; TLS verify `0`.
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

Deployment fallback staging da duoc xac minh `READY`, nhung day chi la bang
chung ky thuat. Rollback gate van chua dat cho den khi owner dien nguoi thuc
hien, nguong trigger va data recovery path production.

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
- Existing staging HTTPS smoke (chua gan release-candidate):
  - `https://nhanso-staging.vercel.app/`: `200`;
  - `/blog`: `200`;
  - `/admin/login`: `200`;
  - `POST /api/csp-report`: `204`, `Cache-Control: no-store`;
  - unsigned `POST /api/sepay-webhook`: `401`, `Cache-Control: no-store`;
  - CSP nonce/strict-dynamic, HSTS, X-Frame-Options, XCTO, Referrer-Policy,
    Permissions-Policy va CORP deu hien dien;
  - curl network evidence: remote IP `216.198.79.195`, TLS verify result `0`.
- Owner da push clean branch `codex/m10-release-candidate`; remote va local
  cung tro toi release-candidate SHA
  `03ad8623f2e906da03dfc6d6e1bcdc69cc818325`.
- Release candidate da deploy tu dung thu muc `next-app` vao project rieng
  `nhanso-staging`:
  - deployment ID `dpl_8D8aZKnJ5mizRX6RDfs7FjKBqe9b`;
  - deployment URL
    `https://nhanso-staging-4hxir5vq5-cuongle88.vercel.app`;
  - stable alias `https://nhanso-staging.vercel.app`;
  - Vercel state `READY`, build Next.js 16.2.11 va TypeScript pass;
  - khong deploy/cham project production that `landingpage-nhanso`.
- Release-candidate HTTPS smoke tren stable alias:
  - `/`, `/blog`, `/admin/login`: `200`;
  - `POST /api/csp-report`: `204`, `Cache-Control: no-store`;
  - unsigned `POST /api/sepay-webhook`: `401`,
    `Cache-Control: no-store`;
  - CSP nonce/strict-dynamic, HSTS, X-Frame-Options, XCTO, Referrer-Policy,
    Permissions-Policy va CORP deu hien dien;
  - curl network evidence: remote IP `64.29.17.195` va `216.198.79.195`,
    TLS verify result `0`.
- Gioi han egress evidence: curl chung minh cac ket noi HTTPS noi tren; Vercel
  CLI hien endpoint upload/deployment va deployment ID, nhung khong co packet
  capture day du cho moi ket noi cua build nen khong tuyen bo phien khong co
  egress khac.

## Production read-only inventory - 2026-07-25

- Vercel project binding tai repo root:
  - project `landingpage-nhanso`;
  - project ID `prj_7cKO0I69rA6NYaWZlRPrD4IcIbHW`;
  - org ID `team_yLYGA03h2AUBAzSxEYlGNQco`.
- Deployment production dang duoc alias:
  - ID `dpl_9gtqv47s73zeYBLs6C2KPCREkoxZ`;
  - immutable URL
    `https://landingpage-nhanso-7nxda0wt7-cuongle88.vercel.app`;
  - status `READY`, tao luc `2026-07-23 18:56:10 +07`;
  - aliases gom `https://nhanso.clowcat.com.vn` va
    `https://landingpage-nhanso.vercel.app`.
- Ba deployment moi nhat tai thoi diem inventory la `Preview`, khong phai
  production; khong promote hoac alias deployment nao trong buoc nay.
- Public DNS snapshot `nhanso.clowcat.com.vn`, TTL `300`:
  - A: `172.67.209.137`, `104.21.82.242`;
  - AAAA: `2606:4700:3033::6815:52f2`,
    `2606:4700:3033::ac43:d189`;
  - khong co CNAME duoc resolver cong khai tra ve vi record dang qua
    Cloudflare proxy.
- HTTPS baseline: `200`, `server: cloudflare`, TLS verify `0`, remote IP
  `2606:4700:3033::ac43:d189`, Cloudflare Ray
  `a20ae551fbfb5de6-HKG`, Vercel request ID
  `hkg1::qnrvw-1784979689312-37bdc1550fd7`.
- Day la public DNS lookup, khong thay the Cloudflare zone export day du.
  Khong doc secret, khong sua deployment/alias/DNS va khong export PII.

## Public-content baseline va delta dry-run - 2026-07-25

- Script `qa/public-content-baseline.mjs --prepare` chi doc public Google
  content va Supabase staging; khong doc auth, booking, payment, webhook,
  audit hoac PII.
- Snapshot tao luc `2026-07-25T11:50:07.573Z`, luu local ignored mode `0600`:
  - baseline SHA-256
    `7c47e61d9301a9ea473127de115fabfcb1992deb4761893c7124d729d6f93ed1`;
  - import payload SHA-256
    `c88aa062f8ccb078e5e8e5f264cf6b68ab00ede03860fe30a8a64cae63c5b8b5`.
- Count source/staging: settings `224/224`, sections `11/11`, packages `4/4`,
  testimonials `6/6`, categories `4/4`, posts `24/24`.
- Delta summary:
  - moi bang deu `insert=0`, `delete=0`;
  - settings/sections/packages/categories `update=0`;
  - testimonials `update=6`, chi `image_url` va `media_asset_id`;
  - blog posts `update=24`, chi `cover_url` va `cover_asset_id`;
  - khong can delete manifest o snapshot nay.
- Chenh lech media phu hop voi M7 Storage migration da xac minh. Day la
  inference tu ten cot delta va bang chung M7, khong phai phep mien gate.
- SQL upsert da bao ve bon media columns tren khi conflict; insert moi van can
  quy trinh migrate media rieng. Snapshot hien tai co insert `0`.
- Test `test:public-import` pass `7/7`, gom assertion SQL khong co assignment
  ghi de media; `test:m8-rehearsal` foundation pass `6/6`.
- SQL local ignored SHA-256
  `09d9d21952836bc5f3e41bac47a6938fc52e67e460974df565f9a558427f75ff`;
  scan xac nhan media update assignments `0`.
- Isolated rehearsal hai pass:
  - moi pass ap `18` migration va import cung SQL hai lan;
  - count `224/11/4/6/4/24`, hash/key/FK parity dat;
  - exception `0`, repeatable `true`;
  - Docker `network=none published={}`;
  - `sourceSecretsUsed=false`, `productionTargetUsed=false`;
  - container/volume tam duoc cleanup theo harness.
- Day moi la rehearsal cua snapshot read-only hien tai. Khong apply staging
  hoac production; final delta phai tao lai sau freeze va duoc owner review.
- Network sampler thu duoc `9` socket observations tu chinh tien trinh. Day
  khong phai full packet capture nen khong dung de tuyen bo zero egress.
- Comparator delta dung canonical JSON de tranh bao update gia do thu tu key
  JSON.
