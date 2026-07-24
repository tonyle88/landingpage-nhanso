# Supabase staging deployment

Staging phải là project riêng, không dùng chung database với production. Không
gửi credential qua chat và không commit file môi trường.

## Owner chuẩn bị trên Supabase Dashboard

1. Chọn đúng organization.
2. Tạo project có tên dễ nhận biết là staging, ví dụ `nhanso-staging`.
3. Chọn region gần người dùng Việt Nam và lưu database password trong password
   manager.
4. Lấy Project Ref, Project URL và publishable key. Không lấy secret/service-role
   key cho public client.
5. Tạo file local `next-app/.env.staging.local` từ các tên biến dưới đây:

```dotenv
DEPLOY_TARGET=staging
SUPABASE_PROJECT_REF=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

File này đã nằm trong phạm vi `.env*` bị Git ignore. Trước khi kết nối cloud,
bật proxy/firewall/network log được tổ chức phê duyệt.

## Agent thực hiện sau khi owner hoàn tất

1. Chạy `npm run staging:preflight`; lệnh không in giá trị credential.
2. Đăng nhập Supabase CLI theo luồng trình duyệt, không dán access token vào
   source hoặc chat.
3. Link đúng Project Ref; đối chiếu lại project trước mọi thay đổi.
4. Chạy `supabase db push --dry-run` và kiểm tra chỉ có migration M2.
5. Chạy `supabase db push` lên staging. Không dùng `--include-seed`.
6. Chạy RLS tests qua kết nối staging chỉ khi database chưa có dữ liệu thật và
   owner phê duyệt fixture rollback.
7. Thu network evidence và kiểm tra migration history/RLS sau khi push.

Tuyệt đối không chạy `supabase db reset --linked`; lệnh này xóa dữ liệu remote.
