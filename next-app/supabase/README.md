# Supabase schema (M2)

Migration này là mô hình dữ liệu đích cho Next.js. Nó chưa kết nối staging hay
production và không chứa credential hoặc dữ liệu người dùng thật.

## Data dictionary

| Bảng | Mục đích | Quan hệ chính |
| --- | --- | --- |
| `profiles` | Hồ sơ tối thiểu cho tài khoản quản trị | 1:1 `auth.users` |
| `admin_roles` | Phân quyền `admin`, `editor`, `auditor` | N:1 `profiles` |
| `site_settings` | Cấu hình JSON; chỉ dòng `is_public` được đọc công khai | `updated_by` → `profiles` |
| `landing_sections` | Nội dung và thứ tự section landing page | độc lập |
| `packages` | Gói, giá online/offline và quyền lợi | được `bookings` tham chiếu |
| `media_assets` | Metadata object lưu trữ; không chứa bytes | người tải → `profiles` |
| `testimonials` | Ảnh feedback công khai có thứ tự | tùy chọn → `media_assets` |
| `blog_categories` | Danh mục blog | 1:N `blog_posts` |
| `blog_posts` | Nội dung blog theo trạng thái xuất bản | category/media/author |
| `bookings` | Snapshot khách, gói, lịch hẹn và trạng thái | package; 1:N payment |
| `payment_transactions` | Giao dịch từ nhà cung cấp thanh toán | N:1 `bookings` |
| `webhook_events` | Inbox idempotent cho webhook | unique provider/event |
| `audit_logs` | Nhật ký thay đổi bất biến ở tầng ứng dụng | actor → `profiles` |

Tiền được lưu bằng số nguyên đơn vị VND (`bigint`), thời gian dùng
`timestamptz`, khóa nghiệp vụ có unique constraint, và dữ liệu linh hoạt dùng
`jsonb`.

## RLS matrix

| Nhóm bảng | anon | authenticated thường | editor | auditor | admin |
| --- | --- | --- | --- | --- | --- |
| Public content | chỉ dòng public/enabled/published | như anon | CRUD | như anon | CRUD |
| `profiles` | không | đọc/sửa chính mình | chính mình | chính mình | CRUD |
| `admin_roles` | không | không | không | không | CRUD |
| Booking/payment/webhook | không | không | không | đọc | CRUD |
| `audit_logs` | không | không | không | đọc | đọc + ghi |

Không có policy cho phép anon ghi booking trực tiếp. Route Handler phía server
sẽ dùng client server-only ở M4/M5; service-role key tuyệt đối không được đưa
vào browser bundle.

## Quy trình local/staging

1. Chạy migration trên Supabase local hoặc staging rỗng.
2. Chỉ chạy `seed.sql` ở local/test.
3. Chạy `npm run test:rls` từ `next-app` để tạo một Supabase Postgres
   synthetic với `--network none`, không publish port, rồi thực thi pgTAP RLS
   tests với anon, authenticated thường, editor, auditor và admin.
4. Chỉ kết nối staging sau khi credential nằm trong secret manager hoặc `.env`
   local đã ignore, đồng thời bật network logging được phê duyệt.

`test:rls` cần Docker và image Postgres được pin trong runner. Runner kiểm tra
network isolation trước khi chạy, tự rollback fixture và xóa container/volume
tạm sau khi kết thúc. Không được chạy `seed.sql` hoặc test này trên production.

Không dùng `supabase start` cho dự án này cho đến khi port binding được xác minh:
Docker Desktop 4.83.0 đã publish local stack trên `0.0.0.0` dù custom network có
`host_binding_ipv4=127.0.0.1`. Runner cô lập là đường kiểm thử M2 được duyệt.
