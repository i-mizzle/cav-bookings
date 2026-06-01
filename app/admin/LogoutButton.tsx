"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import LogoutIcon from "@/components/elements/icons/LogoutIcon";

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
      className="rounded-full h-10 w-10 flex items-center justify-center bg-white/20 text-cav-black text-xs font-mono font-semibold transition duration-200 shadow-xl shadow-black/30 active:bg-cav-black active:text-cav-light-gray disabled:cursor-not-allowed disabled:bg-cav-gold/50 disabled:text-cav-black/60 disabled:shadow-none"
    >
      <LogoutIcon className="w-6 h-6 inline-block" />
      {/* {isPending ? "Signing out..." : "Sign out"} */}
    </button>
  );
}