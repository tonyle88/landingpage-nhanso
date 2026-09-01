import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  bytesToGiB,
  bytesToMiB,
  calculateCapacity,
  formatBytes,
  parseCapacityLimits,
  parseSystemUsage,
  type CapacityMetric,
} from "@/lib/admin/system-capacity";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { PRODUCTION_SUPABASE_URL } from "@/lib/supabase/config";
import { AdminToast } from "../admin-toast";
import styles from "../admin.module.css";
import { saveCapacityLimitsAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trạng thái hệ thống | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

const notices: Record<string, string> = {
  saved: "Đã cập nhật mốc dung lượng để theo dõi.",
  invalid: "Mốc dung lượng chưa hợp lệ. Vui lòng nhập số lớn hơn 0.",
  error: "Chưa thể lưu cấu hình dung lượng.",
};

const checkedAtFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "Asia/Ho_Chi_Minh",
});

function metricTone(metric: CapacityMetric) {
  if (metric.percent >= 90) return styles.systemMetricDanger;
  if (metric.percent >= 75) return styles.systemMetricWarning;
  return styles.systemMetricHealthy;
}

function CapacityCard({
  label,
  description,
  metric,
}: {
  label: string;
  description: string;
  metric: CapacityMetric;
}) {
  const remainingLabel = metric.exceededBytes
    ? `Vượt ${formatBytes(metric.exceededBytes)}`
    : `Còn ${formatBytes(metric.remainingBytes)}`;

  return (
    <article className={`${styles.systemMetricCard} ${metricTone(metric)}`}>
      <div className={styles.systemMetricHeading}>
        <div>
          <span>Supabase</span>
          <h2>{label}</h2>
        </div>
        <strong>{Math.round(metric.percent)}%</strong>
      </div>
      <div className={styles.systemMetricValues}>
        <p><span>Đã dùng</span><strong>{formatBytes(metric.usedBytes)}</strong></p>
        <p><span>Giới hạn</span><strong>{formatBytes(metric.limitBytes)}</strong></p>
        <p><span>Khả dụng</span><strong>{remainingLabel}</strong></p>
      </div>
      <div
        className={styles.systemProgress}
        role="progressbar"
        aria-label={`Dung lượng ${label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(metric.percent)}
      >
        <span style={{ width: `${metric.percent}%` }} />
      </div>
      <p className={styles.systemMetricDescription}>{description}</p>
    </article>
  );
}

export default async function AdminSystemStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (principal.role !== "owner") redirect("/admin");

  const supabase = await createAuthServerClient();
  const startedAt = performance.now();
  const [usageResult, settingsResult] = await Promise.all([
    supabase.rpc("admin_get_system_usage"),
    supabase
      .from("site_settings")
      .select("key,value")
      .in("key", ["system.capacity_limits", "system.capacity_snapshot"]),
  ]);
  const responseTimeMs = Math.max(1, Math.round(performance.now() - startedAt));
  const settingValues = new Map(
    (settingsResult.data || []).map((setting) => [setting.key, setting.value]),
  );
  const liveUsage = usageResult.error
    ? null
    : parseSystemUsage(usageResult.data);
  const snapshotUsage = parseSystemUsage(
    settingValues.get("system.capacity_snapshot"),
  );
  const usage = liveUsage || snapshotUsage;
  const usingSnapshot = !liveUsage && Boolean(snapshotUsage);
  const limits = parseCapacityLimits(
    settingValues.get("system.capacity_limits"),
  );
  const migrationMissing = Boolean(
    !usage && usageResult.error &&
      ["42883", "PGRST202"].includes(usageResult.error.code || ""),
  );
  const databaseMetric = usage
    ? calculateCapacity(usage.databaseBytes, limits.databaseLimitBytes)
    : null;
  const storageMetric = usage
    ? calculateCapacity(usage.storageBytes, limits.storageLimitBytes)
    : null;

  const vercelActive = process.env.VERCEL === "1";
  const vercelEnvironment = process.env.VERCEL_ENV || "local";
  const deploymentHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || null;
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || null;
  const region = process.env.VERCEL_REGION || null;
  const projectRef = new URL(PRODUCTION_SUPABASE_URL).hostname.split(".")[0];
  const planSelectValue = ["free", "pro", "team", "custom"].includes(
    limits.supabasePlan,
  )
    ? limits.supabasePlan
    : "custom";
  const { status } = await searchParams;

  return (
    <main className={styles.adminShell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Admin Console · Hệ thống</p>
          <h1>Trạng thái hệ thống</h1>
          <p>Theo dõi dung lượng dữ liệu và môi trường đang phục vụ website.</p>
        </div>
        <Link className={styles.secondaryLink} href="/admin">Tổng quan</Link>
      </header>

      <AdminToast
        message={status ? notices[status] : undefined}
        tone={status === "saved" ? "success" : "error"}
        cleanHref="/admin/system-status"
      />

      {migrationMissing ? (
        <div className={styles.alertPanel} role="alert">
          <strong>Chưa có bộ đo dung lượng</strong>
          <span>Cần áp dụng migration 202609010001_admin_system_usage.sql rồi tải lại trang.</span>
        </div>
      ) : usageResult.error || !usage ? (
        <div className={styles.alertPanel} role="alert">
          <strong>Chưa đọc được số liệu Supabase</strong>
          <span>Hệ thống không hiển thị số ước đoán. Vui lòng thử lại hoặc kiểm tra quyền owner.</span>
        </div>
      ) : null}

      {usingSnapshot ? (
        <div className={styles.systemSnapshotNotice} role="status">
          <strong>Số liệu dự phòng đang hoạt động</strong>
          <span>Supabase tự cập nhật ảnh chụp dung lượng mỗi 15 phút trong lúc REST API làm mới schema cache.</span>
        </div>
      ) : null}

      <section className={styles.systemOverview} aria-label="Tổng quan trạng thái">
        <div className={styles.systemHealthCard}>
          <span className={usage ? styles.systemHealthOnline : styles.systemHealthWarning} />
          <div><strong>{usage ? "Supabase đang phản hồi" : "Supabase cần kiểm tra"}</strong><small>{usingSnapshot ? "Ảnh chụp tối đa 15 phút trước" : `${responseTimeMs} ms · lần đọc hiện tại`}</small></div>
        </div>
        <div className={styles.systemHealthCard}>
          <span className={vercelActive ? styles.systemHealthOnline : styles.systemHealthNeutral} />
          <div><strong>{vercelActive ? "Vercel deployment đang chạy" : "Đang xem từ môi trường local"}</strong><small>{vercelEnvironment}</small></div>
        </div>
        <div className={styles.systemHealthCard}>
          <span className={styles.systemHealthOnline} />
          <div><strong>Chỉ chủ sở hữu được xem</strong><small>Không gửi token xuống trình duyệt</small></div>
        </div>
      </section>

      <section className={styles.systemMetricsGrid}>
        {databaseMetric ? (
          <CapacityCard
            label="Database"
            description="Bao gồm dữ liệu Postgres, chỉ mục và các cấu trúc trong cơ sở dữ liệu."
            metric={databaseMetric}
          />
        ) : null}
        {storageMetric ? (
          <CapacityCard
            label="Storage"
            description={`${new Intl.NumberFormat("vi-VN").format(usage?.storageObjects || 0)} tệp đang được lưu trong các bucket Supabase.`}
            metric={storageMetric}
          />
        ) : null}
      </section>

      <section className={`${styles.adminPanel} ${styles.systemProviderPanel}`}>
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>Vercel Deployment</p><h2>Môi trường triển khai</h2></div>
          <span className={vercelActive ? styles.systemProviderActive : styles.systemProviderNeutral}>{vercelActive ? "Đang hoạt động" : "Local"}</span>
        </div>
        <div className={styles.systemDeploymentGrid}>
          <p><span>Môi trường</span><strong>{vercelEnvironment}</strong></p>
          <p><span>Khu vực</span><strong>{region || "Vercel tự điều phối"}</strong></p>
          <p><span>Phiên bản</span><strong>{commitSha || "Chưa có commit deployment"}</strong></p>
          <p><span>Tên miền</span><strong>{deploymentHost || "Chưa có trên local"}</strong></p>
        </div>
        <div className={styles.systemProviderNote}>
          <div>
            <strong>Usage Vercel được quản lý theo tài khoản/nhóm</strong>
            <p>Vercel chưa cung cấp một con số “dung lượng còn lại” tổng hợp ổn định qua REST API cho ứng dụng. Mở Usage chính thức để xem băng thông, Functions và chi phí trong kỳ.</p>
          </div>
          <a className={styles.secondaryLink} href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">Mở Vercel Usage ↗</a>
        </div>
      </section>

      <section className={`${styles.adminPanel} ${styles.systemSettingsPanel}`}>
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>Mốc cảnh báo</p><h2>Cấu hình hạn mức Supabase</h2></div>
          <span>Gói: {limits.supabasePlan}</span>
        </div>
        <p className={styles.systemSettingsIntro}>Hạn mức thay đổi theo gói Supabase. Cập nhật đúng mức đang dùng để thanh “còn lại” không bị sai.</p>
        <form className={styles.systemSettingsForm} action={saveCapacityLimitsAction}>
          <label className={styles.field}>Tên gói
            <select name="supabase_plan" defaultValue={planSelectValue}>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="team">Team</option>
              <option value="custom">Tùy chỉnh</option>
            </select>
          </label>
          <label className={styles.field}>Giới hạn Database (MB)
            <input name="database_limit_mib" type="number" min="1" max="100000000" step="1" defaultValue={bytesToMiB(limits.databaseLimitBytes)} required />
          </label>
          <label className={styles.field}>Giới hạn Storage (GB)
            <input name="storage_limit_gib" type="number" min="0.01" max="100000" step="0.01" defaultValue={bytesToGiB(limits.storageLimitBytes)} required />
          </label>
          <button className={styles.submit} type="submit" data-pending-label="Đang lưu mốc dung lượng…">Lưu hạn mức</button>
        </form>
        <div className={styles.systemLinks}>
          <a href={`https://supabase.com/dashboard/project/${projectRef}/settings/billing`} target="_blank" rel="noreferrer">Mở Supabase Billing ↗</a>
          <span>{usage?.checkedAt ? `Cập nhật ${checkedAtFormatter.format(new Date(usage.checkedAt))}` : "Chưa có thời điểm đo"}</span>
        </div>
      </section>
    </main>
  );
}
