"use client";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Check as CheckIcon, Monitor, MessageSquare, Database, Brain, Layers } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  function handleAccess(target: string) {
    if (user) {
      router.push(target);
    } else {
      router.push(`/login?next=${encodeURIComponent(target)}`);
    }
  }

  return (
    <div className="min-h-dvh bg-psi-body text-[#1f2937]">
      {/* Hero */}
      <main>
        <Container>
        <section className="py-10 sm:py-14">
          <h1 className="text-center text-[24px] sm:text-[28px] md:text-[32px] font-semibold text-[#111827]">PSI Plataforma Integral</h1>
          <p className="mt-2 text-center text-[13px] sm:text-[14px] text-[#6b7280] max-w-[680px] mx-auto">
            Centraliza todas tus procesos empresariales. Desde marketing y ventas hasta gestión de clientes y
            administración educativa.
          </p>
        </section>

        {/* Main two cards */}
        <section className="grid gap-5 md:grid-cols-2">
          {/* PSI Vision Hub */}
          <Card className="p-5 flex flex-col">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-psi-red/10 flex items-center justify-center text-psi-red"><Monitor size={18} /></div>
              <div>
                <h3 className="text-[14px] font-semibold text-[#111827]">PSI Vision Hub</h3>
                <p className="text-[11px] text-[#6b7280] -mt-0.5">Marketing, Ventas & Analítica</p>
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-5 text-[#4b5563]">
              Vision Hub integra todas tus labores de marketing, ventas y alumnos en un solo
              espacio. Te muestra métricas en tiempo real y te avisa cuando algo necesita
              atención.
            </p>
            <ul className="mt-3 space-y-2 text-[12px] text-[#374151]">
              <li className="flex gap-2"><Check className="text-psi-red"/>Marketing: CPL, ROI y rendimiento por canal</li>
              <li className="flex gap-2"><Check className="text-psi-red"/>Venta: conversión, ranking y vendedores</li>
              <li className="flex gap-2"><Check className="text-psi-red"/>Alumnos: retención, progreso y satisfacción</li>
              <li className="flex gap-2"><Check className="text-psi-red"/>KPIs: alertas y recomendaciones automáticas</li>
            </ul>
            <div className="mt-3 rounded-md bg-psi-red/10 px-3 py-2 text-[12px] text-psi-red">
              Datos claros para decidir mejor, todos los días.
            </div>
            <div className="mt-auto pt-2">
              <Button variant="danger" onClick={() => handleAccess('/dashboard')}>Acceder</Button>
            </div>
          </Card>

          {/* PSI CRM-COM */}
          <Card className="p-5 flex flex-col">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-psi-blue/10 flex items-center justify-center text-psi-blue"><MessageSquare size={18} /></div>
              <div>
                <h3 className="text-[14px] font-semibold text-[#111827]">PSI CRM-COM</h3>
                <p className="text-[11px] text-[#6b7280] -mt-0.5">Tu espacio de trabajo en WhatsApp</p>
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-5 text-[#4b5563]">
              CRM-COM te ayuda a tratar todo en un solo lugar: contactos, mensajes y
              segmentación. Podrás ver cada conversación, marcar su estado y dejar que el
              sistema de recordatorio se encargue.
            </p>
            <ul className="mt-3 space-y-2 text-[12px] text-[#374151]">
              <li className="flex gap-2"><Check className="text-psi-blue"/>Bandeja ordenada por tipo de contacto</li>
              <li className="flex gap-2"><Check className="text-psi-blue"/>Seguimiento automático y recordatorios</li>
              <li className="flex gap-2"><Check className="text-psi-blue"/>Historial completo y buscabilidad en Supabase</li>
              <li className="flex gap-2"><Check className="text-psi-blue"/>Integración directa con Vision Hub</li>
            </ul>
            <div className="mt-3 rounded-md bg-[#f3f6ff] px-3 py-2 text-[12px] text-[#4b5563]">
              <div className="flex items-center gap-2">
                <span className="size-4 rounded-full border border-[#d4dcff] inline-flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-psi-blue"><circle cx="12" cy="12" r="9" strokeWidth="2"/></svg>
                </span>
                <span>Simple, organizado y hecho para trabajar tranquilo.</span>
              </div>
            </div>
            <div className="mt-auto pt-2">
              <Button onClick={() => handleAccess('/crm')}>Acceder</Button>
            </div>
          </Card>
        </section>

        {/* Bottom features */}
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <Feature iconBg="bg-[#e8fff2]" iconColor="text-[#22c55e]" title="Datos Unificados" desc="Toda tu información empresarial en un solo lugar."><Database size={16}/></Feature>
          <Feature iconBg="bg-[#f3e8ff]" iconColor="text-[#a855f7]" title="Inteligencia Artificial" desc="Alertas automáticas y recomendaciones inteligentes."><Brain size={16}/></Feature>
          <Feature iconBg="bg-[#fff3e6]" iconColor="text-[#f59e0b]" title="Escalabilidad" desc="Módulos que crecen con tu organización."><Layers size={16}/></Feature>
        </section>
        <div className="h-10"/>
        </Container>
      </main>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <span className={`mt-0.5 inline-flex size-4 items-center justify-center ${className}`}>
      <CheckIcon size={14} />
    </span>
  );
}

function Feature({ iconBg, iconColor, title, desc, children }: { iconBg: string; iconColor: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className={`mb-2 inline-flex size-8 items-center justify-center rounded-full ${iconBg} ${iconColor}`}>{children}</div>
      <div className="text-[12px] font-semibold text-[#111827]">{title}</div>
      <div className="mt-1 text-[11px] text-[#6b7280]">{desc}</div>
    </Card>
  );
}
