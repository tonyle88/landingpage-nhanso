export function classifyOwnerBootstrapState({
  authUserCount,
  profileCount,
  roleRows,
}) {
  if (authUserCount !== 1) {
    throw new Error(`Expected exactly 1 Auth user; found ${authUserCount}`);
  }

  if (roleRows.length === 0 && profileCount <= 1) {
    return { action: "bootstrap" };
  }

  if (
    roleRows.length === 1 &&
    roleRows[0].belongsToAuthUser === true &&
    roleRows[0].role === "owner" &&
    profileCount === 1
  ) {
    return { action: "already-owner" };
  }

  throw new Error("Refusing owner bootstrap because the authorization state is not pristine");
}

export function ownerDisplayName(user) {
  const metadata = user?.raw_user_meta_data;
  const candidates = [
    metadata?.full_name,
    metadata?.name,
    typeof user?.email === "string" ? user.email.split("@")[0] : "",
    "Staging owner",
  ];
  const value = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim(),
  );
  return value.trim().slice(0, 120);
}
