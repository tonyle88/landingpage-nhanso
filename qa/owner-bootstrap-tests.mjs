import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyOwnerBootstrapState,
  ownerDisplayName,
} from "./lib/owner-bootstrap.mjs";

test("allows a pristine single-user bootstrap", () => {
  assert.deepEqual(
    classifyOwnerBootstrapState({
      authUserCount: 1,
      profileCount: 0,
      roleRows: [],
    }),
    { action: "bootstrap" },
  );
});

test("is idempotent for the sole existing owner", () => {
  assert.deepEqual(
    classifyOwnerBootstrapState({
      authUserCount: 1,
      profileCount: 1,
      roleRows: [{ belongsToAuthUser: true, role: "owner" }],
    }),
    { action: "already-owner" },
  );
});

test("rejects ambiguous or non-owner authorization state", () => {
  assert.throws(() =>
    classifyOwnerBootstrapState({
      authUserCount: 2,
      profileCount: 0,
      roleRows: [],
    }),
  );
  assert.throws(() =>
    classifyOwnerBootstrapState({
      authUserCount: 1,
      profileCount: 1,
      roleRows: [{ belongsToAuthUser: true, role: "admin" }],
    }),
  );
});

test("derives a bounded display name without exposing it", () => {
  assert.equal(
    ownerDisplayName({
      email: "owner@example.com",
      raw_user_meta_data: { full_name: "  Owner Name  " },
    }),
    "Owner Name",
  );
  assert.equal(ownerDisplayName({ email: "owner@example.com" }), "owner");
});
