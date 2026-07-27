"use client";

import { useEffect, useState } from "react";
import styles from "../admin.module.css";

export function CoverImageField({
  coverUrl,
  thumbnailUrl,
}: {
  coverUrl?: string | null;
  thumbnailUrl?: string | null;
}) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  const preview = localPreview || thumbnailUrl || coverUrl || "";

  return (
    <div className={styles.coverWorkflow}>
      <label className={styles.field}>URL ảnh bìa HTTPS
        <input name="cover_url" type="url" defaultValue={coverUrl || ""} />
      </label>
      <label className={styles.field}>Hoặc tải ảnh bìa mới lên Supabase Storage
        <input
          name="cover_file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            if (localPreview) URL.revokeObjectURL(localPreview);
            const file = event.currentTarget.files?.[0];
            setLocalPreview(file ? URL.createObjectURL(file) : null);
          }}
        />
        <small>
          Chỉ tải một ảnh. Hệ thống tự tạo ảnh bìa và thumbnail WebP chất lượng 70%; tối đa 5 MB.
        </small>
      </label>
      <div className={styles.thumbnailPreview} aria-live="polite">
        <div>
          <strong>Thumbnail tự động</strong>
          <small>Tỷ lệ 16:9, dùng tại danh sách bài viết và bài liên quan.</small>
        </div>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Xem trước thumbnail bài viết" />
        ) : (
          <span>Chọn ảnh bìa để xem trước thumbnail tại đây.</span>
        )}
      </div>
    </div>
  );
}
