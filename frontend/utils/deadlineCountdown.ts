/**
 * Utility for computing a human-friendly countdown string for an
 * internship/job application deadline.
 *
 * Pure function, no side effects — safe to unit test and safe to call
 * from any component (list cards, detail pages, etc).
 */

export type DeadlineUrgency = "low" | "medium" | "high" | "closed" | "unknown";

export interface DeadlineStatus {
  /** Human readable label, e.g. "12 days left", "3 hours left", "Ends today" */
  label: string;
  /** True once the deadline has passed */
  isClosed: boolean;
  /** True when the deadline value is missing or unparsable */
  isUnknown: boolean;
  /** Coarse urgency bucket, useful for color-coding the UI */
  urgency: DeadlineUrgency;
}

/**
 * Calculates the countdown status for a given application deadline.
 *
 * Gracefully handles missing or invalid dates by returning an "unknown"
 * status instead of throwing, so callers never need to pre-validate input.
 */
export function getDeadlineStatus(
  deadline?: string | number | Date | null
): DeadlineStatus {
  if (deadline === null || deadline === undefined || deadline === "") {
    return {
      label: "No deadline specified",
      isClosed: false,
      isUnknown: true,
      urgency: "unknown",
    };
  }

  const deadlineDate = new Date(deadline);

  if (isNaN(deadlineDate.getTime())) {
    return {
      label: "No deadline specified",
      isClosed: false,
      isUnknown: true,
      urgency: "unknown",
    };
  }

  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      label: "Application Closed",
      isClosed: true,
      isUnknown: false,
      urgency: "closed",
    };
  }

  const isSameCalendarDay =
    deadlineDate.getFullYear() === now.getFullYear() &&
    deadlineDate.getMonth() === now.getMonth() &&
    deadlineDate.getDate() === now.getDate();

  if (isSameCalendarDay) {
    return {
      label: "Ends today",
      isClosed: false,
      isUnknown: false,
      urgency: "high",
    };
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays >= 1) {
    return {
      label: `${diffDays} day${diffDays === 1 ? "" : "s"} left`,
      isClosed: false,
      isUnknown: false,
      urgency: diffDays <= 3 ? "high" : diffDays <= 7 ? "medium" : "low",
    };
  }

  if (diffHours >= 1) {
    return {
      label: `${diffHours} hour${diffHours === 1 ? "" : "s"} left`,
      isClosed: false,
      isUnknown: false,
      urgency: "high",
    };
  }

  if (diffMinutes >= 1) {
    return {
      label: `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} left`,
      isClosed: false,
      isUnknown: false,
      urgency: "high",
    };
  }

  // Less than a minute remains but still technically in the future.
  return {
    label: "Ends today",
    isClosed: false,
    isUnknown: false,
    urgency: "high",
  };
}


