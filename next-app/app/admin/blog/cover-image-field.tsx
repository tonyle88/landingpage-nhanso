"use client";

import { useEffect, useId, useRef, useState } from "react";
import { prepareCoverImage } from "./prepare-cover-image";
import styles from "../admin.module.css";

export function CoverImageField({
  coverUrl,
  thumbnailUrl,
}: {
  coverUrl?: string | null;
  thumbnailUrl?: string | null;
}) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [failedPreview, setFailedPreview] = useState<string | null>(null);
  const preparationId = useRef(0);
  const fileInputId = useId();

  useEffect(() => {
    if (!localPreview) return;
    return () => URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  const preview = localPreview || thumbnailUrl || coverUrl || "";
  const canShowPreview = Boolean(preview) && failedPreview !== preview;

  return (
    <div className={styles.coverWorkflow}>
      <label className={styles.field}>URL ảnh bìa HTTPS
        <input name="cover_url" type="url" defaultValue={coverUrl || ""} />
      </label>
      <div className={styles.field}>
        <span>Hoặc tải ảnh bìa mới lên Supabase Storage</span>
        <label className={styles.uploadPicker} htmlFor={fileInputId}>
          <input
            id={fileInputId}
            className={styles.srOnly}
            name="cover_file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-busy={uploadMessage === "Đang tối ưu ảnh…"}
            onChange={async (event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              const currentPreparation = preparationId.current + 1;
              preparationId.current = currentPreparation;
              setFailedPreview(null);
              setUploadMessage("");
              input.setCustomValidity("");
              if (!file) {
                setFileName("");
                setLocalPreview(null);
                return;
              }

              input.setCustomValidity("Đang tối ưu ảnh, vui lòng chờ.");
              setFileName(file.name);
              setUploadMessage("Đang tối ưu ảnh…");
              try {
                const titleField = input.form?.elements.namedItem("title");
                const title = titleField instanceof HTMLInputElement ? titleField.value : "";
                const prepared = await prepareCoverImage(file, title);
                if (preparationId.current !== currentPreparation) return;
                const transfer = new DataTransfer();
                transfer.items.add(prepared);
                input.files = transfer.files;
                input.setCustomValidity("");
                setFileName(prepared.name);
                setLocalPreview(URL.createObjectURL(prepared));
                setUploadMessage("Ảnh đã được tối ưu và sẵn sàng tải lên.");
              } catch (error) {
                if (preparationId.current !== currentPreparation) return;
                const message = error instanceof Error
                  ? error.message
                  : "Không thể xử lý ảnh này.";
                input.value = "";
                input.setCustomValidity(message);
                input.reportValidity();
                input.setCustomValidity("");
                setFileName("");
                setLocalPreview(null);
                setUploadMessage(message);
              }
            }}
          />
          <span className={styles.uploadIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img">
              <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v3A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-3" />
            </svg>
          </span>
          <span className={styles.uploadCopy}>
            <strong>{fileName || "Chọn ảnh bìa"}</strong>
            <small>
              {uploadMessage || (fileName
                ? "Ảnh đã sẵn sàng để tải lên khi lưu bài viết."
                : "JPEG, PNG hoặc WebP · tối đa 5 MB")}
            </small>
          </span>
          <span className={styles.uploadButton}>Chọn tệp</span>
        </label>
        <small>
          Chỉ tải một ảnh. Hệ thống tự tạo ảnh bìa và thumbnail WebP chất lượng 70%; tối đa 5 MB.
        </small>
      </div>
      <div className={styles.thumbnailPreview} aria-live="polite">
        <div>
          <strong>Thumbnail tự động</strong>
          <small>Tỷ lệ 16:9, dùng tại danh sách bài viết và bài liên quan.</small>
        </div>
        {canShowPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Xem trước thumbnail bài viết"
            onError={() => setFailedPreview(preview)}
          />
        ) : (
          <div className={styles.thumbnailPlaceholder}>
            <span className={styles.thumbnailPlaceholderIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img">
                <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
                <path d="m5 16 4.2-4.2 3.1 3.1 2.1-2.1L20 18M16.5 9.25h.01" />
              </svg>
            </span>
            <strong>Chưa có ảnh xem trước</strong>
            <small>Chọn ảnh bìa để hệ thống tạo thumbnail tự động.</small>
          </div>
        )}
      </div>
    </div>
  );
}
