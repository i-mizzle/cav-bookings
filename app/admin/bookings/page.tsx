import AdminShell from "@/app/admin/AdminShell";
import { requireAdminSession } from "@/lib/auth/session";
import BookingsClient from "@/app/admin/bookings/BookingsClient";

export default async function AdminBookingsPage() {
  const session = await requireAdminSession();

  return (
    <AdminShell
      title="Bookings"
      description="Manage all bookings and review daily availability."
      userName={session.name}
    >
      <BookingsClient />
    </AdminShell>
  );
}