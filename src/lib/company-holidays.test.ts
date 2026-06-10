import { describe, expect, it } from "vitest";
import { getCompanyHolidays } from "./company-holidays";

describe("getCompanyHolidays", () => {
  // Regression: the rules must exactly reproduce the previously
  // hardcoded 2025 and 2026 tables
  it("matches the former hardcoded 2025 table", () => {
    expect(getCompanyHolidays(2025)).toEqual([
      { date: "2025-01-01", name: "New Year's Day" },
      { date: "2025-01-20", name: "Martin Luther King Jr. Day" },
      { date: "2025-02-17", name: "President's Day" },
      { date: "2025-05-26", name: "Memorial Day" },
      { date: "2025-07-04", name: "Independence Day" },
      { date: "2025-09-01", name: "Labor Day" },
      { date: "2025-11-27", name: "Thanksgiving" },
      { date: "2025-11-28", name: "Day After Thanksgiving" },
      { date: "2025-12-25", name: "Christmas" },
    ]);
  });

  it("matches the former hardcoded 2026 table", () => {
    expect(getCompanyHolidays(2026)).toEqual([
      { date: "2026-01-01", name: "New Year's Day" },
      { date: "2026-01-19", name: "Martin Luther King Jr. Day" },
      { date: "2026-02-16", name: "President's Day" },
      { date: "2026-05-25", name: "Memorial Day" },
      { date: "2026-07-03", name: "Independence Day (observed)" },
      { date: "2026-09-07", name: "Labor Day" },
      { date: "2026-11-26", name: "Thanksgiving" },
      { date: "2026-11-27", name: "Day After Thanksgiving" },
      { date: "2026-12-25", name: "Christmas" },
    ]);
  });

  it("works for years beyond the old table", () => {
    const h2027 = getCompanyHolidays(2027);
    // Jul 4, 2027 is a Sunday -> observed Monday
    expect(h2027).toContainEqual({
      date: "2027-07-05",
      name: "Independence Day (observed)",
    });
    expect(h2027).toContainEqual({ date: "2027-11-25", name: "Thanksgiving" });
    expect(h2027).toContainEqual({
      date: "2027-01-18",
      name: "Martin Luther King Jr. Day",
    });
    expect(h2027).toContainEqual({ date: "2027-05-31", name: "Memorial Day" });
  });
});
