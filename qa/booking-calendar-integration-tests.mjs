import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const [bridge, delivery, migration, actions, page, controls] = await Promise.all([
  readFile(new URL("google-apps-script-calendar.gs", root), "utf8"),
  readFile(new URL("next-app/lib/booking-calendar.ts", root), "utf8"),
  readFile(
    new URL(
      "next-app/supabase/migrations/202607280003_admin_booking_calendar_management.sql",
      root,
    ),
    "utf8",
  ),
  readFile(
    new URL("next-app/app/admin/bookings/actions.ts", root),
    "utf8",
  ),
  readFile(
    new URL("next-app/app/admin/bookings/page.tsx", root),
    "utf8",
  ),
  readFile(
    new URL(
      "next-app/app/admin/bookings/booking-calendar-actions.tsx",
      root,
    ),
    "utf8",
  ),
]);

test("Apps Script bridge authenticates requests and prevents replay", () => {
  assert.match(bridge, /computeHmacSha256Signature/);
  assert.match(bridge, /Utilities\.Charset\.UTF_8/);
  assert.match(bridge, /BOOKING_CALENDAR_SECRET[\s\S]*\.trim\(\)/);
  assert.match(bridge, /MAX_CLOCK_SKEW_SECONDS/);
  assert.match(bridge, /calendar-nonce:/);
  assert.match(bridge, /BOOKING_CALENDAR_SECRET/);
  assert.doesNotMatch(bridge, /BOOKING_CALENDAR_SECRET\s*=\s*['"][^'"]+/);
});

test("Calendar integration is server-only and does not expose its secret", () => {
  assert.match(delivery, /import "server-only"/);
  assert.match(delivery, /BOOKING_CALENDAR_SECRET/);
  assert.match(delivery, /createHmac\("sha256"/);
  assert.match(delivery, /booking\.calendar\.sync/);
  assert.match(delivery, /booking\.calendar\.delete/);
  assert.doesNotMatch(page, /process\.env\.BOOKING_CALENDAR_SECRET/);
  assert.doesNotMatch(controls, /BOOKING_CALENDAR_SECRET/);
  assert.match(delivery, /const CALENDAR_TIMEOUT_MS = 20_000/);
});

test("reschedule and cancellation enforce a 72-hour boundary in database", () => {
  assert.match(
    migration,
    /v_before\.slot_start < now\(\) \+ interval '72 hours'/,
  );
  assert.match(
    migration,
    /p_slot_start < now\(\) \+ interval '72 hours'/,
  );
  assert.match(migration, /booking\.rescheduled/);
  assert.match(migration, /booking\.cancelled_by_admin/);
  assert.match(migration, /slot_start < p_slot_end[\s\S]*slot_end > p_slot_start/);
});

test("admin actions synchronize Calendar and notify both parties", () => {
  assert.match(actions, /syncBookingCalendarEvent/);
  assert.match(actions, /deleteBookingCalendarEvent/);
  assert.match(actions, /sendBookingChangeEmailsForBookingId/);
  assert.match(actions, /inside_72_hours/);
  assert.match(controls, /Đồng bộ lại Calendar/);
  assert.match(page, /Google Calendar/);
});
