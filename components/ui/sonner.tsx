"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      closeButton
      position="top-center"
      richColors
      theme="dark"
      toastOptions={{
        classNames: {
          toast:
            "border border-cav-medium-gray bg-cav-dark-gray text-cav-light-gray shadow-xl shadow-black/40",
          title: "font-mono text-sm font-semibold tracking-tight",
          description: "font-sans text-xs text-cav-light-gray/85",
          actionButton:
            "bg-cav-gold text-cav-black font-mono text-xs font-semibold",
          cancelButton:
            "bg-cav-medium-gray text-cav-light-gray font-mono text-xs",
          closeButton:
            "bg-cav-medium-gray text-cav-light-gray border border-cav-medium-gray",
        },
      }}
    />
  );
}