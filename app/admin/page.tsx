import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/app/admin/LoginForm";
import LogoutButton from "@/app/admin/LogoutButton";
import EllipsesVerticalIcon from "@/components/elements/icons/EllipsesVerticalIcon";
import { getAdminSession } from "@/lib/auth/session";

// const adminLinks = [
// 	{ href: "/admin/dashboard", label: "Dashboard", description: "Overview, status, and quick actions." },
// 	{ href: "/admin/bookings", label: "Bookings", description: "Review and manage incoming bookings." },
// 	{ href: "/admin/services", label: "Services", description: "Update service offerings and pricing." },
// ];

export default async function AdminPage() {
	const session = await getAdminSession();

	if (session) {
		redirect("/admin/dashboard");
	}

	return (
		<main className="min-h-screen bg-cav-black p-6 text-white">
			<div className="mx-auto max-w-6xl">
				<div className="flex items-start gap-x-2 bg-transparent mb-10">
					<div className="w-full">
						<div className="relative h-14 w-30">
							<Image
								src="/logo.svg"
								alt="CAV logo"
								fill
								sizes="120px"
								className="object-contain"
							/>
						</div>
						<p className="text-[10px] tracking-[0.9em] text-cav-light-gray">BOOKINGS</p>
					</div>
					<div className="w-10">
						<button className="rounded-full w-10 h-10 bg-cav-medium-gray text-cav-light-gray flex items-center justify-center shadow-xl shadow-black/30">
							<EllipsesVerticalIcon className="w-6 h-6" />
						</button>
					</div>
				</div>

				<div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
					<section className="rounded-xl bg-cav-dark-gray/50 border border-cav-medium-gray/40 p-8 shadow-xl shadow-black/30 md:p-10">
						<p className="text-xs font-mono font-semibold uppercase tracking-[0.3em] text-cav-light-gray">SIN IN TO ADMIN</p>
						<h2 className="mt-3 text-sm font-semibold font-mono tracking-tighter text-white">Use your admin email and password</h2>
						

						<div className="mt-8">
							<LoginForm />
						</div>
					</section>
				</div>
			</div>
		</main>
	);
}
