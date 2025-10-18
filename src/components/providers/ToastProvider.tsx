"use client";
import React, { createContext, useContext, useState, useCallback } from "react";

type Toast = { id: number; title?: string; message: string; variant: "success" | "error" | "info" };

type ToastContextValue = {
  show: (
    message: string,
    opts?: { title?: string; timeoutMs?: number; variant?: "success" | "error" | "info" }
  ) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, opts?: { title?: string; timeoutMs?: number; variant?: "success" | "error" | "info" }) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, title: opts?.title, variant: opts?.variant ?? "info" }]);
    const timeout = opts?.timeoutMs ?? 2500;
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, timeout);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 space-y-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-[toast-in_250ms_ease-out] rounded-lg px-5 py-3.5 shadow-lg border bg-white/95 ${
              t.variant === "success"
                ? "border-psi-blue"
                : t.variant === "error"
                ? "border-psi-red"
                : "border-psi-blue"
            }`}
          >
            {t.title && <div className="text-[13px] font-semibold text-[#111827]">{t.title}</div>}
            <div className="text-[13px] text-[#374151]">{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}


