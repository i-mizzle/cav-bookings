"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    startTransition(() => {
      router.replace("/admin");
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className="rounded-full h-10 px-4 bg-cav-gold text-cav-black text-xs font-mono font-semibold transition duration-200 shadow-xl shadow-black/30 active:bg-cav-black active:text-cav-light-gray disabled:cursor-not-allowed disabled:bg-cav-gold/50 disabled:text-cav-black/60 disabled:shadow-none"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}