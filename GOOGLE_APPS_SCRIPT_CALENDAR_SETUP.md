# Cấu hình Google Calendar miễn phí bằng Apps Script

Giải pháp này không dùng service account và không cần bật thanh toán Google
Cloud. Apps Script chạy bằng chính tài khoản Google đang quản lý Calendar.

## 1. Tạo chuỗi bí mật

Tạo một chuỗi ngẫu nhiên dài tối thiểu 32 ký tự. Chuỗi này phải giống nhau ở
Apps Script và Vercel, nhưng không được đưa vào Git hoặc gửi qua tin nhắn.

Ví dụ tên biến (không dùng chính ví dụ này làm secret):

```text
BOOKING_CALENDAR_SECRET
```

## 2. Tạo Apps Script

1. Mở <https://script.google.com/>.
2. Chọn **New project** và đặt tên `Clow Cat Booking Calendar`.
3. Xóa nội dung mặc định trong `Code.gs`.
4. Sao chép toàn bộ nội dung file `google-apps-script-calendar.gs` vào.
5. Mở **Project Settings**.
6. Trong **Script Properties**, thêm:
   - `BOOKING_CALENDAR_SECRET`: chuỗi bí mật ở bước 1.
   - `BOOKING_CALENDAR_ID`: không bắt buộc. Để trống sẽ dùng lịch mặc định của
     tài khoản đang triển khai.

Không đặt secret trực tiếp trong mã Apps Script.

## 3. Triển khai Web App

1. Chọn **Deploy → New deployment**.
2. Loại triển khai: **Web app**.
3. **Execute as**: `Me`.
4. **Who has access**: `Anyone`.
5. Chọn **Deploy** và cấp quyền Google Calendar khi Google yêu cầu.
6. Sao chép URL kết thúc bằng `/exec`.

Mở URL `/exec` trên trình duyệt. Kết quả đúng có dạng:

```json
{"ok":true,"service":"clow-cat-booking-calendar"}
```

## 4. Cấu hình Vercel

Mở **Vercel → Project → Settings → Environment Variables**, thêm cho môi
trường Production:

```text
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
BOOKING_CALENDAR_SECRET=<cùng chuỗi bí mật ở Apps Script>
```

Sau khi lưu, redeploy phiên bản website mới.

Không dùng tiền tố `NEXT_PUBLIC_` hoặc `VITE_`. Hai biến này chỉ được đọc trên
máy chủ.

## 5. Cập nhật Apps Script về sau

Sau khi sửa mã:

1. Chọn **Deploy → Manage deployments**.
2. Chọn biểu tượng bút chì của deployment hiện tại.
3. Chọn **New version**.
4. Chọn **Deploy**.

Nếu chỉ lưu mã nhưng không tạo version mới, URL `/exec` vẫn chạy phiên bản cũ.

## 6. Luồng hoạt động

- Xác nhận lịch: tạo hoặc cập nhật sự kiện, lưu `calendar_event_id` vào
  Supabase.
- Đổi lịch trước ít nhất 72 giờ: cập nhật giờ trên cùng sự kiện và gửi email
  cho khách cùng chủ hệ thống.
- Hủy lịch trước ít nhất 72 giờ: chuyển booking sang `cancelled`, xóa sự kiện
  Calendar và gửi hai email.
- Nếu Calendar tạm lỗi: trạng thái Supabase vẫn được giữ, admin có nút
  **Đồng bộ lại Calendar**.

Việc hủy lịch không tự động hoàn tiền.
