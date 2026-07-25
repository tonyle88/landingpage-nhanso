import { cancelBooking } from "@/lib/booking-api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return cancelBooking(request);
}

