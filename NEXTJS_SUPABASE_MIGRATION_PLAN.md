# Ke hoach migration Next.js + Supabase

> File nay la source of truth cho migration. Moi thay doi kien truc, schema,
> endpoint va cutover production phai duoc doi chieu va cap nhat tai day.

## 1. Muc tieu

Chuyen he thong tu static HTML/JavaScript + Google Apps Script + Google Sheets
sang:

```text
GitHub --CI/CD--> Vercel
                    ^
User --> Cloudflare DNS-only --> Next.js
                                |-- Frontend/Server Components
                                |-- Route Handlers
                                |   |-- /api/sepay-webhook
                                |   `-- /api/csp-report
                                `-- Supabase
                                    |-- PostgreSQL
                                    |-- Auth
                                    `-- Storage
```

Website production hien tai phai tiep tuc hoat dong cho den khi staging dat du
tat ca acceptance gates va co phuong an rollback da kiem thu.

## 2. Nguyen tac bat buoc

- Khong migration truc tiep tren `main`; dung nhanh
  `codex/nextjs-supabase-migration`.
- Khong dua `.env`, API key, token, mat khau, private key, Supabase
  `service_role` hoac SePay secret vao Git/Git history.
- Tat ca secret chi nam trong `.env.local` da ignore, Vercel Environment
  Variables hoac secret manager duoc phe duyet.
- Kiem thu agent/code tren repo synthetic khong co du lieu nhay cam truoc khi
  chay voi repo va du lieu that.
- Thu network evidence tu moi truong dang chay khi kiem thu egress. Khong dong
  nghia ZDR voi "khong upload".
- Cloud agent khong duoc tiep can du lieu/secret production neu chua co phe
  duyet ro rang va chinh sach to chuc cho phep.
- Moi bang trong Supabase exposed schema phai bat RLS va co test cho `anon`,
  `authenticated`, `editor`, `admin`, `owner` neu role ap dung.
- `service_role` chi duoc su dung trong server-only module/Route Handler.
- Moi thay doi booking/payment phai idempotent, co audit log va rollback.
- Cloudflare giu vai tro DNS; record web chuyen sang DNS-only khi cutover, tru
  khi co quyet dinh co chu dich chap nhan trade-off proxy kep.

## 3. Quy uoc trang thai

- `[ ] TODO`: chua bat dau.
- `[~] IN PROGRESS`: dang thuc hien.
- `[!] BLOCKED`: thieu quyen, secret, du lieu hoac quyet dinh cua owner.
- `[x] DONE`: da dat Definition of Done va co evidence.

Chi danh dau `[x]` khi code, test, tai lieu va rollback lien quan deu hoan tat.

## 4. Baseline hien tai

- [x] Frontend production la static HTML/CSS/JavaScript tren Vercel.
- [x] Cloudflare dang proxy request toi Vercel o kien truc cu.
- [x] Google Sheets la database van hanh hien tai.
- [x] Google Apps Script dang cung cap API landing content, blog, admin va
  booking.
- [x] Vercel dang phuc vu `/api/sepay-webhook` va `/api/csp-report`.
- [x] Security headers va enforced Content-Security-Policy da co tren
  production.
- [ ] Tao inventory day du cua Sheets, Apps Script deployments, triggers,
  webhooks, Drive folders va ImgBB dependencies.
- [ ] Chup baseline so luong record va checksum truoc migration.

## 5. Milestones

### M0 - Bao ve production va lap baseline

Trang thai: `[x] COMPLETE`

- [x] Tao nhanh `codex/nextjs-supabase-migration`.
- [x] Ghi nhan kien truc production hien tai bang source va HTTP/DNS evidence.
- [ ] Tao inventory he thong hien tai.
- [ ] Tao data dictionary tu Google Sheets schema.
- [ ] Backup/export du lieu theo quy trinh duoc phe duyet.
- [ ] Ghi lai rollback owner, RTO va RPO.

Definition of Done:

- Khong co secret trong repo/history cua nhanh migration.
- Co inventory, data dictionary va ban backup duoc owner xac nhan.
- Co rollback owner va cua so cutover.

### M1 - Next.js foundation song song

Trang thai: `[x] COMPLETE`

- [x] Tao Next.js App Router + TypeScript trong surface `next-app/`.
- [x] Giu redirect cho URL cu `/index.html` va `/blog.html`.
- [x] Chuyen font, icon, image, audio va global styles vao `next-app/public/`.
- [x] Chuyen toan bo landing markup thanh JSX native components ma khong thay
  doi noi dung/UX co chu dich.
- [x] Chuyen Navbar, Hero va Footer sang JSX native; giu selector/ID ma
  `script.js` dang su dung.
- [x] Khoi phuc `#dynamic-layout` bao quanh cac section dong de giu section
  ordering behavior cua CMS hien tai.
- [x] Chuyen Pain Points, Mini Report, About va Benefits sang JSX native; giu
  form/result IDs, mentor selectors va CMS content selectors.
- [x] Chuyen Testimonials, Packages va Package Comparison sang JSX native;
  giu carousel placeholders, package IDs va dynamic package grid selectors.
- [x] Chuyen Methods, Process, FAQ va Contact sang JSX native; giu flip/scroll
  hooks, FAQ state va booking form IDs.
- [x] Tat ca landing content sections da la JSX native; khong con section noi
  dung dung `dangerouslySetInnerHTML`.
- [x] Chuyen loader, booking/payment/success modals va floating utilities sang
  JSX native; giu 42 runtime IDs.
- [x] Xoa `legacy/index.html`, legacy markup parser va legacy section module
  naming sau khi khong con consumer.
- [x] Chuyen cac interaction trong pham vi M1 sang React client modules; blog
  legacy runtime duoc giu co chu dich den M3.
- [x] Chuyen navbar scroll/menu, Methods flip/keyboard, scroll-to-top va
  background music sang `LandingRuntime`; xoa listener trung khoi `script.js`.
- [x] Chuyen reveal observer, particles canvas va scroll progress/title sang
  React hooks; cleanup observer, animation frame, resize va scroll listeners.
- [x] Chuyen initial landing content fetch, retry, timeout, cache va loader
  lifecycle sang React hook; legacy chi con adapter apply/render trong M1.
- [x] Chuyen content item DOM adapter va dynamic section layout sang typed
  React module; sanitize HTML dong, thu hep legacy bridge con package,
  testimonial, mini-report va payment settings.
- [x] Chuyen testimonial fallback data, image normalization/render va carousel
  controls sang React hook; cleanup RAF, timeout, scroll va button listeners.
- [x] Chuyen dynamic package normalization, card render, glow va carousel sang
  React hook; sanitize name/features, giu booking selectors va legacy option
  sync.
- [x] Chuyen mini-report meaning maps, CMS overrides va lookup sang typed React
  runtime; legacy calculation chi goi read-only lookup bridge.
- [x] Chuyen booking HTTP client (timeout, retry, POST action va client-error
  logging) sang typed React runtime; legacy UI chi goi bridge.
- [x] Chuyen booking calendar timezone, booked-slot fetch, 21-day/date/time
  render va selection state sang typed React runtime; booking payload doc
  selection bridge.
- [x] Chuyen booking form capture, DOB/required validation va customer/
  reservation state sang typed React runtime; legacy payment dung transition
  proxy.
- [x] Chuyen payment settings refresh, manual/SePay mode, countdown va 5-second
  status polling sang typed React runtime; cleanup intervals khi close/unmount.
- [x] Chuyen payment QR/summary, manual confirmation va success modal sang
  typed React runtime; customer/payment summary dung safe DOM text nodes.
- [x] Xoa booking/payment transition proxies; legacy chi doc typed state qua
  getter va cap nhat reservation qua explicit `patch`.
- [x] Chuyen markup blog sang Next.js `/blog`; trong M1 tiep tuc dung legacy
  blog runtime/Google Apps Script de giu behavior cho den M3.
- [x] Chuyen security headers va CSP sang cau hinh Next.js/Vercel.
- [x] Chuyen `/api/csp-report` thanh Route Handler.
- [x] Chuyen `/api/sepay-webhook` thanh Route Handler nhung chua doi data sink.
- [x] Tao `.env.example` chi gom ten bien va gia tri placeholder.
- [x] Bao dam `.env*` nhay cam duoc ignore.
- [x] Pin dependency da synthetic build va audit: Next.js `16.2.11`,
  TypeScript `5.9.3`, React `19.2.8`; override ban va cua `postcss`/`sharp`.
- [x] Xac minh local runtime chi listen `127.0.0.1` trong luot smoke test.
- [x] Dung CSP nonce theo request cho Next.js framework va legacy blog scripts;
  khong them `unsafe-inline` vao `script-src`.
- [x] Them automated parity tests cho landing/blog, permanent redirects,
  SEO metadata, security headers, CSP nonce va migrated runtime boundaries.

Definition of Done:

- `npm run build` pass.
- Unit/security tests cu va moi pass.
- Preview khong goi Supabase production.
- Route/SEO/security-header parity duoc ghi nhan.
- Static production hien tai van khong bi anh huong.

### M2 - Supabase schema va local/staging security

Trang thai: `[x] COMPLETE`

Schema du kien:

- `profiles`
- `admin_roles`
- `site_settings`
- `landing_sections`
- `packages`
- `testimonials`
- `blog_categories`
- `blog_posts`
- `bookings`
- `payment_transactions`
- `media_assets`
- `webhook_events`
- `audit_logs`

Cong viec:

- [x] Chot data dictionary va quan he.
- [x] Tao SQL migration khoi tao co UUID, `timestamptz`, constraints va indexes.
- [x] Bat RLS tren tat ca bang exposed.
- [x] Tao policies toi thieu cho `anon`, authenticated, editor, auditor va admin.
- [x] Tao seed synthetic, khong sao chep du lieu nguoi dung that.
- [x] Tao RLS test matrix, static schema tests va pgTAP integration suite.
- [x] Chay migration, seed va 11 RLS tests tren Supabase Postgres rong, synthetic,
  `--network none`, khong publish port; runner tu cleanup container/volume.
- [x] Cau hinh Supabase staging rieng tai Singapore; migration history local va
  remote khop `202607240001`.
- [x] Xac minh Data API staging bang publishable key: public reads `200`,
  booking read va package write bi tu choi; `lsof` bat ket noi TLS `:443`.

Definition of Done:

- Migration co the chay lai tu database rong.
- RLS tests chung minh `anon`/role khong doc hoac sua du lieu ngoai quyen.
- Khong co service key trong client bundle hoac Git.

### M3 - Public read migration

Trang thai: `[x] COMPLETE`

Thu tu:

1. Packages.
2. Testimonials.
3. Landing content/settings.
4. Blog categories.
5. Blog posts.

Cong viec:

- [x] Sinh `Database` TypeScript types tu schema staging da migrate; khong chua
  credential hay row data.
- [x] Tao server-only Supabase client.
- [x] Khong tao browser client vi cac public read hien tai deu duoc phuc vu qua
  Server Components.
- [x] Chuyen public reads sang Server Components.
- [x] Them caching/revalidation co chu dich.
- [x] Them fallback khi Supabase staging tam loi.
- [x] Kiem tra SEO metadata, sitemap, canonical va structured data.
- [x] Doi chieu so record va noi dung voi baseline.

Definition of Done:

- Public UI parity dat.
- Khong lam lo du lieu private.
- Read path chay tren staging voi log/metrics phu hop.

### M4 - Supabase Auth va admin

Trang thai: `[~] IN PROGRESS`

- [x] Chot role matrix: `owner`, `admin`, `editor`; giu `auditor` read-only cho
  du lieu van hanh va audit.
- [x] Cau hinh Supabase Auth staging invite-only: public signup va anonymous
  sign-in deu tat; email confirmation bat.
- [x] Tao foundation session cookie SSR va refresh flow trong Next.js; chi
  `getClaims()` duoc dung de gate identity, role duoc resolve server-side.
- [x] Tao Auth user owner staging va bootstrap `profiles` +
  `admin_roles(owner)` trong transaction co allowlist, rollback va hau kiem
  `1 user / 1 profile / 1 owner`; khong doc/in danh tinh.
- [x] Chuyen admin login; valid owner login tren staging pass sau khi build/start
  voi public Supabase config va loai secret khoi child process.
- [~] Chuyen CRUD packages/testimonials/blog/settings: Packages foundation,
  transactional RPC + audit, admin UI va live create/update/delete QA da pass;
  con ba nhom noi dung con lai.
- [ ] Ghi `audit_logs` cho thao tac quan trong.
- [x] Test invalid/expired session cookie, live user khong co role, dynamic role
  restore, logout, privilege matrix RLS va unauthorized access.

Definition of Done:

- Khong con admin token thu cong trong browser storage.
- Authorization duoc enforce o database/server, khong chi an nut tren UI.
- Owner co quy trinh khoi phuc truy cap duoc tai lieu hoa.

### M5 - Booking migration

Trang thai: `[ ] TODO`

- [ ] Chot booking state machine.
- [ ] Validate server-side va normalize input.
- [ ] Gia goi lay tu database, khong tin gia client gui.
- [ ] Tao booking UUID/order ID khong doan duoc.
- [ ] Chong duplicate submit va them idempotency.
- [ ] Rate limit theo chinh sach duoc phe duyet.
- [ ] Chuyen admin booking workflow.
- [ ] Test IDOR, duplicate, retry, timeout va invalid input.

Definition of Done:

- Booking staging hoat dong end-to-end.
- Client chi nhan du lieu toi thieu.
- Co rollback ve Apps Script booking trong cua so migration.

### M6 - SePay/payment migration

Trang thai: `[ ] TODO`

- [ ] Doc raw body va verify HMAC/timestamp truoc moi xu ly.
- [ ] Enforce unique transaction ID.
- [ ] Luu webhook event theo idempotent flow.
- [ ] Doi chieu booking, amount va transfer content.
- [ ] Transaction cap nhat booking atomically.
- [ ] Log duoc redact query, token va du lieu nhay cam.
- [ ] Chay replay/tamper/expired/duplicate tests.
- [ ] Rotate secret khi cutover.

Definition of Done:

- Khong co unsigned/expired/duplicate transaction nao cap nhat booking.
- SePay staging/approved test callback dat.
- Co alert va manual reconciliation procedure.

### M7 - Storage migration

Trang thai: `[ ] TODO`

- [ ] Phan loai asset co dinh de giu trong `public/`.
- [ ] Tao Supabase Storage buckets va policies.
- [ ] Validate MIME, size va path server-side.
- [ ] Doi ten upload bang UUID.
- [ ] Chuyen blog/testimonial uploads.
- [ ] Cap nhat CSP cho Supabase Storage domain.
- [ ] Xac minh khong con runtime dependency ImgBB/Drive truoc khi tat.

Definition of Done:

- Public/private asset policies co automated tests.
- Khong upload file sai loai/qua gioi han.
- URL cu co redirect/fallback neu can.

### M8 - Data migration rehearsal

Trang thai: `[ ] TODO`

- [ ] Export ban snapshot duoc phe duyet.
- [ ] Lam sach/normalize offline.
- [ ] Import staging.
- [ ] Doi chieu record count, key fields va checksum.
- [ ] Chay rehearsal lan 1 va ghi thoi gian.
- [ ] Sua script/mapping.
- [ ] Chay rehearsal lan 2 tu database rong.
- [ ] Chot freeze/delta import procedure.

Definition of Done:

- Hai lan migration co ket qua lap lai duoc.
- Sai lech du lieu bang 0 hoac co exception list duoc owner chap nhan.
- Khong dung production secret trong rehearsal.

### M9 - QA, security va observability

Trang thai: `[ ] TODO`

- [ ] Unit, integration va end-to-end tests.
- [ ] RLS/authorization test matrix.
- [ ] Booking/payment adversarial tests.
- [ ] CSP/security-header tests.
- [ ] Accessibility, responsive va keyboard QA.
- [ ] SEO/redirect parity.
- [ ] Core Web Vitals/performance baseline.
- [ ] Error tracking, webhook alerts va audit queries.
- [ ] Network egress evidence tu staging.
- [ ] Secret scan va dependency/security review.

Definition of Done:

- Khong con P0/P1 defect.
- P2 duoc owner chap nhan hoac co lich sua.
- Security va rollback gates deu dat.

### M10 - Cutover va rollback

Trang thai: `[ ] TODO`

- [ ] Deploy commit release-candidate co SHA duoc ghi nhan.
- [ ] Backup Google Sheets lan cuoi.
- [ ] Freeze write tren he cu.
- [ ] Import delta va doi chieu.
- [ ] Rotate/set production secrets bang Vercel/Supabase secret management.
- [ ] Gan domain vao Next.js deployment.
- [ ] Chuyen Cloudflare web record sang DNS-only.
- [ ] Kiem tra SSL, headers, routes, booking va payment.
- [ ] Theo doi error/webhook trong cua so hypercare.
- [ ] Giu he cu read-only trong thoi gian rollback.
- [ ] Tat Apps Script chi sau khi traffic bang 0 duoc xac minh.

Rollback triggers:

- Booking/payment error vuot nguong duoc chot.
- Mat/lech du lieu.
- Auth/RLS cho phep truy cap sai quyen.
- Webhook khong the reconciliation.
- P0 security/reliability incident.

Rollback action:

1. Dung write tren he moi.
2. Xuat delta phat sinh neu an toan.
3. Tro domain ve deployment cu.
4. Mo lai Apps Script theo runbook.
5. Doi chieu booking/payment trong thoi gian su co.

## 6. Ma tran mapping du kien

| He hien tai | He moi | Trang thai |
|---|---|---|
| `index.html`, `style.css`, `script.js` | Next.js landing route/components | TODO |
| `blog.html`, `blog.js` | Next.js `/blog` routes | TODO |
| `admin/*` | Next.js `/admin` + Supabase Auth | TODO |
| Google Sheets | Supabase PostgreSQL | TODO |
| Google Apps Script | Next.js Route Handlers | TODO |
| Google Drive/ImgBB | `public/` + Supabase Storage | TODO |
| `api/csp-report.mjs` | `app/api/csp-report/route.ts` | TODO |
| `api/sepay-webhook.mjs` | `app/api/sepay-webhook/route.ts` | TODO |
| `vercel.json` headers | Next.js/Vercel header config | TODO |

## 7. Thong tin/quyen se can tu owner

Khong can cung cap secret trong chat hoac commit vao repo. Den dung milestone, owner
se tu dat secret vao dashboard/local ignored file.

- [x] Supabase staging project URL va publishable key duoc dat trong local
  ignored environment, khong ghi vao Git/chat.
- [ ] Supabase production project duoc tao rieng.
- [ ] Quyen cau hinh Vercel Environment Variables.
- [ ] Quyen cau hinh custom domain.
- [ ] Quyen Cloudflare DNS.
- [ ] Danh sach Google Sheets/Apps Script production can migration.
- [ ] Cua so cutover va nguoi phe duyet rollback.
- [ ] SePay staging/test callback hoac quy trinh test duoc phe duyet.

## 8. Nhat ky thuc hien

| Ngay | Milestone | Thay doi/evidence | Ket qua |
|---|---|---|---|
| 2026-07-24 | M0 | Tao nhanh migration va file source of truth | IN PROGRESS |
| 2026-07-24 | M1 | Synthetic Next.js 16.2.11 build; npm registry egress log; audit 0 vulnerabilities voi dependency overrides | PASS |
| 2026-07-24 | M1 | Tao `next-app/`, security headers va hai Route Handlers parity | IN PROGRESS |
| 2026-07-24 | M1 | Build production pass; 9/9 security tests pass; audit 0; local CSP/405/Allow headers pass; listener chi tren 127.0.0.1 | PASS |
| 2026-07-24 | M1 | Chuyen `/blog`, assets va legacy URL redirects; 16 script tags khop request nonce; assets/redirect smoke test pass | PASS |
| 2026-07-24 | M1 | Dua landing markup vao Next.js `/`; hero/about/benefits/testimonials/packages/process/booking/contact parity pass; root/blog CSP nonce pass | IN PROGRESS |
| 2026-07-24 | M1 | Tach landing thanh component boundaries; 14 ID duy nhat, thu tu section/copy parity va 43 script nonce checks pass | PASS |
| 2026-07-24 | M1 | Navbar/Hero/Footer sang JSX native; 6 number rings, 18 floating numbers, 3 stats, dynamic-layout va 44 script nonce checks pass | PASS |
| 2026-07-24 | M1 | Pain Points/Mini Report/About/Benefits sang JSX native; 5 card-group counts, 12 runtime IDs, YouTube va nonce parity pass | PASS |
| 2026-07-24 | M1 | Testimonials/Packages/Comparison sang JSX native; carousel, 3 package IDs, session info, table va nonce parity pass | PASS |
| 2026-07-24 | M1 | Methods/Process/FAQ/Contact sang JSX native; 8 structure checks, 11 booking runtime IDs va nonce parity pass | PASS |
| 2026-07-24 | M1 | Loader/3 modals/floating utilities sang JSX native; 42 runtime IDs, 4 structure checks va nonce parity pass; xoa raw legacy markup | PASS |
| 2026-07-24 | M1 | Navbar/menu, Methods keyboard flip, scroll-top va music sang React runtime; legacy duplicate-listener scan va nonce parity pass | PASS |
| 2026-07-24 | M1 | Reveal observer, particles canvas va scroll progress/title sang React hooks; build pass, 9/9 security tests, audit 0, 40 script nonce parity va listener chi tren 127.0.0.1 | PASS |
| 2026-07-24 | M1 | Initial content fetch/retry/timeout/cache/loader sang React hook; cache loai payment settings, legacy initial fetch da xoa; build, 9/9 security, audit 0 va 40 script nonce parity pass | PASS |
| 2026-07-24 | M1 | Content item + dynamic section adapter sang typed React module; HTML dong qua sanitizer, legacy bridge duoc thu hep; build, 9/9 security, audit 0 va 40 script nonce parity pass | PASS |
| 2026-07-24 | M1 | Testimonial fallback/render/carousel sang React hook; xoa legacy implementation, cleanup listeners; build, 9/9 security, audit 0 va 40 script nonce parity pass | PASS |
| 2026-07-24 | M1 | Dynamic package render/glow/carousel sang React hook; sanitize HTML dong, giu booking option sync; build, 9/9 security, audit 0 va 40 script nonce parity pass | PASS |
| 2026-07-24 | M1 | Mini-report meaning/CMS adapter sang typed React runtime; 4 meaning groups va form IDs parity; build, 9/9 security, audit 0 va 40 script nonce parity pass | PASS |
| 2026-07-24 | M1 | Booking HTTP timeout/retry/action/error-log sang typed React runtime; legacy wrappers delegate qua bridge; build, 9/9 security, audit 0 va 40 script nonce parity pass | PASS |
| 2026-07-24 | M1 | Calendar VN timezone/booked slots/21-day/selection sang typed React runtime; legacy calendar implementation da xoa; build, 9/9 security, audit 0 va 40 script nonce parity pass | PASS |
| 2026-07-24 | M1 | Booking form validation/capture + reservation state sang typed React runtime; 7 fields parity, legacy transition proxy; build, 9/9 security, audit 0 va 40 script nonce parity pass | PASS |
| 2026-07-24 | M1 | Payment settings/mode/countdown/SePay polling sang typed React runtime; legacy polling da xoa, interval cleanup; build, 9/9 security, audit 0 va 40 script nonce parity pass | PASS |
| 2026-07-24 | M1 | Payment QR/summary/manual confirm/success modal sang typed React runtime; xoa legacy UI render va data interpolation; build, 9/9 security, audit 0 va 40 script nonce parity pass | PASS |
| 2026-07-24 | M1 | Xoa booking/payment transition proxies; typed getter + explicit reservation patch, critical IDs parity; build, 9/9 security, audit 0 va 40 script nonce parity pass | PASS |
| 2026-07-24 | M1 | Automated route/SEO/header/CSP/runtime parity: landing, blog, 2 permanent redirects; 4/4 tests pass; M1 gates closed | PASS |
| 2026-07-24 | M2 | Migration + synthetic seed chay tu Postgres rong; 11/11 pgTAP RLS pass trong container `network=none`, khong publish port; schema 6/6, security 9/9, build va audit pass | PASS |
| 2026-07-24 | M2 | Pin Supabase CLI 2.109.1; them staging preflight va runbook; chua link cloud project hoac luu credential | IN PROGRESS |
| 2026-07-24 | M2 | Tao `nhanso-staging` Singapore; preflight pass; dry-run chi 1 migration; push khong seed; local/remote migration history khop; Data API public read pass va sensitive read/write denied; network socket evidence `:5432`/`:443`; audit 0 | PASS |
| 2026-07-24 | M3 | Sinh typed database contract tu schema staging sau M2; scan khong co credential/service-role marker | IN PROGRESS |
| 2026-07-24 | M3 | Server-only typed Supabase client + public Packages read; timeout 4s, cache 5 phut va Google/static fallback; synthetic 3/3, M3 2/2, parity 4/4, security 9/9, build va audit pass; staging empty van tra landing 200 | PASS |
| 2026-07-24 | M3 | Public Testimonials read qua Server Component; ho tro image URL/media asset, alt text, timeout 4s, cache 5 phut va Google/static fallback; synthetic 3/3, M3 3/3, parity 4/4, security 9/9, build, staging RLS smoke va audit pass; lsof ghi nhan TLS `172.64.149.246:443` | PASS |
| 2026-07-24 | M3 | Public landing content/settings read qua Server Component; map public setting co contract va section layout rieng, ownership tung nguon, timeout 4s, cache 5 phut va Google fallback tung phan; synthetic 4/4, M3 4/4, parity 4/4, security 9/9, build, staging RLS smoke va audit pass; lsof ghi nhan TLS `172.64.149.246:443` | PASS |
| 2026-07-24 | M3 | Public blog categories read qua Server Component; JSON bootstrap duoc escape va gan CSP nonce, Supabase chi override category slice con Google/cache giu posts; timeout 4s, cache 5 phut; synthetic 3/3, M3 5/5, parity 4/4, security 9/9, build, staging RLS smoke va audit pass; TLS `104.18.38.10:443` | PASS |
| 2026-07-24 | M3 | Published blog posts read qua Server Component; draft/future post va unsafe cover URL bi loai, list/detail dung cung JSON bootstrap; them canonical dong, Blog/BlogPosting JSON-LD, sitemap va robots; synthetic 4/4, M3 7/7, parity 4/4, security 9/9, build, staging RLS smoke va audit pass; staging empty dung Google fallback | PASS |
| 2026-07-24 | M3 | Baseline read-only + import payload deterministic da tao local ignored mode `0600`: Google co 224 settings, 11 sections, 4 packages, 6 testimonials, 4 categories, 24/24 blog details; staging ca 6 bang deu 0; transformer synthetic 4/4, UUID/FK/hash idempotent; 10 network socket snapshots, khong in credential/noi dung | PASS - NOT IMPORTED |
| 2026-07-24 | M3 | Sinh SQL transaction/upsert local ignored mode `0600`; synthetic PostgreSQL emulator chay hai lan khong duplicate, 7/7 import tests pass. Docker image gate khong chay duoc do Docker Desktop Keychain error, nen khong khang dinh da co container-level network-none evidence cho rieng import | PASS WITH LIMITATION |
| 2026-07-24 | M3 | Nap 273 public records vao staging `dwledqvsooobegpqljur` hai lan qua session pooler; count 224/11/4/6/4/24 khong doi, 0 orphan blog post; lsof ghi nhan `52.77.146.31:5432`; production khong bi ghi | PASS |
| 2026-07-24 | M3 | Baseline/hash 6/6 bang khop sau khi canonicalize timestamp tuong duong; public read 7/7, parity 4/4, security 9/9, build va audit 0 pass; M3 gates closed | PASS |
| 2026-07-24 | M4 | Chot role matrix owner/admin/editor/auditor va break-glass owner; them migration owner + RLS matrix, `current_admin_role()`, Supabase SSR cookie client va Proxy refresh chi cho `/admin`; local Auth config invite-only, password >=12, session 12h/inactivity 2h. Synthetic role gate 1/1, auth 4/4, schema 6/6, public read 7/7, security 9/9, build va audit 0 pass. Migration/config chua push staging, chua tao user | PASS - NOT APPLIED |
| 2026-07-24 | M4 | Dry-run chi ra dung migration `002`/`003`; push staging thanh cong, local/remote history khop 001/002/003. Read-only verifier xac nhan owner role, `current_admin_role()`, 18/18 policies, 0 Auth user; lsof ghi nhan DB `54.255.219.82:5432` va CLI `52.74.252.201:5432` + API TLS. Canh bao pg-delta cache CA xuat hien sau apply nhung migration history va catalog check deu pass | PASS |
| 2026-07-24 | M4 | Khong dung `config push` vi co the day ca local URL/config ngoai Auth. Access token local da thu hoi/rong; Supabase Dashboard trong in-app browser chua dang nhap, nen remote `disable_signup` chua thay doi va khong duoc danh dau hoan tat | BLOCKED - DASHBOARD LOGIN |
| 2026-07-24 | M4 | Owner dang nhap Supabase Dashboard; tat `Allow new users to sign up`, giu anonymous sign-in tat va email confirmation bat; UI xac nhan switch off va Save disabled sau khi luu | PASS |
| 2026-07-24 | M4 | Tao `/admin/login`, protected `/admin` va POST `/admin/logout`; khong co signup hay browser storage token, login error generic, JWT + role gate server-side, noindex va private/no-store. Synthetic 1/1, auth 5/5, security 9/9, parity 4/4, build va audit 0 pass; anonymous smoke: login 200, admin 307 den unauthorized, logout 303 | PASS - NO VALID USER YET |
| 2026-07-24 | M4 | Owner tao Auth user staging. Bootstrap idempotent allowlist dung transaction, khoa `admin_roles`, rollback khi state lech va khong in email/UUID; ket qua 1 Auth user, 1 profile, 1 owner. Hau kiem catalog 18/18 policies, owner role/function, auth 5/5, security 9/9 va production build pass; lsof ghi nhan DB staging `52.77.146.31:5432` va `54.255.219.82:5432` | PASS |
| 2026-07-24 | M4 | Recovery token bi lo qua browser context trong luc debug redirect local. Owner da ban user tren Dashboard; tam go dung 1 `admin_roles(owner)` bang transaction allowlist, giu 1 Auth user + 1 profile va dua role ve 0; lsof ghi nhan DB staging `52.77.146.31:5432`. Dung server recovery local; cho JWT het han truoc khi phuc hoi role | CONTAINED - WAIT TOKEN EXPIRY |
| 2026-07-24 | M4 | Sau khi token cu het han: unban user, dat mat khau qua local loopback provisioning co CSRF dung mot lan + Supabase Admin SDK; khong ghi password/token, process tu tat. Phuc hoi owner bang transaction allowlist; hau kiem 1 user/1 profile/1 owner, 18/18 policies va Auth 6/6 pass; TLS staging `172.64.149.246:443`, DB `52.77.146.31:5432`/`54.255.219.82:5432` | RECOVERED |
| 2026-07-24 | M4 | Rebuild/start staging bundle voi `NEXT_PUBLIC_SUPABASE_*`, loai secret key/DB password/access token khoi child process. Valid password login pass, `/admin` resolve dung role `owner`; admin login gate hoan tat, logout va negative-role tests con cho | PASS |
| 2026-07-24 | M4 | Sua logout local: bo `upgrade-insecure-requests` rieng loopback, giu tren HTTPS deploy; redirect 303 tuong doi, private/no-store. Browser logout pass; anonymous `/admin` redirect 307 den unauthorized login. Auth 6/6, security 9/9 va staging build pass | PASS |
| 2026-07-24 | M4 | Live negative-role test: tam go role bang transaction, login dung password bi redirect den `/admin/login?reason=unauthorized`; sau xac nhan phuc hoi owner idempotent, hau kiem 1 user/1 profile/1 owner va 18/18 policies; DB staging `54.255.219.82:5432`/`52.74.252.201:5432` | PASS |
| 2026-07-24 | M4 | Dynamic role test pass tren cung session: role 0 bi tu choi, phuc hoi owner thi `/admin` mo lai khong can token moi. Cookie gia lap expired/invalid bi redirect 307 den unauthorized login, private/no-store, khong 500/khong lo admin | PASS |
| 2026-07-24 | M4 | Migration 004 package CRUD: RPC create/update/delete va audit cung transaction, role owner/admin/editor, input validation va RLS. Dry-run chi 004; catalog hau kiem migration + 2 functions + audit policy, DB staging `52.77.146.31:5432`. Them `/admin/packages`, server actions, confirm-code delete; tests package 4/4, auth 6/6, security 9/9, build pass; anonymous route bi redirect | PASS - LIVE MUTATION QA PENDING |
| 2026-07-24 | M4 | Packages live QA qua owner UI: create gia 1000/an, update gia 2000/noi bat voi before+after audit, delete bang confirm code. Hau kiem record test = 0, packages tro lai baseline 4, audit create/update/delete = 1/1/1; DB evidence `54.255.219.82:5432`/`52.74.252.201:5432`, tests 4/4 | PASS |

## 9. Cong viec tiep theo

1. Mo rong pattern CRUD transaction + audit sang Testimonials, Blog va Settings.
