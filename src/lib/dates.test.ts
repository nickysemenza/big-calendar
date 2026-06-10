import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDate,
  getAllDaysOfYear,
  getDaysInMonth,
  isDateInEvent,
  toDateString,
} from "./dates";

describe("formatDate", () => {
  it("zero-pads single-digit month and day", () => {
    expect(formatDate(new Date(2025, 2, 5))).toBe("2025-03-05");
  });
});

describe("addDays", () => {
  it("crosses year boundaries", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
  });

  it("handles negative offsets across month boundaries", () => {
    expect(addDays("2025-03-01", -1)).toBe("2025-02-28");
  });
});

describe("getAllDaysOfYear", () => {
  it("returns 366 days for leap years and 365 otherwise", () => {
    expect(getAllDaysOfYear(2024)).toHaveLength(366);
    expect(getAllDaysOfYear(2025)).toHaveLength(365);
  });
});

describe("getDaysInMonth", () => {
  it("handles February in leap years", () => {
    expect(getDaysInMonth(2024, 1)).toHaveLength(29);
    expect(getDaysInMonth(2025, 1)).toHaveLength(28);
  });
});

describe("isDateInEvent", () => {
  it("treats the end date as exclusive", () => {
    expect(
      isDateInEvent(new Date(2025, 4, 1), "2025-05-01", "2025-05-03"),
    ).toBe(true);
    expect(
      isDateInEvent(new Date(2025, 4, 3), "2025-05-01", "2025-05-03"),
    ).toBe(false);
  });
});

describe("toDateString", () => {
  it("strips the time from ISO datetimes and passes dates through", () => {
    expect(toDateString("2025-05-01T10:30:00Z")).toBe("2025-05-01");
    expect(toDateString("2025-05-01")).toBe("2025-05-01");
  });
});
