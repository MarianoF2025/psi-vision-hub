import React from "react";

export default function Container({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`container-psi ${className}`}>{children}</div>;
}


