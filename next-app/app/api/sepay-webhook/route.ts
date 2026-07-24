import { handleSepayWebhook } from "@/lib/sepay-webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleSepayWebhook(request);
}

export function GET() {
  return Response.json(
    { ok: false, message: "Method not allowed." },
    {
      status: 405,
      headers: {
        Allow: "POST",
        "Cache-Control": "no-store",
      },
    },
  );
}
