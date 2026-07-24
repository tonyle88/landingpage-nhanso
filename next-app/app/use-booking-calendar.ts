"use client";

import { useEffect } from "react";

const BOOKING_URL =
  "https://script.google.com/macros/s/AKfycbxbWZXF2iCsWsr0cWL0JVChANywEq7D7l_mCIvrvqZs78vSOsPej3PuXFgHbOiVNoKr/exec";
const SLOT_DURATION_HOURS = 2;
const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const FULL_DAY_NAMES = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

type DateParts = { year: number; month: number; day: number };
type BookedSlot = { start: string; end: string };
type CalendarSelection = {
  selectedDate: Date | null;
  selectedTime: string;
  fullSlotLabel: string;
  slotStart: string;
  slotEnd: string;
};

declare global {
  interface Window {
    ClowBookingCalendar?: {
      load: () => Promise<void>;
      getSelection: () => CalendarSelection;
    };
  }
}

function getVnDateParts(date = new Date()): DateParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value || 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function makeVnDateTime(
  year: number,
  month: number,
  day: number,
  hour = 0,
) {
  return new Date(Date.UTC(year, month - 1, day, hour - 7, 0, 0));
}

function addDays(parts: DateParts, count: number) {
  const anchor = makeVnDateTime(parts.year, parts.month, parts.day, 12);
  anchor.setUTCDate(anchor.getUTCDate() + count);
  return getVnDateParts(anchor);
}

function getDayOfWeek(parts: DateParts) {
  return makeVnDateTime(parts.year, parts.month, parts.day, 12).getUTCDay();
}

function buildSlotIso(date: Date | null, time: string, addHours = 0) {
  if (!date || !time) return "";
  const parts = getVnDateParts(date);
  const hour = Number(time.split(":")[0] || 0) + addHours;
  return makeVnDateTime(parts.year, parts.month, parts.day, hour).toISOString();
}

export function useBookingCalendar() {
  useEffect(() => {
    const loading = document.querySelector<HTMLElement>("#cal-loading");
    const errorBox = document.querySelector<HTMLElement>("#cal-error");
    const content = document.querySelector<HTMLElement>("#cal-content");
    const dateStrip = document.querySelector<HTMLElement>("#cal-date-strip");
    const timeGrid = document.querySelector<HTMLElement>("#cal-time-grid");
    const continueButton =
      document.querySelector<HTMLButtonElement>("#btn-go-payment");
    const selectedInfo =
      document.querySelector<HTMLElement>("#selected-slot-info");
    const selectedText =
      document.querySelector<HTMLElement>("#selected-slot-text");
    if (
      !loading ||
      !errorBox ||
      !content ||
      !dateStrip ||
      !timeGrid ||
      !continueButton ||
      !selectedInfo ||
      !selectedText
    ) {
      return;
    }

    let selectedDate: Date | null = null;
    let selectedTime = "";
    let fullSlotLabel = "";
    let bookedSlots: BookedSlot[] = [];

    const getSelection = (): CalendarSelection => ({
      selectedDate,
      selectedTime,
      fullSlotLabel,
      slotStart: buildSlotIso(selectedDate, selectedTime),
      slotEnd: buildSlotIso(
        selectedDate,
        selectedTime,
        SLOT_DURATION_HOURS,
      ),
    });

    const renderTimeSlots = (date: Date) => {
      timeGrid.replaceChildren();
      const parts = getVnDateParts(date);
      const dayOfWeek = getDayOfWeek(parts);
      const start = dayOfWeek === 0 || dayOfWeek === 6 ? 9 : 19;
      const end = 21;
      const available: Array<{ label: string; hour: number }> = [];

      for (
        let hour = start;
        hour + SLOT_DURATION_HOURS <= end;
        hour += SLOT_DURATION_HOURS
      ) {
        const slotStart = makeVnDateTime(
          parts.year,
          parts.month,
          parts.day,
          hour,
        );
        const slotEnd = makeVnDateTime(
          parts.year,
          parts.month,
          parts.day,
          hour + SLOT_DURATION_HOURS,
        );
        const isBooked = bookedSlots.some(
          (slot) =>
            slotStart < new Date(slot.end) && slotEnd > new Date(slot.start),
        );
        if (!isBooked && slotStart > new Date(Date.now() + 3600000)) {
          available.push({
            label: `${String(hour).padStart(2, "0")}:00 – ${String(hour + SLOT_DURATION_HOURS).padStart(2, "0")}:00`,
            hour,
          });
        }
      }

      if (!available.length) {
        const empty = document.createElement("div");
        empty.className = "cal-no-slots";
        empty.append(
          "Không còn khung giờ trống cho ngày này 😔",
          document.createElement("br"),
          "Vui lòng chọn ngày khác.",
        );
        timeGrid.appendChild(empty);
        return;
      }

      available.forEach((slot) => {
        const button = document.createElement("button");
        button.className = "cal-time-btn";
        button.type = "button";
        button.textContent = slot.label;
        button.addEventListener("click", () => {
          timeGrid
            .querySelectorAll(".cal-time-btn")
            .forEach((item) => item.classList.remove("selected"));
          button.classList.add("selected");
          selectedTime = `${String(slot.hour).padStart(2, "0")}:00`;
          const dateText = `${FULL_DAY_NAMES[getDayOfWeek(parts)]}, ${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}/${parts.year}`;
          fullSlotLabel = `${dateText} | ${slot.label}`;
          selectedText.textContent = fullSlotLabel;
          selectedInfo.style.display = "flex";
          continueButton.disabled = false;
        });
        timeGrid.appendChild(button);
      });
    };

    const renderDates = () => {
      dateStrip.replaceChildren();
      const today = getVnDateParts();
      for (let index = 0; index < 21; index += 1) {
        const parts = addDays(today, index);
        const date = makeVnDateTime(parts.year, parts.month, parts.day);
        const button = document.createElement("button");
        button.className = "cal-date-btn";
        button.type = "button";
        const dayName = document.createElement("span");
        dayName.className = "day-name";
        dayName.textContent = DAY_NAMES[getDayOfWeek(parts)];
        const dayNumber = document.createElement("span");
        dayNumber.className = "day-num";
        dayNumber.textContent = String(parts.day);
        const month = document.createElement("span");
        month.className = "month";
        month.textContent = `Th${parts.month}`;
        button.append(dayName, dayNumber, month);
        button.addEventListener("click", () => {
          dateStrip
            .querySelectorAll(".cal-date-btn")
            .forEach((item) => item.classList.remove("selected"));
          button.classList.add("selected");
          selectedDate = date;
          selectedTime = "";
          fullSlotLabel = "";
          continueButton.disabled = true;
          selectedInfo.style.display = "none";
          renderTimeSlots(date);
        });
        dateStrip.appendChild(button);
      }
    };

    const load = async () => {
      loading.style.display = "flex";
      errorBox.style.display = "none";
      content.style.display = "none";
      selectedDate = null;
      selectedTime = "";
      fullSlotLabel = "";
      continueButton.disabled = true;
      selectedInfo.style.display = "none";
      try {
        const response = await window.ClowBookingApi?.fetchWithTimeout(
          `${BOOKING_URL}?action=getBookedSlots&_=${Date.now()}`,
          { mode: "cors", cache: "no-store" },
          12000,
        );
        if (!response) throw new Error("Booking API chưa sẵn sàng.");
        const result = (await response.json()) as {
          ok?: boolean;
          error?: string;
          booked?: BookedSlot[];
        };
        if (!result.ok) {
          throw new Error(result.error || "Không tải được lịch đã đặt");
        }
        bookedSlots = Array.isArray(result.booked) ? result.booked : [];
      } catch (error) {
        bookedSlots = [];
        errorBox.style.display = "block";
        const errorText = errorBox.querySelector("p") || errorBox;
        errorText.textContent =
          "Không tải được lịch trống từ Google. Vui lòng thử lại hoặc nhắn Zalo để đặt lịch.";
        void window.ClowBookingApi?.logError("getBookedSlots", error);
      } finally {
        loading.style.display = "none";
        content.style.display = "block";
        renderDates();
      }
    };

    const runtime = { load, getSelection };
    window.ClowBookingCalendar = runtime;
    window.dispatchEvent(new Event("clow-booking-calendar-ready"));
    return () => {
      dateStrip.replaceChildren();
      timeGrid.replaceChildren();
      if (window.ClowBookingCalendar === runtime) {
        delete window.ClowBookingCalendar;
      }
    };
  }, []);
}
