const EXPECTED_POLICIES = [
  "admin_roles_owner_all",
  "admin_roles_self_read",
  "audit_logs_privileged_insert",
  "audit_logs_privileged_read",
  "blog_categories_content_manager_all",
  "blog_posts_content_manager_all",
  "bookings_operations_all",
  "bookings_operations_read",
  "landing_sections_content_manager_all",
  "media_assets_content_manager_all",
  "packages_content_manager_all",
  "payment_transactions_operations_all",
  "payment_transactions_operations_read",
  "profiles_owner_admin_all",
  "site_settings_content_manager_all",
  "testimonials_content_manager_all",
  "webhook_events_operations_all",
  "webhook_events_operations_read",
];

export function verifyM4DatabaseState({ roles, functions, policies }) {
  const roleSet = new Set(roles);
  const functionSet = new Set(functions);
  const policySet = new Set(policies);
  const missingPolicies = EXPECTED_POLICIES.filter(
    (policy) => !policySet.has(policy),
  );
  return {
    ownerRolePresent: roleSet.has("owner"),
    currentRoleFunctionPresent: functionSet.has("current_admin_role"),
    expectedPolicyCount: EXPECTED_POLICIES.length,
    missingPolicies,
    pass:
      roleSet.has("owner") &&
      functionSet.has("current_admin_role") &&
      missingPolicies.length === 0,
  };
}
