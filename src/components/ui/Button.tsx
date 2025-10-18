import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "outline";
  size?: "sm" | "md";
};

export default function Button({
  className = "",
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors";
  const sizes = size === "sm" ? "px-3 py-1.5 text-[12px]" : "px-4 py-2 text-[12px]";
  const variants =
    variant === "secondary"
      ? "border border-[#e5e7eb] text-[#111827] hover:bg-[#f5f6fb] bg-white"
      : variant === "danger"
      ? "bg-psi-red text-white hover:brightness-95"
      : variant === "outline"
      ? "border border-[#cfd3e1] text-[#111827] bg-transparent hover:bg-white"
      : "bg-psi-blue text-white hover:brightness-95";
  return <button className={`${base} ${sizes} ${variants} ${className}`} {...props} />;
}


