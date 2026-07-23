# Runbook vận hành Cloudflare Free trước Vercel

Cập nhật: 23/07/2026

## 1. Kiến trúc được duyệt

```text
Domain có sẵn
      |
      v
Cloudflare Free — DNS, TLS edge, CDN, WAF
      |
      v
Vercel Free — static frontend và /api/*
      |
      +--> Google Apps Script
```

Repo hiện tại là HTML/CSS/JS tĩnh và Vercel Functions, không phải Next.js. Đợt triển khai này không chuyển framework và không dùng Cloudflare Workers/Pages.

## 2. Nguyên tắc cấu hình

- Vercel tiếp tục là origin và hệ thống deploy duy nhất.
- Cloudflare chỉ proxy hostname public `nhanso.clowcat.com.vn`.
- MX, SPF, DKIM, DMARC và record xác minh email luôn để `DNS only`.
- Không bật `Cache Everything` cho toàn hostname.
- `/api/*` phải bypass Cloudflare cache.
- Không đặt challenge tương tác trước webhook SePay.
- Không đưa Cloudflare/Vercel token hoặc secret vào Git.
- Giữ domain Vercel mặc định để kiểm tra origin và rollback, nhưng không công bố làm URL chính.

## 3. Trạng thái

| Hạng mục | Trạng thái | Bằng chứng cần có |
| --- | --- | --- |
| Synthetic safety test | Hoàn tất | Fixture tối thiểu không dùng dữ liệu thật |
| Kiểm tra kiến trúc repo | Hoàn tất | Static frontend + Vercel Functions + Apps Script |
| Test Vercel APIs | Hoàn tất local | SePay HMAC, CSP collector |
| Secret signature scan cơ bản | Hoàn tất | Không thấy signature phổ biến; chưa thay thế history scan |
| Network evidence | Chưa có | Proxy/firewall/network log từ môi trường triển khai |
| DNS export | Chưa thực hiện | File export và ảnh chụp DNS trước cutover |
| Cloudflare staging/cutover | Chưa thực hiện | Cần quyền tài khoản và cổng an toàn đạt |

## 4. Cổng an toàn bắt buộc

Trước khi đăng nhập, thay nameserver, đổi DNS hoặc gọi API cloud:

- [ ] Có network logging/proxy/firewall được tổ chức phê duyệt.
- [ ] Đã xác định nơi lưu log, người xem log và thời gian lưu.
- [ ] Secret scan cả working tree và Git history đạt yêu cầu.
- [ ] Secret từng vào history đã được thu hồi/xoay vòng trước khi xử lý history.
- [ ] Chính sách tổ chức cho phép Vercel và Cloudflare xử lý artefact/traffic này.
- [ ] Bật ZDR nếu nhà cung cấp hỗ trợ và dự án yêu cầu; không coi ZDR là không có upload.
- [ ] Đã đọc changelog/tài liệu bảo mật hiện hành, đồng thời hiểu rằng chúng không thay network evidence.
- [ ] Đã xuất toàn bộ DNS hiện tại.
- [ ] Đã ghi lại Vercel production hostname và URL rollback.
- [ ] Có chủ hệ thống duyệt cửa sổ cutover.

Thiếu bất kỳ mục nào thì dừng trước thao tác cloud có rủi ro.

## 5. Chuẩn bị Vercel origin

### 5.1 Kiểm tra production hiện tại

- [ ] `/`, `/blog.html`, `/admin/` trả `200`.
- [ ] CSS, JS, font, hình và audio tải thành công.
- [ ] `POST /api/csp-report` trả `204`.
- [ ] Webhook thiếu/sai HMAC trả `401`.
- [ ] Webhook hợp lệ forward đến Apps Script đúng một lần.
- [ ] Header trong `vercel.json` xuất hiện trên response public.
- [ ] `/api/*` trả `Cache-Control: no-store`.

Test local trong repo:

```sh
node qa/sepay-webhook-security-tests.mjs
node qa/csp-report-tests.mjs
node qa/sprint2-smoke-tests.mjs
```

### 5.2 Không thay đổi Vercel domain sớm

Giữ custom domain đang gắn với Vercel. Nếu Vercel yêu cầu xác minh DNS, hoàn tất xác minh khi record còn `DNS only`, chờ chứng chỉ hợp lệ rồi mới bật proxy Cloudflare.

## 6. Onboard DNS vào Cloudflare

1. Thêm zone `clowcat.com.vn` vào Cloudflare Free.
2. Cloudflare quét DNS; so sánh từng record với bản export từ nhà cung cấp hiện tại.
3. Kiểm tra đặc biệt MX, SPF, DKIM, DMARC, CAA và record xác minh dịch vụ.
4. Trong lần chuyển nameserver đầu tiên, để hostname web `DNS only` nhằm tách lỗi DNS khỏi lỗi proxy.
5. Thay nameserver tại registrar.
6. Chờ zone chuyển `Active`; kiểm tra website và email trước khi bật proxy.

Không xóa zone hoặc DNS cũ trong ngày cutover.

## 7. Record cho Vercel

Dùng chính xác record Vercel đang yêu cầu trong dashboard của project; không sao chép giá trị từ tài liệu cũ nếu dashboard hiện hành khác.

Ma trận vận hành:

| Record | Proxy |
| --- | --- |
| `nhanso` trỏ tới Vercel | Ban đầu DNS only; sau kiểm thử chuyển Proxied |
| Vercel verification CNAME/TXT | DNS only |
| MX/SPF/DKIM/DMARC | DNS only |
| Record không phục vụ HTTP | DNS only |

Sau khi bật Proxied, `dig` sẽ thấy IP Cloudflare thay vì origin; đây là hành vi dự kiến.

## 8. TLS

1. Trước khi bật proxy, xác nhận Vercel phục vụ chứng chỉ hợp lệ cho `nhanso.clowcat.com.vn`.
2. Trong Cloudflare đặt SSL/TLS mode `Full (strict)`.
3. Bật `Always Use HTTPS`.
4. Minimum TLS Version: `1.2`.
5. Không dùng Flexible SSL.
6. Chỉ bật HSTS sau khi HTTPS ổn định và đã đánh giá toàn bộ subdomain; không bật `includeSubDomains` theo mặc định.

## 9. Cache Rules

Thứ tự rule phải rõ ràng vì rule khớp sau có thể ghi đè rule trước.

### Rule 1 — API bypass

Expression:

```text
http.host eq "nhanso.clowcat.com.vn" and starts_with(http.request.uri.path, "/api/")
```

Action: `Bypass cache`.

### Rule 2 — Admin bypass

Expression:

```text
http.host eq "nhanso.clowcat.com.vn" and starts_with(http.request.uri.path, "/admin/")
```

Action: `Bypass cache`.

### Phần còn lại

Giữ caching mặc định của Cloudflare. Không tạo `Cache Everything` cho HTML vì nội dung/admin có thể thay đổi và asset hiện chưa dùng filename hash.

Kiểm tra response:

```sh
curl -I https://nhanso.clowcat.com.vn/
curl -I https://nhanso.clowcat.com.vn/style.css
curl -i -X POST https://nhanso.clowcat.com.vn/api/csp-report -H 'Content-Type: application/csp-report' --data '{}'
```

`/api/csp-report` phải trả `204`, có `Cache-Control: no-store`, và không được có cache HIT.

## 10. WAF và rate limiting trên Free plan

- Bật Cloudflare Managed Rules nếu dashboard/plan hiện tại cung cấp.
- Tạo rule chặn method bất thường cho `/api/sepay-webhook`; chỉ `POST` là hợp lệ.
- Không bật Browser Integrity Check/challenge riêng cho webhook nếu nó làm SePay không gọi được.
- Rate limit `/api/csp-report` để chống spam.
- Với `/api/sepay-webhook`, đặt ngưỡng đủ rộng cho retry và kiểm thử từ SePay; HMAC vẫn là kiểm soát xác thực chính.
- Chỉ chặn quốc gia/ASN sau khi có log chứng minh không ảnh hưởng SePay và khách hàng hợp lệ.

## 11. Kiểm thử sau khi bật proxy

- [ ] Landing, blog và admin hoạt động trên desktop/mobile.
- [ ] Google Apps Script CORS/fetch vẫn hoạt động.
- [ ] Security headers từ Vercel không bị mất hoặc nhân đôi sai.
- [ ] CSP report nhận được vi phạm và loại query/fragment khỏi log.
- [ ] Webhook test từ SePay trả thành công.
- [ ] Một giao dịch sandbox/kiểm soát chuyển `pending_payment -> paid`.
- [ ] Retry webhook không tạo booking/thanh toán trùng.
- [ ] Calendar và email được tạo đúng.
- [ ] `/api/*` và `/admin/*` không có cache HIT.
- [ ] Static assets có thể có `CF-Cache-Status: HIT` sau lần gọi lặp lại.
- [ ] Cloudflare Analytics/WAF không có false positive quan trọng.
- [ ] Network evidence chỉ ra đúng các endpoint dự kiến; egress ngoài danh sách đã được điều tra.

## 12. Cutover

1. Chọn thời điểm ít truy cập và có người theo dõi Sheet/Calendar/email.
2. Xác nhận Vercel production đang xanh.
3. Xác nhận zone Cloudflare Active và site hoạt động khi `DNS only`.
4. Chuyển riêng hostname `nhanso` sang `Proxied`.
5. Chạy checklist mục 11.
6. Theo dõi `4xx`, `5xx`, WAF events, cache status và webhook tối thiểu 2 giờ.
7. Theo dõi tăng cường trong 72 giờ.

## 13. Rollback

Nếu Cloudflare gây lỗi nhưng Vercel origin vẫn tốt:

1. Chuyển record `nhanso` từ `Proxied` về `DNS only`.
2. Purge cache chỉ khi cần; không purge trước khi lưu bằng chứng sự cố.
3. Kiểm tra trực tiếp custom domain và Vercel hostname.
4. Xác nhận webhook, booking, Calendar và email.
5. Không xóa Cloudflare zone, Vercel deployment hoặc log trong ngày sự cố.

Nếu lỗi nằm ở Vercel deployment, rollback deployment trong Vercel theo quy trình hiện có; đổi proxy Cloudflare không sửa được lỗi origin.

## 14. Bằng chứng cần lưu

- DNS export trước/sau và thời điểm thay nameserver.
- Ảnh hoặc export Cache/WAF/TLS rules.
- Vercel deployment ID/commit SHA.
- Kết quả test, response headers và Cloudflare Ray IDs.
- Network/proxy/firewall logs của chính môi trường triển khai.
- Timeline cutover/rollback và người phê duyệt.

Không lưu secret, cookie đăng nhập, raw webhook chứa dữ liệu khách hàng hoặc thông tin thanh toán đầy đủ trong tài liệu vận hành.
