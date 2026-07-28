/**
 * Clow Cat Booking Calendar bridge.
 *
 * Script Properties required:
 * - BOOKING_CALENDAR_SECRET: a random secret with at least 32 characters.
 * Optional:
 * - BOOKING_CALENDAR_ID: leave empty to use the Google account's default calendar.
 *
 * Deploy as a Web App:
 * - Execute as: Me
 * - Who has access: Anyone
 *
 * The endpoint is protected by a timestamped HMAC signature. Do not put the
 * secret in this file or expose it to browser code.
 */

const CALENDAR_BRIDGE_VERSION = '2026-07-28-v2';
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;
const NONCE_TTL_SECONDS = 10 * 60;

function doGet() {
  return calendarJsonResponse({
    ok: true,
    service: 'clow-cat-booking-calendar',
    version: CALENDAR_BRIDGE_VERSION,
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const request = parseCalendarRequest(e);
    lock.waitLock(10000);
    verifyCalendarRequest(request);

    if (request.action === 'upsertBookingEvent') {
      return calendarJsonResponse(upsertBookingEvent(request.payload));
    }
    if (request.action === 'deleteBookingEvent') {
      return calendarJsonResponse(deleteBookingEvent(request.payload));
    }
    if (request.action === 'health') {
      return calendarJsonResponse({
        ok: true,
        version: CALENDAR_BRIDGE_VERSION,
        calendarId: getBookingCalendar().getId(),
      });
    }
    throw new Error('Unsupported action.');
  } catch (error) {
    return calendarJsonResponse({
      ok: false,
      message: error && error.message ? error.message : 'Calendar request failed.',
      version: CALENDAR_BRIDGE_VERSION,
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignored) {}
  }
}

function parseCalendarRequest(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Missing request body.');
  }
  const body = JSON.parse(e.postData.contents);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Invalid request body.');
  }
  const payloadJson = String(body.payload || '');
  let payload;
  try {
    payload = JSON.parse(payloadJson);
  } catch (error) {
    throw new Error('Invalid calendar payload.');
  }
  return {
    timestamp: String(body.timestamp || ''),
    nonce: String(body.nonce || ''),
    action: String(body.action || ''),
    payloadJson: payloadJson,
    payload: payload,
    signature: String(body.signature || '').toLowerCase(),
  };
}

function verifyCalendarRequest(request) {
  const secret = String(
    PropertiesService.getScriptProperties().getProperty('BOOKING_CALENDAR_SECRET') || ''
  ).trim();
  if (secret.length < 32) throw new Error('Calendar secret is not configured.');
  if (!/^\d+$/.test(request.timestamp)) throw new Error('Invalid timestamp.');
  if (!/^[0-9a-f-]{36}$/i.test(request.nonce)) throw new Error('Invalid nonce.');
  if (!/^[A-Za-z]+$/.test(request.action)) throw new Error('Invalid action.');

  const nowSeconds = Math.floor(Date.now() / 1000);
  const timestampSeconds = Number(request.timestamp);
  if (
    !Number.isSafeInteger(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS
  ) {
    throw new Error('Expired request.');
  }

  const canonical = [
    request.timestamp,
    request.nonce,
    request.action,
    request.payloadJson,
  ].join('.');
  const expected = bytesToHex(
    Utilities.computeHmacSha256Signature(
      canonical,
      secret,
      Utilities.Charset.UTF_8
    )
  );
  if (!constantTimeEquals(request.signature, expected)) {
    throw new Error('Invalid signature.');
  }

  const cache = CacheService.getScriptCache();
  const nonceKey = 'calendar-nonce:' + request.nonce;
  if (cache.get(nonceKey)) throw new Error('Duplicate request.');
  cache.put(nonceKey, '1', NONCE_TTL_SECONDS);
}

function getBookingCalendar() {
  const calendarId = String(
    PropertiesService.getScriptProperties().getProperty('BOOKING_CALENDAR_ID') || ''
  ).trim();
  const calendar = calendarId
    ? CalendarApp.getCalendarById(calendarId)
    : CalendarApp.getDefaultCalendar();
  if (!calendar) throw new Error('Booking calendar is unavailable.');
  return calendar;
}

function upsertBookingEvent(payload) {
  const booking = validateCalendarPayload(payload);
  const calendar = getBookingCalendar();
  const marker = '[Booking ' + booking.bookingId + ']';
  let event = findCalendarEvent(calendar, booking.eventId, booking, marker);
  const description = [
    marker,
    'Khách hàng: ' + booking.customerName,
    'SĐT/Zalo: ' + booking.phone,
    'Email: ' + booking.email,
    'Gói: ' + booking.packageName,
    'Hình thức: ' + booking.consultationType,
    'Số tiền: ' + booking.amount + ' ' + booking.currency,
    'Nội dung chuyển khoản: ' + booking.paymentOrderId,
    booking.concern ? 'Lời nhắn: ' + booking.concern : '',
  ].filter(Boolean).join('\n');
  const title =
    '[Nhân Số][' + booking.bookingId + '] ' +
    booking.customerName + ' – ' + booking.packageName;

  ensureCalendarSlotAvailable(calendar, booking.start, booking.end, marker);
  if (event) {
    event.setTitle(title);
    event.setTime(booking.start, booking.end);
    event.setDescription(description);
  } else {
    event = calendar.createEvent(title, booking.start, booking.end, {
      description: description,
    });
  }

  return {
    ok: true,
    eventId: event.getId(),
    eventUrl: '',
    action: event ? 'upserted' : 'created',
    version: CALENDAR_BRIDGE_VERSION,
  };
}

function deleteBookingEvent(payload) {
  const booking = validateCalendarPayload(payload, true);
  const calendar = getBookingCalendar();
  const marker = '[Booking ' + booking.bookingId + ']';
  const event = findCalendarEvent(calendar, booking.eventId, booking, marker);
  if (!event) {
    return {
      ok: true,
      deleted: false,
      message: 'Calendar event was already absent.',
      version: CALENDAR_BRIDGE_VERSION,
    };
  }
  event.deleteEvent();
  return {
    ok: true,
    deleted: true,
    version: CALENDAR_BRIDGE_VERSION,
  };
}

function validateCalendarPayload(payload, allowMissingDetails) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid booking payload.');
  }
  const bookingId = cleanCalendarText(payload.bookingId, 64);
  if (!/^BKG-[A-Z0-9]{16}$/.test(bookingId)) {
    throw new Error('Invalid booking ID.');
  }
  const start = new Date(String(payload.slotStart || ''));
  const end = new Date(String(payload.slotEnd || ''));
  if (
    isNaN(start.getTime()) ||
    isNaN(end.getTime()) ||
    end <= start ||
    end.getTime() - start.getTime() > 4 * 60 * 60 * 1000
  ) {
    throw new Error('Invalid booking time.');
  }
  const result = {
    bookingId: bookingId,
    eventId: cleanCalendarText(payload.eventId, 512),
    customerName: cleanCalendarText(payload.customerName, 120),
    phone: cleanCalendarText(payload.phone, 40),
    email: cleanCalendarText(payload.email, 254),
    packageName: cleanCalendarText(payload.packageName, 180),
    consultationType: cleanCalendarText(payload.consultationType, 80),
    amount: Number(payload.amount || 0),
    currency: cleanCalendarText(payload.currency, 12) || 'VND',
    paymentOrderId: cleanCalendarText(payload.paymentOrderId, 120),
    concern: cleanCalendarText(payload.concern, 1000),
    start: start,
    end: end,
  };
  if (
    !allowMissingDetails &&
    (!result.customerName || !result.phone || !result.packageName)
  ) {
    throw new Error('Missing booking details.');
  }
  return result;
}

function findCalendarEvent(calendar, eventId, booking, marker) {
  if (eventId) {
    try {
      const byId = calendar.getEventById(eventId);
      if (byId) return byId;
    } catch (ignored) {}
  }
  const from = new Date(booking.start.getTime() - 24 * 60 * 60 * 1000);
  const to = new Date(booking.end.getTime() + 24 * 60 * 60 * 1000);
  const events = calendar.getEvents(from, to);
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (
      event.getTitle().indexOf(booking.bookingId) !== -1 ||
      event.getDescription().indexOf(marker) !== -1
    ) {
      return event;
    }
  }
  return null;
}

function ensureCalendarSlotAvailable(calendar, start, end, ownMarker) {
  const conflicts = calendar.getEvents(start, end).filter(function (event) {
    return (
      event.getTitle().indexOf(ownMarker) === -1 &&
      event.getDescription().indexOf(ownMarker) === -1
    );
  });
  if (conflicts.length) throw new Error('Calendar slot is no longer available.');
}

function cleanCalendarText(value, maximumLength) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximumLength);
}

function bytesToHex(bytes) {
  return bytes.map(function (value) {
    const normalized = value < 0 ? value + 256 : value;
    return ('0' + normalized.toString(16)).slice(-2);
  }).join('');
}

function constantTimeEquals(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

function calendarJsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
