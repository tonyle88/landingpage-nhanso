import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { deleteSettingAction, setSepayAutoConfirmationAction } from "./actions";
import { SettingForm } from "./setting-form";
import { AdminToast } from "../admin-toast";
import { ConfirmToggle } from "../confirm-toggle";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Quản lý settings | Clow Cat Patronus",
  robots: { index: false, follow: false },
};
const notices: Record<string, string> = {
  saved: "Đã lưu setting và ghi audit metadata.",
  deleted: "Đã xóa setting và ghi audit metadata.",
  invalid: "Key hoặc JSON value chưa hợp lệ.",
  confirm: "Hãy nhập XOA để xác nhận.",
  error: "Không thể thực hiện thay đổi.",
  sepay_enabled: "Đã bật tự động xác nhận thanh toán qua SePay.",
  sepay_disabled: "Đã tắt SePay tự động. Thanh toán đang được xác nhận thủ công.",
  sepay_error: "Không thể thay đổi chế độ xác nhận SePay.",
  sepay_migration_required: "Database production chưa được cập nhật chức năng SePay. Hãy áp dụng migration trước khi thay đổi chế độ.",
};

const SEPAY_SETTING_KEY = "payments.sepay_auto_confirmation";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (!can(principal.role, "manage_content")) redirect("/admin");
  const params = await searchParams;
  const query = (params.q || "").trim().slice(0, 80);
  const supabase = await createAuthServerClient();
  let request = supabase.from("site_settings").select("*").order("key").limit(50);
  if (query) request = request.ilike("key", `%${query}%`);
  const [settingsResult, sepayResult] = await Promise.all([
    request,
    supabase.from("site_settings").select("*").eq("key", SEPAY_SETTING_KEY).maybeSingle(),
  ]);
  const { data: items, error } = settingsResult;
  const sepaySetting = sepayResult.data;
  const sepaySchemaReady = !sepayResult.error && Boolean(sepaySetting);
  const sepayValue = sepaySetting?.value;
  const sepayAutoEnabled = Boolean(
    sepayValue && typeof sepayValue === "object" && !Array.isArray(sepayValue)
      && "enabled" in sepayValue && sepayValue.enabled === true,
  );
  const canManagePayments = can(principal.role, "manage_operations");

  return (
    <main className={styles.adminShell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Admin Console · {principal.role}</p>
          <h1>Settings</h1>
          <p>Giá trị được lưu dạng JSON; audit chỉ giữ metadata và SHA-256.</p>
        </div>
        <Link className={styles.secondaryLink} href="/admin">Tổng quan</Link>
      </header>
      <AdminToast
        message={params.status ? notices[params.status] : undefined}
        tone={["invalid", "confirm", "error", "sepay_error", "sepay_migration_required"].includes(params.status || "") ? "error" : "success"}
        cleanHref={query ? `/admin/settings?q=${encodeURIComponent(query)}` : "/admin/settings"}
      />
      {error ? <AdminToast message="Không thể tải settings." tone="error" cleanHref="/admin/settings" /> : null}
      <section className={`${styles.adminPanel} ${styles.operationSetting}`}>
        <div className={styles.operationSettingHeader}>
          <div>
            <p className={styles.eyebrow}>Thanh toán · SePay</p>
            <h2>Tự động xác nhận chuyển khoản</h2>
          </div>
          <span className={sepayAutoEnabled ? styles.active : styles.inactive}>
            {sepayAutoEnabled ? "Đang bật" : "Kiểm tra thủ công"}
          </span>
        </div>
        <p>
          Khi tắt, webhook hợp lệ vẫn được lưu để đối soát nhưng hệ thống không tự
          chuyển lịch hẹn sang trạng thái đã thanh toán.
        </p>
        {!sepaySchemaReady ? (
          <p className={styles.securityNote}>
            Chức năng đang được khóa an toàn vì database chưa có migration
            <code> 202607270002_sepay_auto_confirmation_setting.sql</code>.
          </p>
        ) : canManagePayments ? (
          <ConfirmToggle
            checked={sepayAutoEnabled}
            action={setSepayAutoConfirmationAction}
            label="Tự động xác nhận thanh toán qua SePay"
            confirmTitle={sepayAutoEnabled ? "Tắt xác nhận tự động qua SePay?" : "Bật xác nhận tự động qua SePay?"}
            confirmMessage={sepayAutoEnabled
              ? "Các webhook hợp lệ vẫn được lưu, nhưng lịch hẹn chỉ chuyển trạng thái sau khi bạn kiểm tra và xác nhận thủ công."
              : "Giao dịch khớp tài khoản, số tiền và mã chuyển khoản sẽ tự động chuyển lịch hẹn sang trạng thái đã thanh toán."}
          />
        ) : (
          <p className={styles.securityNote}>Chỉ owner hoặc admin được thay đổi chế độ này.</p>
        )}
      </section>
      <section className={styles.adminPanel}>
        <h2>Tạo setting</h2>
        <SettingForm />
      </section>
      <section className={styles.adminPanel}>
        <div className={styles.sectionHeading}>
          <h2>Tìm và chỉnh sửa</h2><span>Tối đa 50 kết quả</span>
        </div>
        <form className={styles.searchForm} method="get">
          <input name="q" defaultValue={query} placeholder="Tìm theo key…" />
          <button className={styles.submit} type="submit">Tìm kiếm</button>
        </form>
        <div className={styles.recordList}>
          {items?.filter((item) => item.key !== SEPAY_SETTING_KEY).map((item) => (
            <article className={styles.recordCard} key={item.key}>
              <div className={styles.recordSummary}>
                <div><strong>{item.key}</strong><span>{item.description || "Không có mô tả"}</span></div>
                <span className={item.is_public ? styles.active : styles.inactive}>
                  {item.is_public ? "Public" : "Private"}
                </span>
              </div>
              <details>
                <summary>Chỉnh sửa setting</summary>
                <SettingForm item={item} />
                <form className={styles.dangerForm} action={deleteSettingAction}>
                  <input type="hidden" name="key" value={item.key} />
                  <label className={styles.field}>Nhập <strong>XOA</strong> để xác nhận
                    <input name="confirmation" autoComplete="off" required />
                  </label>
                  <button className={styles.dangerButton} type="submit">Xóa setting</button>
                </form>
              </details>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
