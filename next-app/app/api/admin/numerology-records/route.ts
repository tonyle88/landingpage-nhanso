import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import {
  NUMEROLOGY_EXPORT_BUCKET,
  NUMEROLOGY_HISTORY_PAGE_SIZE,
  parseNumerologyHistoryPage,
  toNumerologyRecordListItem,
} from "@/lib/admin/numerology-records";
import { getNumerologyHistoryLimit } from "@/lib/admin/numerology-records.server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServiceServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PDF_BYTES = 12 * 1024 * 1024;
const MAX_JPEG_BYTES = 6 * 1024 * 1024;
const MAX_RESULT_BYTES = 200 * 1024;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function isValidBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  const earliest = new Date("1900-01-01T00:00:00Z");
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return !Number.isNaN(date.getTime()) && date >= earliest && date < tomorrow;
}

function hasPdfSignature(bytes: Uint8Array) {
  return bytes.length > 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
}

function hasJpegSignature(bytes: Uint8Array) {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export async function GET(request: Request) {
  const principal = await getAdminPrincipal();
  if (!principal) return jsonError("Phiên đăng nhập đã hết hạn.", 401);

  const historyLimit = await getNumerologyHistoryLimit();
  const page = parseNumerologyHistoryPage(
    new URL(request.url).searchParams.get("page"),
    historyLimit,
  );
  const offset = (page - 1) * NUMEROLOGY_HISTORY_PAGE_SIZE;
  const supabase = await createAuthServerClient();
  const { data, error, count } = await supabase
    .from("numerology_records")
    .select(
      "id,report_number,customer_name,birth_date,pdf_byte_size,image_byte_size,updated_at",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range(
      offset,
      Math.min(offset + NUMEROLOGY_HISTORY_PAGE_SIZE - 1, historyLimit - 1),
    );

  if (error) {
    console.error("numerology history list failed", error.code);
    return jsonError("Không thể tải danh sách hồ sơ gần đây.", 503);
  }

  const total = Math.min(count || 0, historyLimit);
  return Response.json({
    records: (data || []).map(toNumerologyRecordListItem),
    page,
    pageSize: NUMEROLOGY_HISTORY_PAGE_SIZE,
    total,
    pageCount: Math.max(1, Math.ceil(total / NUMEROLOGY_HISTORY_PAGE_SIZE)),
    historyLimit,
  });
}

export async function POST(request: Request) {
  const principal = await getAdminPrincipal();
  if (!principal) return jsonError("Phiên đăng nhập đã hết hạn.", 401);
  if (!can(principal.role, "manage_content")) {
    return jsonError("Tài khoản chỉ có quyền xem hồ sơ.", 403);
  }

  const historyLimit = await getNumerologyHistoryLimit();
  const service = createServiceServerClient();
  if (!service) return jsonError("Kho lưu trữ chưa được cấu hình.", 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Dữ liệu tải lên không hợp lệ.", 400);
  }

  const customerName = String(form.get("customerName") || "").trim();
  const reportNumber = Number.parseInt(String(form.get("reportNumber") || ""), 10);
  const normalizedName = String(form.get("normalizedName") || "").trim();
  const birthDate = String(form.get("birthDate") || "").trim();
  const resultData = String(form.get("resultData") || "");
  const pdfFile = form.get("pdf");
  const imageFile = form.get("image");

  if (customerName.length < 2 || customerName.length > 160) {
    return jsonError("Họ tên khách hàng không hợp lệ.", 400);
  }
  if (!Number.isSafeInteger(reportNumber) || reportNumber < 1 || reportNumber > 999_999_999) {
    return jsonError("Số hồ sơ không hợp lệ.", 400);
  }
  if (normalizedName.length < 2 || normalizedName.length > 180) {
    return jsonError("Tên chuẩn hóa không hợp lệ.", 400);
  }
  if (!isValidBirthDate(birthDate)) {
    return jsonError("Ngày sinh không hợp lệ.", 400);
  }
  if (!resultData || new TextEncoder().encode(resultData).byteLength > MAX_RESULT_BYTES) {
    return jsonError("Dữ liệu kết quả quá lớn hoặc không hợp lệ.", 400);
  }
  try {
    const parsed = JSON.parse(resultData);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
  } catch {
    return jsonError("Dữ liệu kết quả không hợp lệ.", 400);
  }
  if (!(pdfFile instanceof File) || !pdfFile.size || pdfFile.size > MAX_PDF_BYTES) {
    return jsonError("File PDF không hợp lệ hoặc vượt quá 12 MB.", 400);
  }
  if (!(imageFile instanceof File) || !imageFile.size || imageFile.size > MAX_JPEG_BYTES) {
    return jsonError("File ảnh không hợp lệ hoặc vượt quá 6 MB.", 400);
  }

  const pdfBytes = new Uint8Array(await pdfFile.arrayBuffer());
  const rawImageBytes = new Uint8Array(await imageFile.arrayBuffer());
  if (!hasPdfSignature(pdfBytes)) return jsonError("Sai định dạng file PDF.", 400);
  if (!hasJpegSignature(rawImageBytes)) return jsonError("Sai định dạng ảnh JPG.", 400);

  let imageBytes: Uint8Array;
  try {
    imageBytes = new Uint8Array(await sharp(rawImageBytes, { failOn: "warning" })
      .rotate()
      .resize({
        width: 1588,
        height: 2246,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 84,
        progressive: true,
        mozjpeg: true,
        chromaSubsampling: "4:4:4",
      })
      .toBuffer());
  } catch {
    return jsonError("Không thể tối ưu ảnh JPG.", 400);
  }

  const { data: existing } = await service
    .from("numerology_records")
    .select("id,report_number,full_pdf_path,a4_image_path")
    .eq("normalized_name", normalizedName)
    .eq("birth_date", birthDate)
    .maybeSingle();
  const { data: reportNumberConflict, error: reportNumberConflictError } = await service
    .from("numerology_records")
    .select("id")
    .eq("report_number", reportNumber)
    .neq("id", existing?.id || "00000000-0000-0000-0000-000000000000")
    .maybeSingle();
  if (reportNumberConflictError) {
    console.error("numerology report number conflict check failed", reportNumberConflictError.code);
    return jsonError("Không thể kiểm tra số hồ sơ lúc này.", 503);
  }
  if (reportNumberConflict) {
    return jsonError(`Số hồ sơ ${reportNumber} đã được sử dụng.`, 409);
  }
  const id = existing?.id || randomUUID();
  const pdfPath = `records/${id}/full.pdf`;
  const imagePath = `records/${id}/a4.jpg`;
  const uploadedPaths: string[] = [];

  const { error: pdfUploadError } = await service.storage
    .from(NUMEROLOGY_EXPORT_BUCKET)
    .upload(pdfPath, pdfBytes, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: true,
    });
  if (pdfUploadError) {
    console.error("numerology pdf upload failed", pdfUploadError.message);
    return jsonError("Không thể lưu PDF vào kho riêng tư.", 503);
  }
  uploadedPaths.push(pdfPath);

  const { error: imageUploadError } = await service.storage
    .from(NUMEROLOGY_EXPORT_BUCKET)
    .upload(imagePath, imageBytes, {
      contentType: "image/jpeg",
      cacheControl: "3600",
      upsert: true,
    });
  if (imageUploadError) {
    await service.storage.from(NUMEROLOGY_EXPORT_BUCKET).remove(uploadedPaths);
    console.error("numerology image upload failed", imageUploadError.message);
    return jsonError("Không thể lưu ảnh A4 vào kho riêng tư.", 503);
  }
  uploadedPaths.push(imagePath);

  const now = new Date().toISOString();
  const { data: saved, error: saveError } = await service
    .from("numerology_records")
    .upsert({
      id,
      report_number: reportNumber,
      customer_name: customerName,
      normalized_name: normalizedName,
      birth_date: birthDate,
      result_data: JSON.parse(resultData),
      full_pdf_path: pdfPath,
      a4_image_path: imagePath,
      pdf_byte_size: pdfBytes.byteLength,
      image_byte_size: imageBytes.byteLength,
      created_by: principal.userId,
      updated_at: now,
    }, { onConflict: "normalized_name,birth_date" })
    .select("id,report_number,customer_name,birth_date,pdf_byte_size,image_byte_size,updated_at")
    .single();

  if (saveError || !saved) {
    if (!existing) {
      await service.storage.from(NUMEROLOGY_EXPORT_BUCKET).remove(uploadedPaths);
    }
    console.error("numerology metadata save failed", saveError?.code);
    if (saveError?.code === "23505") {
      return jsonError(`Số hồ sơ ${reportNumber} đã được sử dụng.`, 409);
    }
    return jsonError("Không thể lưu hồ sơ khách hàng.", 503);
  }

  const { data: staleRecords } = await service
    .from("numerology_records")
    .select("id,full_pdf_path,a4_image_path")
    .order("updated_at", { ascending: false })
    .range(historyLimit, historyLimit + 999);
  if (staleRecords?.length) {
    const stalePaths = staleRecords.flatMap((record) => [
      record.full_pdf_path,
      record.a4_image_path,
    ]);
    await service.storage.from(NUMEROLOGY_EXPORT_BUCKET).remove(stalePaths);
    await service
      .from("numerology_records")
      .delete()
      .in("id", staleRecords.map((record) => record.id));
  }

  return Response.json({ record: toNumerologyRecordListItem(saved) }, { status: 201 });
}
