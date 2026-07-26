# M8 Data Migration Rehearsal and Cutover Runbook

## Pham vi

- Nguon M8 chi gom public content: `site_settings`, `landing_sections`,
  `packages`, `testimonials`, `blog_categories`, `blog_posts`.
- Khong export auth user, booking, payment, webhook payload, audit log hoac PII.
- Snapshot va SQL sinh ra nam trong `.staging-import/`, quyen file `0600` va
  duoc Git ignore.
- Rehearsal khong dung production secret va khong ket noi production.

## Snapshot va normalize

1. Owner chot thoi diem snapshot va xac nhan cac thay doi noi dung da luu.
2. Chay public read-only export/transformer de tao
   `public-content-import.json`.
3. Ghi SHA-256 cua snapshot; khong sua tay snapshot sau khi ghi hash.
4. Transformer phai:
   - trim text va normalize slug;
   - tao UUID deterministic cho category, post, package va testimonial;
   - loai URL khong phai HTTP(S) hoac local absolute path;
   - normalize timestamp ve ISO UTC;
   - giu foreign key category/post.
5. Tao transactional upsert SQL va ghi SHA-256 rieng cho SQL.

## Rehearsal bat buoc

1. Chay `npm run test:m8-rehearsal` va `npm run test:public-import`.
2. Chay `npm run staging:rehearse-m8`.
3. Moi pass phai:
   - dung database rong;
   - co `network=none` va khong publish port;
   - ap day du migration theo thu tu;
   - import cung SQL hai lan;
   - doi chieu count, key columns, SHA-256 va orphan foreign key.
4. Chi dat khi hai database rong cho cung checksum, exception count bang 0.
5. Bao cao local la `.staging-import/m8-rehearsal-report.json`; khong commit.

## Import staging

1. Xac minh project ref dung staging allowlist truoc khi mo ket noi.
2. Tao backup/snapshot staging truoc import.
3. Chay import transaction; neu mot statement loi thi rollback toan bo.
4. Chay import lan hai de xac minh upsert idempotent.
5. Doi chieu count, checksum va foreign key sau import.
6. Media Storage la buoc ke tiep: upload object/metadata truoc, sau do doi URL
   content trong transaction. Khong xoa anh nguon truoc khi public read va
   lifecycle cleanup dat.

## Freeze va delta import khi cutover

1. Cong bo gio freeze; khoa thao tac ghi tren Google Sheets/Apps Script.
2. Ghi baseline cuoi: timestamp, snapshot SHA-256, count tung bang.
3. Export lai snapshot cuoi va so voi snapshot rehearsal.
4. Delta gom:
   - create/update: upsert theo conflict key da chot;
   - delete: manifest rieng co owner phe duyet, khong suy dien deletion tu
     missing row;
   - media: migrate object truoc khi cap nhat URL/asset ID.
5. Chay dry-run delta, sau do import transaction mot lan.
6. Doi chieu count, checksum, key fields va exception list.
7. Chi mo write tren he moi khi sai lech bang 0.

## Rollback

- Trigger: checksum/count lech, foreign key mo coi, import transaction loi,
  auth/RLS sai, hoac booking/payment regression.
- Khong xoa snapshot cu va khong tat Apps Script trong cua so rollback.
- Neu import fail, rollback transaction va giu he cu read-only/active theo
  quyet dinh cutover.
- Neu da mo he moi, dung ghi, export delta nguoc can thiet va phuc hoi snapshot
  theo quy trinh duoc owner phe duyet.

