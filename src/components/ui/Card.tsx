import React from "react";

export default function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-xl border border-[#efeef6] bg-white shadow-[0_1px_0_0_#f0f0f6] ${className}`}>{children}</div>;
}


