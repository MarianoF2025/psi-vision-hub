"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/crm", label: "CRM" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<string>("light");
  const { user, signOut } = useAuth();
  const { show } = useToast();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const saved = localStorage.getItem("psi-theme");
    const next = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("psi-theme", next);
  }
  return (
    <nav className="w-full border-b border-[#e8e8ef] bg-white/90 backdrop-blur">
      <div className="container-psi py-3 flex items-center justify-between text-[12px] text-[#6b7280]">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-psi-red/10 text-psi-red">PSI</span>
          <Link href="/" className="font-medium text-[#111827]">PSI Plataforma Integral</Link>
        </div>
        <div className="flex items-center gap-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`${pathname === l.href ? "text-[#111827]" : "hover:text-[#111827]"}`}
            >
              {l.label}
            </Link>
          ))}
          {!user && (
            <Link href="/login" className="inline-flex items-center rounded-md bg-psi-red px-3 py-1.5 text-[12px] font-medium text-white hover:brightness-95">
              Iniciar sesión
            </Link>
          )}
          {user && (
            <button onClick={() => { signOut(); show("Sesión cerrada", { title: "Hasta pronto", variant: "info" }); }} className="inline-flex items-center gap-1 rounded-md border border-[#e5e7eb] px-2 py-1 hover:bg-[#f5f6fb]">
              <LogOut size={14} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          )}
          <button aria-label="Cambiar tema" onClick={toggleTheme} className="rounded-md border border-[#e5e7eb] px-2 py-1 hover:bg-[#f5f6fb]">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </nav>
  );
}


