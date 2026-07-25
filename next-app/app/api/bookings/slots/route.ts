import { listUnavailableBookingSlots } from "@/lib/booking-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return listUnavailableBookingSlots(request);
}

