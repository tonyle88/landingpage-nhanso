import { acknowledgeManualPayment } from "@/lib/booking-api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return acknowledgeManualPayment(request);
}

