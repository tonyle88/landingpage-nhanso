import "server-only";

import { unstable_cache } from "next/cache";
import { toPublicPackage, type PublicPackage } from "@/lib/packages";
import { createPublicServerClient } from "./server";

export type PublicPackagesResult = {
  packages: PublicPackage[];
  source: "supabase" | "fallback";
};

const PACKAGES_TIMEOUT_MS = 4_000;

async function queryPublicPackages(): Promise<PublicPackagesResult> {
  const client = createPublicServerClient();
  if (!client) return { packages: [], source: "fallback" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PACKAGES_TIMEOUT_MS);

  try {
    const { data, error } = await client
      .from("packages")
      .select("*")
      .eq("enabled", true)
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true })
      .abortSignal(controller.signal);

    if (error || !data?.length) {
      return { packages: [], source: "fallback" };
    }

    const packages = data
      .map(toPublicPackage)
      .filter((item): item is PublicPackage => item !== null);

    return packages.length
      ? { packages, source: "supabase" }
      : { packages: [], source: "fallback" };
  } catch {
    return { packages: [], source: "fallback" };
  } finally {
    clearTimeout(timeout);
  }
}

const readCachedPublicPackages = unstable_cache(
  queryPublicPackages,
  ["public-packages-v1"],
  { revalidate: 300, tags: ["public-packages"] },
);

export async function getPublicPackages(): Promise<PublicPackagesResult> {
  return readCachedPublicPackages();
}
