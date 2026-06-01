"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import LogoutButton from "@/app/admin/LogoutButton";
import EllipsesVerticalIcon from "@/components/elements/icons/EllipsesVerticalIcon";

type AdminShellProps = {
  title: string;
  description: string;
  userName: string;
  children?: React.ReactNode;
};

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/services", label: "Services" },
];

export default function AdminShell({ title, description, userName, children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-cav-black p-6 text-white relative">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-20">
        <div className="flex items-start gap-x-2 bg-transparent">
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
            <p className="text-[10px] tracking-[0.9em] text-cav-light-gray">ADMIN</p>
          </div>
          <div className="w-10">
            <button className="rounded-full w-10 h-10 bg-cav-medium-gray text-cav-light-gray flex items-center justify-center shadow-xl shadow-black/30">
              <EllipsesVerticalIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* <header className="rounded-xl bg-cav-dark-gray/70 border border-cav-medium-gray/40 p-6 shadow-xl shadow-black/30 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-mono font-semibold uppercase tracking-[0.3em] text-cav-light-gray">
                Admin portal
              </p>
              <div>
                <h1 className="text-2xl font-semibold font-mono tracking-tighter text-white md:text-3xl">{title}</h1>
                <p className="mt-2 max-w-2xl text-sm font-sans text-cav-light-gray">{description}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-mono uppercase tracking-[0.2em] text-gray-400">Signed in as</p>
                <p className="text-sm font-semibold font-mono text-white">{userName}</p>
              </div>
              <LogoutButton />
            </div>
          </div>

          <nav className="mt-6 flex flex-wrap gap-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-cav-medium-gray bg-cav-medium-gray/20 px-4 py-2 text-xs font-mono font-semibold text-cav-light-gray transition duration-200 hover:border-cav-gold/60 hover:bg-cav-gold hover:text-cav-black"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header> */}

        <section className="rounded">
          {children}
        </section>

      </div>

      <footer className="w-full fixed bottom-5 left-0 px-3">
        <nav className="flex items-center justify-around gap-3 p-3 bg-cav-dark-gray shadow-xl shadow-black/40 rounded-full border border-cav-medium-gray/40">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full border px-4 py-2 text-xs font-mono font-semibold transition duration-200 ${
                pathname === item.href
                  ? "border-cav-gold bg-cav-gold text-cav-black"
                  : "border-cav-medium-gray bg-cav-medium-gray/20 text-cav-light-gray hover:border-cav-gold/60 hover:bg-cav-gold hover:text-cav-black"
              }`}
            >
              {item.label}
            </Link>
          ))}

          <LogoutButton />

        </nav>
      </footer>
    </main>
  );
}