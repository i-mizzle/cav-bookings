import AdminShell from "@/app/admin/AdminShell";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminBookingsPage() {
  const session = await requireAdminSession();

  return (
    <AdminShell
      title="Bookings"
      description="This route is reserved for booking administration. It is server-validated on every request and also screened by the request proxy."
      userName={session.name}
    >
      <div className="rounded-xl border border-cav-medium-gray/40 bg-cav-dark-gray p-6 text-sm font-sans text-cav-light-gray shadow-xl shadow-black/30">
        Booking management UI can be added here. The route is already protected by the same admin session used on the dashboard.
      </div>
    </AdminShell>
  );
}