import AdminShell from "@/app/admin/AdminShell";
import { requireAdminSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb";
import {
  DEFAULT_SERVICE_CONFIG,
  buildTimeWindows,
  generateHourlySlots,
  parseUtcDate,
  type TimeRange,
} from "@/lib/booking";
import { Booking } from "@/models/Booking";
import { Availability } from "@/models/Availability";
import { Service } from "@/models/Service";

export const dynamic = "force-dynamic";

const STATUS_PILL_STYLES = {
  confirmed: "bg-green-500/15 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
} as const;

function getLocalDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTimeRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`;
}

function formatShortDateTime(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-cav-medium-gray/40 bg-cav-dark-gray p-5 shadow-xl shadow-black/20">
      <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-cav-light-gray/55">{label}</p>
      <p className="mt-3 text-3xl font-semibold font-mono tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs text-cav-light-gray/65">{detail}</p>
    </div>
  );
}

async function getTodayAvailableSlotsCount(todayDate: string) {
  const todayUtc = parseUtcDate(todayDate);

  if (!todayUtc) {
    return 0;
  }

  const rules = await Availability.find({ dayOfWeek: todayUtc.getUTCDay() })
    .select("startTime endTime")
    .sort({ startTime: 1 })
    .lean();

  if (rules.length === 0) {
    return 0;
  }

  const windows = buildTimeWindows(todayUtc, rules);

  if (windows.length === 0) {
    return 0;
  }

  const windowStart = windows[0]?.start;
  const windowEnd = windows[windows.length - 1]?.end;

  if (!windowStart || !windowEnd) {
    return 0;
  }

  const confirmedBookings = await Booking.find({
    start: { $lt: windowEnd },
    end: { $gt: windowStart },
    status: "confirmed",
  })
    .select("serviceId start end")
    .lean();

  const blocked = confirmedBookings.map((booking) => ({
      start: new Date(booking.start),
      end: new Date(booking.end),
    } satisfies TimeRange));

  return generateHourlySlots({
    windows,
    service: DEFAULT_SERVICE_CONFIG,
    blocked,
  }).length;
}

type ServiceBreakdownRow = {
  serviceId: string;
  serviceName: string;
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
};

async function getServiceBreakdown(): Promise<ServiceBreakdownRow[]> {
  const rows = await Booking.aggregate([
    {
      $group: {
        _id: "$serviceId",
        total: { $sum: 1 },
        confirmed: {
          $sum: {
            $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0],
          },
        },
        pending: {
          $sum: {
            $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
          },
        },
        cancelled: {
          $sum: {
            $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
          },
        },
      },
    },
    {
      $sort: { total: -1 },
    },
  ]);

  const serviceIds = rows
    .map((row) => row._id)
    .filter((serviceId) => serviceId && serviceId !== null && serviceId !== "null")
    .map((serviceId) => String(serviceId));

  const services = serviceIds.length > 0
    ? await Service.find({ _id: { $in: serviceIds } }).select("name").lean()
    : [];

  const serviceNameMap = new Map(services.map((service) => [String(service._id), service.name]));

  return rows.map((row) => ({
    serviceId: String(row._id),
    serviceName: serviceNameMap.get(String(row._id)) ?? "Unknown service",
    total: Number(row.total ?? 0),
    confirmed: Number(row.confirmed ?? 0),
    pending: Number(row.pending ?? 0),
    cancelled: Number(row.cancelled ?? 0),
  }));
}

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  await connectToDatabase();

  const now = new Date();
  const todayDate = getLocalDateString(now);
  const startOfDay = new Date(`${todayDate}T00:00:00.000Z`);
  const endOfDay = new Date(`${todayDate}T23:59:59.999Z`);

  const [
    bookingCount,
    uniqueClientCount,
    recentBookings,
    todayBookings,
    availableSlots,
    serviceBreakdown,
  ] =
    await Promise.all([
      Booking.countDocuments({}),
      Booking.distinct("customerEmail").then((emails) => emails.length),
      Booking.find({})
        .sort({ start: -1 })
        .limit(3)
        .populate("serviceId", "name")
        .lean(),
      Booking.countDocuments({
        start: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      }),
      getTodayAvailableSlotsCount(todayDate),
      getServiceBreakdown(),
    ]);

  const recentBookingRows = recentBookings.map((booking) => ({
    id: String(booking._id),
    customerName: booking.customerName ?? "Unknown customer",
    customerEmail: booking.customerEmail ?? "No email provided",
    start:
      booking.start instanceof Date ? booking.start.toISOString() : String(booking.start ?? ""),
    end: booking.end instanceof Date ? booking.end.toISOString() : String(booking.end ?? ""),
    status: booking.status ?? "pending",
    paymentStatus: booking.paymentStatus ?? "pending",
    serviceName:
      booking.serviceId && typeof booking.serviceId === "object" && "name" in booking.serviceId
        ? String((booking.serviceId as { name?: string }).name ?? "Unknown service")
        : "Unknown service",
  }));

  return (
    <AdminShell
      title="Dashboard"
      description="A live snapshot of bookings, availability, and customer activity."
      userName={session.name}
    >
      <div className="flex flex-col gap-6">
        <section 
          // className="rounded-2xl border border-cav-medium-gray/40 bg-linear-to-br from-cav-dark-gray via-cav-dark-gray to-black/50 p-6 shadow-2xl shadow-black/30 md:p-8"
        >
          <h1 className="mt-3 text-lg font-semibold font-mono tracking-tight text-white md:text-4xl">
            Hello {session.name}
          </h1>

        </section>

        <section className="grid gap-4 grid-cols-2">
          <StatCard
            label="Bookings"
            value={String(bookingCount)}
            detail="All bookings currently in the system."
          />
          <StatCard
            label="Clients"
            value={String(uniqueClientCount)}
            detail="Unique customer emails across bookings."
          />
          <StatCard
            label="Available slots today"
            value={String(availableSlots)}
            detail="Open 60-minute slots from today’s availability."
          />
          <StatCard
            label="Today’s bookings"
            value={String(todayBookings)}
            detail="Bookings starting on the current day."
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div 
            // className="rounded-2xl border border-cav-medium-gray/40 bg-cav-dark-gray p-6 shadow-xl shadow-black/20"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.35em] text-cav-light-gray/55">Recent bookings</p>
                {/* <h2 className="mt-2 text-xl font-semibold text-white">Latest 3 bookings</h2> */}
              </div>
              <div className="rounded-full border border-cav-medium-gray/60 bg-black/20 px-3 py-1 text-xs font-mono text-cav-light-gray/70">
                Live feed
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {recentBookingRows.map((booking) => (
                <button
                  key={booking.id}
                  type="button"
                  className="flex w-full items-start justify-between rounded-xl border border-cav-medium-gray/40 bg-cav-dark-gray p-5 shadow-xl shadow-black/20 text-left transition hover:border-cav-medium-gray/70"
                >
                  <div className="flex flex-col gap-1 min-w-0 pr-4">
                    <p className="text-sm font-semibold font-mono text-white">
                      {booking.customerName}
                    </p>
                    <p className="text-xs font-mono text-cav-light-gray/60">
                      {booking.customerEmail}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-mono text-cav-light-gray/60">
                      <span>{formatDate(booking.start)}</span>
                      <span>·</span>
                      <span>
                        {formatTimeRange(booking.start, booking.end)}
                      </span>
                      {booking.serviceName && (
                        <>
                          <span>·</span>
                          <span>{booking.serviceName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-medium capitalize bg-green-500/15 text-green-400 border-green-500/30">
                      {booking.status}
                    </span>
                    <span className="rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-medium capitalize bg-yellow-500/15 text-yellow-400 border-yellow-500/30">
                      {booking.paymentStatus}
                    </span>
                  </div>
                </button>
              ))}

              {recentBookingRows.length === 0 && (
                <div className="rounded-xl border border-cav-medium-gray/40 bg-black/20 p-6 text-sm text-cav-light-gray/65">
                  No bookings available yet.
                </div>
              )}
            </div>
          </div>

          <div 
            className="py-6"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.35em] text-cav-light-gray/55">Service breakdown</p>
                {/* <h2 className="mt-2 text-xl font-semibold text-white">Bookings by service</h2> */}
              </div>
              <div className="rounded-full border border-cav-medium-gray/60 bg-black/20 px-3 py-1 text-xs font-mono text-cav-light-gray/70">
                {serviceBreakdown.length} services
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {serviceBreakdown.map((service) => (
                <div
                  key={service.serviceId}
                  className="rounded-xl border border-cav-medium-gray/40 bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{service.serviceName}</p>
                      <p className="mt-1 text-xs text-cav-light-gray/60">Total bookings</p>
                    </div>
                    <p className="text-2xl font-semibold font-mono text-white">{service.total}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-mono">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 font-medium capitalize ${STATUS_PILL_STYLES.confirmed}`}
                    >
                      confirmed {service.confirmed}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 font-medium capitalize ${STATUS_PILL_STYLES.pending}`}
                    >
                      pending {service.pending}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 font-medium capitalize ${STATUS_PILL_STYLES.cancelled}`}
                    >
                      cancelled {service.cancelled}
                    </span>
                  </div>
                </div>
              ))}

              {serviceBreakdown.length === 0 && (
                <div className="rounded-xl border border-cav-medium-gray/40 bg-black/20 p-6 text-sm text-cav-light-gray/65">
                  No service-linked bookings yet.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}