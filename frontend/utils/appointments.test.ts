import { groupSlotsByPeriod, formatSlotTime, upcomingDates } from "./appointments";

describe("groupSlotsByPeriod", () => {
  it("buckets slots into morning / afternoon / evening", () => {
    expect(
      groupSlotsByPeriod(["09:00", "11:30", "12:00", "14:30", "16:59", "17:00", "20:00"]),
    ).toEqual({
      Morning: ["09:00", "11:30"],
      Afternoon: ["12:00", "14:30", "16:59"],
      Evening: ["17:00", "20:00"],
    });
  });

  it("returns empty buckets for no slots and skips malformed values", () => {
    expect(groupSlotsByPeriod([])).toEqual({ Morning: [], Afternoon: [], Evening: [] });
    expect(groupSlotsByPeriod(["bad", "09:00"])).toEqual({
      Morning: ["09:00"],
      Afternoon: [],
      Evening: [],
    });
  });
});

describe("formatSlotTime", () => {
  it("formats 24h slots as 12h labels", () => {
    expect(formatSlotTime("09:00")).toBe("9:00 AM");
    expect(formatSlotTime("00:05")).toBe("12:05 AM");
    expect(formatSlotTime("12:00")).toBe("12:00 PM");
    expect(formatSlotTime("14:30")).toBe("2:30 PM");
    expect(formatSlotTime("23:45")).toBe("11:45 PM");
  });

  it("returns the input unchanged when malformed", () => {
    expect(formatSlotTime("noon")).toBe("noon");
  });
});

describe("upcomingDates", () => {
  it("returns consecutive YYYY-MM-DD dates from the given start", () => {
    const from = new Date("2025-06-04T10:00:00.000Z");
    expect(upcomingDates(3, from)).toEqual(["2025-06-04", "2025-06-05", "2025-06-06"]);
  });

  it("returns an empty array for a non-positive count", () => {
    expect(upcomingDates(0, new Date("2025-06-04T00:00:00.000Z"))).toEqual([]);
  });
});
