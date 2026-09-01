export const DEFAULT_CAPACITY_LIMITS = {
  supabasePlan: "free",
  databaseLimitBytes: 500 * 1024 * 1024,
  storageLimitBytes: 1024 * 1024 * 1024,
} as const;

export type SystemUsageSnapshot = {
  databaseBytes: number;
  storageBytes: number;
  storageObjects: number;
  checkedAt: string | null;
};

export type CapacityLimits = {
  supabasePlan: string;
  databaseLimitBytes: number;
  storageLimitBytes: number;
};

export type CapacityMetric = {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  percent: number;
  exceededBytes: number;
};

function asFiniteNonNegative(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseSystemUsage(value: unknown): SystemUsageSnapshot | null {
  const record = asRecord(value);
  if (!record) return null;

  const databaseBytes = asFiniteNonNegative(record.database_bytes, -1);
  const storageBytes = asFiniteNonNegative(record.storage_bytes, -1);
  const storageObjects = asFiniteNonNegative(record.storage_objects, -1);
  if (databaseBytes < 0 || storageBytes < 0 || storageObjects < 0) return null;

  return {
    databaseBytes,
    storageBytes,
    storageObjects,
    checkedAt:
      typeof record.checked_at === "string" ? record.checked_at : null,
  };
}

export function parseCapacityLimits(value: unknown): CapacityLimits {
  const record = asRecord(value);
  const plan = record?.supabase_plan;

  return {
    supabasePlan:
      typeof plan === "string" && plan.trim() ? plan.trim().slice(0, 40) : DEFAULT_CAPACITY_LIMITS.supabasePlan,
    databaseLimitBytes: asFiniteNonNegative(
      record?.database_limit_bytes,
      DEFAULT_CAPACITY_LIMITS.databaseLimitBytes,
    ),
    storageLimitBytes: asFiniteNonNegative(
      record?.storage_limit_bytes,
      DEFAULT_CAPACITY_LIMITS.storageLimitBytes,
    ),
  };
}

export function calculateCapacity(
  usedBytes: number,
  limitBytes: number,
): CapacityMetric {
  const safeUsed = Math.max(0, usedBytes);
  const safeLimit = Math.max(1, limitBytes);

  return {
    usedBytes: safeUsed,
    limitBytes: safeLimit,
    remainingBytes: Math.max(safeLimit - safeUsed, 0),
    exceededBytes: Math.max(safeUsed - safeLimit, 0),
    percent: Math.min((safeUsed / safeLimit) * 100, 100),
  };
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: value >= 10 || unitIndex === 0 ? 0 : 2,
  }).format(value)} ${units[unitIndex]}`;
}

export function bytesToGiB(bytes: number) {
  return Math.round((bytes / 1024 ** 3) * 100) / 100;
}

export function bytesToMiB(bytes: number) {
  return Math.round((bytes / 1024 ** 2) * 100) / 100;
}
