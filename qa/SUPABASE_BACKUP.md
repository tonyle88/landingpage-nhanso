# Sao lưu mã nguồn và Supabase cục bộ

Lịch trong ứng dụng Codex chạy mỗi thứ Hai lúc 09:00 (giờ máy này). Máy cần bật, có Docker Desktop, kết nối mạng và tệp `next-app/.env.production.local` chứa `PRODUCTION_PROJECT_REF` cùng `SUPABASE_DB_PASSWORD`.

Chạy thủ công từ thư mục gốc dự án:

```sh
node --env-file=next-app/.env.production.local qa/backup-supabase-weekly.mjs
```

Mỗi lần chạy thành công tạo `backups/supabase/<thời điểm>/database.dump`, `source.tar.gz` và `manifest.json`. Bản dump lấy toàn bộ schema không thuộc hệ thống mà tài khoản database có thể truy cập; script kiểm tra định dạng bằng `pg_restore --list` trước khi đánh dấu hoàn tất. Gói mã nguồn gồm các tệp đang được Git theo dõi và tệp mới chưa bị bỏ qua, kể cả thay đổi chưa commit. Tệp `.env`, khóa riêng, thư viện cài đặt, bản build và các bản backup cũ không nằm trong gói. Hai tệp được kiểm tra định dạng và ghi SHA-256 vào manifest. Thư mục `backups/` được Git bỏ qua và chỉ tài khoản trên máy này được đọc theo quyền tệp.

Sau khi tạo thành công, script chỉ giữ lại 3 thư mục backup hoàn tất mới nhất. Nếu lần chạy thất bại, các bản hoàn tất trước đó được giữ nguyên.

**Giới hạn:** Dữ liệu tệp trong Supabase Storage (như ảnh đã tải lên) không nằm trong bản dump database. Các tệp `.env` cần được giữ riêng ở nơi an toàn để có thể khôi phục cấu hình. Bản sao lưu nằm trên cùng máy với dự án; nên có thêm bản sao ở một thiết bị lưu trữ riêng nếu cần bảo vệ trước hỏng máy.

Khi cần khôi phục mã nguồn, giải nén `source.tar.gz` vào một thư mục mới. Không khôi phục database trực tiếp vào production; kiểm tra bản dump và thử trên một database trống riêng trước.
