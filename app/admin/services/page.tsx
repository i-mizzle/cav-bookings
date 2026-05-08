import AdminShell from "@/app/admin/AdminShell";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminServicesPage() {
  const session = await requireAdminSession();

  return (
    <AdminShell
      title="Services"
      description="This route is ready for service configuration work once the admin UI expands beyond authentication and access control."
      userName={session.name}
    >
      <div className="rounded-xl border border-cav-medium-gray/40 bg-cav-dark-gray p-6 text-sm font-sans text-cav-light-gray shadow-xl shadow-black/30">
        Service administration UI can be added here. Access stays behind the validated JWT session.
      </div>
    </AdminShell>
  );
}