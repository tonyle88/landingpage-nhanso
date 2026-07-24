import { execFile } from "node:child_process";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const requireFromApp = createRequire(resolve(root, "next-app/package.json"));
const { createClient } = requireFromApp("@supabase/supabase-js");
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const secretKey = process.env.SUPABASE_SECRET_KEY;
const expectedRef = "dwledqvsooobegpqljur";
if (
  projectRef !== expectedRef ||
  supabaseUrl !== `https://${expectedRef}.supabase.co` ||
  !secretKey
) {
  throw new Error("Refusing to provision a non-staging Supabase target");
}
const admin = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const csrf = randomBytes(32).toString("hex");
const evidence = new Set();
const sampleNetwork = async () => {
  try {
    const { stdout } = await execFileAsync("/usr/sbin/lsof", [
      "-a", "-p", String(process.pid), "-iTCP", "-n", "-P",
    ]);
    for (const line of stdout.split("\n")) {
      const match = line.match(/TCP\s+\S+->(\S+)\s+\(ESTABLISHED\)/);
      if (match) evidence.add(match[1]);
    }
  } catch {}
};

function page(content) {
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<meta name="robots" content="noindex,nofollow"><title>Staging owner provisioning</title>
<style>body{font:16px system-ui;background:#f4effa;color:#2d203a;margin:0;min-height:100vh;display:grid;place-items:center}
main{width:min(440px,calc(100% - 40px));background:white;padding:32px;border-radius:20px;box-shadow:0 20px 60px #3f275526}
h1{margin-top:0}label{display:grid;gap:6px;margin:16px 0;font-weight:700}input{font:inherit;padding:12px;border:1px solid #cfc1da;border-radius:10px}
button{width:100%;padding:13px;border:0;border-radius:10px;background:#684291;color:white;font:inherit;font-weight:800}
p{line-height:1.5}.note{color:#6e6178;font-size:14px}</style></head>
<body><main>${content}</main></body></html>`;
}

function send(response, status, content) {
  response.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(page(content));
}

async function adminRequest(path, init = {}) {
  const request = fetch(`${supabaseUrl}/auth/v1/admin${path}`, {
    ...init,
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 80));
  await sampleNetwork();
  return request;
}

let completed = false;
const server = createServer(async (request, response) => {
  if (request.headers.host !== "127.0.0.1:3200") {
    send(response, 400, "<h1>Yêu cầu không hợp lệ</h1>");
    return;
  }
  if (request.method === "GET" && request.url === "/") {
    send(response, 200, `<h1>Đặt mật khẩu owner staging</h1>
      <p class="note">Mật khẩu chỉ đi từ trình duyệt local tới tiến trình local và Supabase staging; không được ghi log.</p>
      <form method="post" action="/provision">
        <input type="hidden" name="csrf" value="${csrf}">
        <label>Mật khẩu mới<input name="password" type="password" minlength="12" autocomplete="new-password" required></label>
        <label>Nhập lại mật khẩu<input name="confirmation" type="password" minlength="12" autocomplete="new-password" required></label>
        <button type="submit">Đặt mật khẩu staging</button>
      </form>`);
    return;
  }
  if (
    request.method !== "POST" ||
    request.url !== "/provision" ||
    completed
  ) {
    send(response, 405, "<h1>Yêu cầu bị từ chối</h1>");
    return;
  }

  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 8192) {
      request.destroy();
      return;
    }
  }
  try {
    const form = new URLSearchParams(raw);
    const submittedCsrf = Buffer.from(form.get("csrf") || "");
    const expectedCsrf = Buffer.from(csrf);
    if (
      submittedCsrf.length !== expectedCsrf.length ||
      !timingSafeEqual(submittedCsrf, expectedCsrf)
    ) {
      throw new Error("csrf");
    }
    const password = form.get("password") || "";
    const confirmation = form.get("confirmation") || "";
    if (
      password !== confirmation ||
      password.length < 12 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      send(response, 400, "<h1>Mật khẩu chưa đạt yêu cầu</h1><p>Cần ít nhất 12 ký tự, gồm chữ thường, chữ hoa, số và ký hiệu. Quay lại và thử lại.</p>");
      return;
    }

    const usersRequest = admin.auth.admin.listUsers({ page: 1, perPage: 2 });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 80));
    await sampleNetwork();
    const { data: usersData, error: usersError } = await usersRequest;
    const users = usersData?.users;
    if (usersError || !Array.isArray(users) || users.length !== 1) {
      throw new Error("unexpected user state");
    }
    const user = users[0];
    if (user.banned_until && Date.parse(user.banned_until) > Date.now()) {
      send(response, 409, "<h1>Tài khoản vẫn đang bị ban</h1><p>Hãy unban trong Supabase Dashboard rồi tải lại trang này.</p>");
      return;
    }
    const updateRequest = admin.auth.admin.updateUserById(user.id, { password });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 80));
    await sampleNetwork();
    const { error: updateError } = await updateRequest;
    if (updateError) throw new Error(`update failed ${updateError.status || "unknown"}`);

    completed = true;
    send(response, 200, "<h1>Đã đặt mật khẩu</h1><p>Có thể đóng tab này. Tiến trình local sẽ tự dừng.</p>");
    console.log(JSON.stringify({
      status: "PASS",
      target: projectRef,
      usersMatched: 1,
      passwordUpdated: true,
      networkEvidence: [...evidence].sort(),
      networkEvidenceCaptured: evidence.size > 0,
    }));
    setTimeout(() => server.close(), 1000);
  } catch {
    send(response, 500, "<h1>Không thể đặt mật khẩu</h1><p>Không có thay đổi nào được xác nhận. Hãy báo lại để kiểm tra log an toàn.</p>");
  }
});

server.listen(3200, "127.0.0.1", () => {
  console.log("Owner provisioning ready at http://127.0.0.1:3200");
});
