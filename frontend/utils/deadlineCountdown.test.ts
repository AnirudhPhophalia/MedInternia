import { getDeadlineStatus } from "./deadlineCountdown";

describe("getDeadlineStatus", () => {

    it("returns unknown status when deadline is undefined", () => {
        expect(getDeadlineStatus()).toEqual({
            label: "No deadline specified",
            isClosed: false,
            isUnknown: true,
            urgency: "unknown",
        });
    });

    it("returns unknown status when deadline is null", () => {
        expect(getDeadlineStatus(null)).toEqual({
            label: "No deadline specified",
            isClosed: false,
            isUnknown: true,
            urgency: "unknown",
        });
    });

    it("returns unknown status for an invalid date", () => {
        expect(getDeadlineStatus("not-a-date")).toEqual({
            label: "No deadline specified",
            isClosed: false,
            isUnknown: true,
            urgency: "unknown",
        });
    });

    it("returns closed status for an expired deadline", () => {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

        expect(getDeadlineStatus(yesterday)).toEqual({
            label: "Application Closed",
            isClosed: true,
            isUnknown: false,
            urgency: "closed",
        });
    });

    it("returns 'Ends today' for a deadline later today", () => {
        const laterToday = new Date();
        laterToday.setHours(laterToday.getHours() + 2);

        const result = getDeadlineStatus(laterToday);

        expect(result.label).toBe("Ends today");
        expect(result.isClosed).toBe(false);
        expect(result.urgency).toBe("high");
    });

    it("returns days remaining for future deadlines", () => {
        const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

        const result = getDeadlineStatus(future);

        expect(result.label).toBe("10 days left");
        expect(result.urgency).toBe("low");
    });

    it("uses the singular form for one day remaining", () => {
        const future = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const result = getDeadlineStatus(future);

        expect(result.label).toBe("1 day left");
    });

    it("returns medium urgency for deadlines within seven days", () => {
        const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

        const result = getDeadlineStatus(future);

        expect(result.label).toBe("5 days left");
        expect(result.urgency).toBe("medium");
    });

    it("returns high urgency for deadlines within three days", () => {
        const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

        const result = getDeadlineStatus(future);

        expect(result.label).toBe("2 days left");
        expect(result.urgency).toBe("high");
    });

});