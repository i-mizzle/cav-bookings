import AdminShell from "@/app/admin/AdminShell";
import { requireAdminSession } from "@/lib/auth/session";
import ServicesClient from "@/app/admin/services/ServicesClient";

export default async function AdminServicesPage() {
  const session = await requireAdminSession();

  return (
    <AdminShell
      title="Services"
      description="Manage the services offered through CAV bookings."
      userName={session.name}
    >
      <ServicesClient />
    </AdminShell>
  );
}