import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import {
  fetchDoctors,
  fetchAvailableSlots,
  bookAppointment,
  fetchMyAppointments,
  groupSlotsByPeriod,
  formatSlotTime,
  upcomingDates,
  type DoctorSummary,
  type Period,
} from "../../utils/appointments";

const PERIODS: Period[] = ["Morning", "Afternoon", "Evening"];

interface AppointmentRow {
  _id: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  doctorId?: { firstName?: string; lastName?: string; specialization?: string };
}

export default function AppointmentsPage() {
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [dates] = useState<string[]>(() => upcomingDates(14));
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [hasAvailability, setHasAvailability] = useState(true);
  const [slot, setSlot] = useState("");
  const [reason, setReason] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [myAppointments, setMyAppointments] = useState<AppointmentRow[]>([]);

  const loadMine = useCallback(() => {
    fetchMyAppointments()
      .then((rows) => setMyAppointments(rows as AppointmentRow[]))
      .catch(() => setMyAppointments([]));
  }, []);

  useEffect(() => {
    fetchDoctors()
      .then(setDoctors)
      .catch(() => setDoctors([]));
    loadMine();
  }, [loadMine]);

  useEffect(() => {
    setSlot("");
    if (!doctorId || !date) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    fetchAvailableSlots(doctorId, date)
      .then((res) => {
        setSlots(res.slots);
        setHasAvailability(res.hasAvailability);
      })
      .catch(() => {
        setSlots([]);
        setHasAvailability(true);
      })
      .finally(() => setLoadingSlots(false));
  }, [doctorId, date]);

  const handleBook = async () => {
    if (!doctorId || !date || !slot) {
      setMessage({ type: "err", text: "Pick a doctor, a date, and an open slot." });
      return;
    }
    setBooking(true);
    setMessage(null);
    try {
      await bookAppointment({ doctorId, scheduledDate: date, scheduledTime: slot, reason });
      setMessage({ type: "ok", text: "Appointment booked!" });
      setSlot("");
      setReason("");
      // Refresh the doctor's slots (the one just taken is gone) and my list.
      const refreshed = await fetchAvailableSlots(doctorId, date).catch(() => null);
      if (refreshed) setSlots(refreshed.slots);
      loadMine();
    } catch (err: unknown) {
      const text =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not book this appointment.";
      setMessage({ type: "err", text });
    } finally {
      setBooking(false);
    }
  };

  const grouped = groupSlotsByPeriod(slots);
  const doctorName = (d: DoctorSummary) =>
    `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || "Doctor";

  return (
    <>
      <Head>
        <title>Book an Appointment | MedInternia</title>
      </Head>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Book an Appointment</h1>

        <div className="space-y-4 rounded-lg border border-gray-200 p-5">
          <label className="block text-sm font-medium">
            Doctor
            <select
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              <option value="">Select a doctor…</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {doctorName(d)}
                  {d.specialization ? ` — ${d.specialization}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            Date
            <select
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={!doctorId}
            >
              <option value="">Select a date…</option>
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>

          {doctorId && date && (
            <div>
              <div className="mb-2 text-sm font-medium">Available slots</div>
              {loadingSlots ? (
                <p className="text-sm text-gray-500">Loading slots…</p>
              ) : !hasAvailability ? (
                <p className="text-sm text-amber-700">
                  This doctor hasn’t published a schedule yet.
                </p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-gray-500">No open slots on this date.</p>
              ) : (
                <div className="space-y-3">
                  {PERIODS.filter((p) => grouped[p].length > 0).map((period) => (
                    <div key={period}>
                      <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                        {period}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {grouped[period].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSlot(s)}
                            className={`rounded border px-3 py-1 text-sm ${
                              slot === s
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-gray-300 hover:border-indigo-400"
                            }`}
                          >
                            {formatSlotTime(s)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <label className="block text-sm font-medium">
            Reason (optional)
            <textarea
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>

          <button
            type="button"
            onClick={handleBook}
            disabled={booking || !slot}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {booking ? "Booking…" : "Book appointment"}
          </button>

          {message && (
            <p className={`text-sm ${message.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>
              {message.text}
            </p>
          )}
        </div>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">My appointments</h2>
          {myAppointments.length === 0 ? (
            <p className="text-sm text-gray-500">No appointments yet.</p>
          ) : (
            <ul className="space-y-2">
              {myAppointments.map((a) => (
                <li key={a._id} className="rounded border border-gray-200 px-3 py-2 text-sm">
                  <span className="font-medium">
                    {new Date(a.scheduledDate).toISOString().slice(0, 10)} at{" "}
                    {formatSlotTime(a.scheduledTime)}
                  </span>{" "}
                  {a.doctorId
                    ? `with Dr. ${a.doctorId.firstName ?? ""} ${a.doctorId.lastName ?? ""}`.trim()
                    : ""}
                  <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
