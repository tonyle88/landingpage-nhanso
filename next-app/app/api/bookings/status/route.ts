import { getBookingStatus } from "@/lib/booking-api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return getBookingStatus(request);
}

