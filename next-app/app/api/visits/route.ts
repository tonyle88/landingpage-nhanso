import { recordLandingVisit } from "@/lib/landing-visits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return recordLandingVisit(request);
}
