const BLOCK_BREAKS = /<\/(?:p|div|li|h[1-6]|blockquote)>|<br\s*\/?\s*>/gi;
const HTML_TAG = /<[^>]*>/g;

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

/**
 * Legacy content was sometimes saved by Quill as <p>...</p> while its target
 * was configured as plain text. Convert that markup to readable text instead
 * of exposing literal tags on the landing page.
 */
export function landingPlainText(value: unknown): string {
  const source = value == null ? "" : String(value);
  if (!/<\/?[a-z][\s\S]*>/i.test(source)) return source.trim();
  return source
    .replace(BLOCK_BREAKS, "\n")
    .replace(HTML_TAG, "")
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/gi, (entity) =>
      ENTITIES[entity.toLowerCase()] || entity,
    )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
