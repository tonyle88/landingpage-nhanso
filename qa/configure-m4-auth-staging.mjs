import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
if (projectRef !== "dwledqvsooobegpqljur" || !accessToken) {
  throw new Error("Refusing to configure a non-staging Supabase target");
}
const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
const headers = {
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
};
const evidence = new Set();
const sample = async () => {
  try {
    const { stdout } = await execFileAsync("/usr/sbin/lsof", [
      "-a",
      "-p",
      String(process.pid),
      "-iTCP",
      "-n",
      "-P",
    ]);
    for (const line of stdout.split("\n")) {
      const match = line.match(/TCP\s+\S+->(\S+)\s+\(ESTABLISHED\)/);
      if (match) evidence.add(match[1]);
    }
  } catch {}
};
const timer = setInterval(sample, 25);

try {
  const beforeResponse = await fetch(endpoint, { headers });
  if (!beforeResponse.ok) {
    throw new Error(`Auth config read failed (${beforeResponse.status})`);
  }
  const before = await beforeResponse.json();
  let changed = false;
  if (before.disable_signup !== true) {
    const updateResponse = await fetch(endpoint, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ disable_signup: true }),
    });
    if (!updateResponse.ok) {
      throw new Error(`Auth config update failed (${updateResponse.status})`);
    }
    changed = true;
  }
  const afterResponse = await fetch(endpoint, { headers });
  if (!afterResponse.ok) {
    throw new Error(`Auth config verification failed (${afterResponse.status})`);
  }
  const after = await afterResponse.json();
  if (after.disable_signup !== true) {
    throw new Error("Public signup remains enabled on staging");
  }
  await sample();
  console.log(
    JSON.stringify({
      status: "PASS",
      target: projectRef,
      publicSignupDisabled: true,
      changed,
      networkEvidence: [...evidence].sort(),
      networkEvidenceCaptured: evidence.size > 0,
    }),
  );
} finally {
  clearInterval(timer);
}
