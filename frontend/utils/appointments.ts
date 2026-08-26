import api from "./api";

/**
 * Appointment booking helpers (frontend).
 *
 * Pure formatting/grouping helpers (unit-tested) plus thin API wrappers around
 * the appointments + doctor-availability endpoints, so the booking page can turn
 * the doctor's open slots into a friendly grouped picker.
 */

export type Period = "Morning" | "Afternoon" | "Evening";

/** Group "HH:mm" slots into Morning (<12:00), Afternoon (12:00–16:59), Evening (≥17:00). */
export function groupSlotsByPeriod(slots: string[]): Record<Period, string[]> {
  const groups: Record<Period, string[]> = { Morning: [], Afternoon: [], Evening: [] };
  for (const slot of slots) {
    const hour = Number(slot.split(":")[0]);
    if (Number.isNaN(hour)) continue;
    if (hour < 12) groups.Morning.push(slot);
    else if (hour < 17) groups.Afternoon.push(slot);
    else groups.Evening.push(slot);
  }
  return groups;
}

/** Format a 24h "HH:mm" slot as a 12h label, e.g. "14:30" → "2:30 PM". */
export function formatSlotTime(slot: string): string {
  const [hStr, mStr] = slot.split(":");
  const hour = Number(hStr);
  const minute = Number(mStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return slot;
  const meridiem = hour < 12 ? "AM" : "PM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${meridiem}`;
}

/** The next `count` dates as YYYY-MM-DD (UTC), starting from `from` (default today). */
export function upcomingDates(count: number, from: Date = new Date()): string[] {
  const dates: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const day = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
    dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}

// --- API wrappers ---------------------------------------------------------

export interface DoctorSummary {
  _id: string;
  firstName?: string;
  lastName?: string;
  specialization?: string;
}

export interface AvailableSlots {
  date: string;
  slots: string[];
  hasAvailability: boolean;
}

export async function fetchDoctors(): Promise<DoctorSummary[]> {
  const res = await api.get("/doctors");
  return res.data?.data?.doctors ?? [];
}

export async function fetchAvailableSlots(doctorId: string, date: string): Promise<AvailableSlots> {
  const res = await api.get(`/doctors/${doctorId}/available-slots`, { params: { date } });
  return res.data.data;
}

export async function bookAppointment(input: {
  doctorId: string;
  scheduledDate: string;
  scheduledTime: string;
  reason?: string;
}) {
  const res = await api.post("/appointments", input);
  return res.data.data.appointment;
}

export async function fetchMyAppointments() {
  const res = await api.get("/appointments");
  return res.data?.data?.appointments ?? [];
}
