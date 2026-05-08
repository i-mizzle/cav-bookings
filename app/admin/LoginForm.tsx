"use client";

import TextField from "@/components/elements/form/TextField";
import PasswordField from "../../components/elements/form/PasswordField";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      setErrorMessage(data?.message ?? "Unable to sign in right now.");
      return;
    }

    startTransition(() => {
      router.replace("/admin/dashboard");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <TextField
        requiredField={true}
        inputLabel="Email address"
        inputPlaceholder="admin@example.com"
        fieldId="email"
        inputName="email"
        inputType="email"
        autoComplete="email"
        hasError={false}
        returnFieldValue={(value: unknown) => setEmail(String(value))}
        preloadValue={email}
        disabled={isPending}
      />

      <PasswordField
        requiredField={true}
        inputLabel="Password"
        inputPlaceholder="Enter your password"
        fieldId="password"
        inputName="password"
        autoComplete="current-password"
        hasError={false}
        returnFieldValue={(value: unknown) => setPassword(String(value))}
        preloadValue={password}
        disabled={isPending}
      />

      {errorMessage ? (
        <p className="rounded border border-red-600/30 bg-red-950/30 px-4 py-3 text-xs font-sans text-red-300">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full h-11 bg-cav-gold px-4 text-xs font-mono font-semibold text-cav-black transition duration-200 shadow-xl shadow-black/30 active:bg-cav-black active:text-cav-light-gray disabled:cursor-not-allowed disabled:bg-cav-gold/50 disabled:text-cav-black/60 disabled:shadow-none"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}