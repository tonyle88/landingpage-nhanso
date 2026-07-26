const MAX_REPORT_BYTES = 64 * 1024;

function sanitizeUrl(value: unknown) {
  const input = String(value || "").trim();
  if (!input) return "";
  if (/^(data|blob|inline|eval|self)$/i.test(input)) {
    return input.toLowerCase();
  }

  try {
    const url = new URL(input, "https://nhanso.clowcat.com.vn");
    return `${url.protocol}//${url.host}${url.pathname}`.slice(0, 500);
  } catch {
    return input.replace(/[?#].*$/, "").slice(0, 500);
  }
}

function normalizeReport(payload: Record<string, unknown>) {
  const source =
    (payload["csp-report"] as Record<string, unknown> | undefined) ||
    (payload.body as Record<string, unknown> | undefined) ||
    payload;

  return {
    type: "csp-report",
    document: sanitizeUrl(source["document-uri"] || source.documentURL),
    violatedDirective: String(
      source["violated-directive"] || source.violatedDirective || "",
    ).slice(0, 160),
    effectiveDirective: String(
      source["effective-directive"] || source.effectiveDirective || "",
    ).slice(0, 160),
    blocked: sanitizeUrl(source["blocked-uri"] || source.blockedURL),
    source: sanitizeUrl(source["source-file"] || source.sourceFile),
    line: Number(source["line-number"] || source.lineNumber || 0) || 0,
    column: Number(source["column-number"] || source.columnNumber || 0) || 0,
    disposition: String(source.disposition || "report").slice(0, 40),
  };
}

export async function handleCspReport(request: Request) {
  const rawBody = await request.text();
  if (!rawBody || Buffer.byteLength(rawBody, "utf8") > MAX_REPORT_BYTES) {
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const payload: unknown = JSON.parse(rawBody);
    const reports = Array.isArray(payload) ? payload.slice(0, 20) : [payload];
    for (const report of reports) {
      if (report && typeof report === "object") {
        console.info(JSON.stringify(normalizeReport(report)));
      }
    }
  } catch {
    console.warn("Discarded malformed CSP report.");
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
