import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { NUMEROLOGY_EXPORT_BUCKET } from "@/lib/admin/numerology-records";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServiceServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "khach-hang";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const principal = await getAdminPrincipal();
  if (!principal) return new Response("Unauthorized", { status: 401 });

  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }
  const type = new URL(request.url).searchParams.get("type");
  if (type !== "pdf" && type !== "jpg") {
    return new Response("Invalid file type", { status: 400 });
  }

  const supabase = await createAuthServerClient();
  const { data: record, error } = await supabase
    .from("numerology_records")
    .select("customer_name,full_pdf_path,a4_image_path")
    .eq("id", id)
    .maybeSingle();
  if (error || !record) return new Response("Not found", { status: 404 });

  const service = createServiceServerClient();
  if (!service) return new Response("Storage unavailable", { status: 503 });
  const path = type === "pdf" ? record.full_pdf_path : record.a4_image_path;
  const { data: file, error: downloadError } = await service.storage
    .from(NUMEROLOGY_EXPORT_BUCKET)
    .download(path);
  if (downloadError || !file) return new Response("File not found", { status: 404 });

  const extension = type === "pdf" ? "pdf" : "jpg";
  const contentType = type === "pdf" ? "application/pdf" : "image/jpeg";
  const filename = `nhan-so-${safeFilename(record.customer_name)}.${extension}`;
  return new Response(await file.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
