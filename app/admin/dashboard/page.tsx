import AdminShell from "@/app/admin/AdminShell";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();

  return (
    <AdminShell
      title="Dashboard"
      description="This entry point is protected by the admin JWT and can be expanded with booking metrics, alerts, and operational summaries."
      userName={session.name}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-cav-dark-gray border border-cav-medium-gray/40 p-5 shadow-xl shadow-black/30">
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-cav-light-gray">Session</p>
          <p className="mt-2 text-2xl font-semibold font-mono text-white">Active</p>
          <p className="mt-2 text-sm font-sans text-cav-light-gray">JWT validation passed for this request.</p>
        </div>
        <div className="rounded-xl bg-cav-dark-gray border border-cav-medium-gray/40 p-5 shadow-xl shadow-black/30">
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-cav-light-gray">User</p>
          <p className="mt-2 text-2xl font-semibold font-mono text-white">{session.name}</p>
          <p className="mt-2 text-sm font-sans text-cav-light-gray">{session.email}</p>
        </div>
        <div className="rounded-xl bg-cav-dark-gray border border-cav-medium-gray/40 p-5 shadow-xl shadow-black/30">
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-cav-light-gray">Access</p>
          <p className="mt-2 text-2xl font-semibold font-mono text-white">Guarded</p>
          <p className="mt-2 text-sm font-sans text-cav-light-gray">Requests without a valid token are redirected to /admin.</p>
        </div>
      </div>
    </AdminShell>
  );
}