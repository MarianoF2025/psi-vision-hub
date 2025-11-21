import { getCurrentUser } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ModuleCard from '@/components/ModuleCard';
import { Users, Brain } from 'lucide-react';

export default async function HomePage() {
  const user = await getCurrentUser();

  const modules = [
    {
      title: 'PSI Vision Hub',
      subtitle: 'Marketing, Ventas & Analytics',
      description: 'Vision Hub integra todos los tableros de marketing, ventas y alumnos en un solo espacio. Te muestra métricas en tiempo real y te avisa cuando algo necesita atención.',
      iconName: 'eye' as const,
      href: '/dashboard',
      iconBgColor: 'bg-red-600',
      iconColor: 'text-white',
      features: [
        { text: 'Marketing: CPL, ROI y rendimiento por canal' },
        { text: 'Ventas: conversión, ranking y evolución' },
        { text: 'Alumnos: retención, progreso y satisfacción' },
        { text: 'IA: alertas y recomendaciones automáticas' },
      ],
      highlightText: 'Datos claros para decidir mejor, todos los días.',
      highlightIconName: 'lightbulb' as const,
    },
    {
      title: 'PSI CRM-COM',
      subtitle: 'Tu espacio de trabajo en WhatsApp',
      description: 'CRM-COM te ayuda a tener todo en un solo lugar: contactos, mensajes y seguimientos. Podés ver cada conversación, marcar su estado y dejar que el sistema te recuerde los seguimientos.',
      iconName: 'messageSquare' as const,
      href: '/crm-com',
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      features: [
        { text: 'Bandeja ordenada por tipo de contacto' },
        { text: 'Seguimientos automáticos y recordatorios' },
        { text: 'Historial completo y trazabilidad en Supabase' },
        { text: 'Integración directa con Vision Hub' },
      ],
      highlightText: 'Simple, organizado y hecho para trabajar tranquilo.',
      highlightIconName: 'messageCircle' as const,
      buttonBgColor: 'bg-[#2563EB]',
      buttonHoverColor: 'hover:bg-[#1D4ED8]',
      titleHoverColor: 'group-hover:text-[#2563EB]',
    },
    {
      title: 'IA Especialista TCC',
      subtitle: 'Asistente de IA para Terapia Cognitivo-Conductual',
      description: 'Asistente de inteligencia artificial especializado en Terapia Cognitivo-Conductual. Disponible para alumnos y staff, proporciona apoyo y orientación basada en principios TCC.',
      iconName: 'brain' as const,
      href: '/ia-tcc',
      iconBgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      features: [
        { text: 'Asistencia especializada en TCC' },
        { text: 'Disponible 24/7 para alumnos y staff' },
        { text: 'Respuestas basadas en evidencia' },
        { text: 'Seguimiento y recomendaciones personalizadas' },
      ],
      highlightText: 'Apoyo profesional cuando lo necesites.',
      highlightIconName: 'brain' as const,
    },
  ];

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar userRole={user?.role} />
      
      <div className="flex-1 ml-64">
        <Header userName={user?.name} userEmail={user?.email} />
        
        <main className="pt-16 pb-8">
          <div className="max-w-6xl mx-auto px-6">
            {/* Título principal */}
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                PSI Plataforma Integral
              </h1>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Centraliza todos tus procesos empresariales. Desde marketing y ventas hasta gestión de clientes y administración educativa.
              </p>
            </div>

            {/* Cards de módulos principales - 2 columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {modules.slice(0, 2).map((module) => (
                <ModuleCard
                  key={module.title}
                  title={module.title}
                  subtitle={module.subtitle}
                  description={module.description}
                  iconName={module.iconName}
                  href={module.href}
                  iconBgColor={module.iconBgColor}
                  iconColor={module.iconColor}
                  features={module.features}
                  highlightText={module.highlightText}
                  highlightIconName={module.highlightIconName}
                  buttonBgColor={(module as any).buttonBgColor}
                  buttonHoverColor={(module as any).buttonHoverColor}
                  titleHoverColor={(module as any).titleHoverColor}
                />
              ))}
            </div>

            {/* Cards informativas adicionales - 3 columnas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1.5">Datos Unificados</h3>
                <p className="text-gray-600 text-sm">Toda la información empresarial en un solo lugar.</p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                  <Brain className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1.5">Inteligencia Artificial</h3>
                <p className="text-gray-600 text-sm">Alertas automáticas y recomendaciones estratégicas.</p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1.5">Escalabilidad</h3>
                <p className="text-gray-600 text-sm">Módulos que crecen con tu organización.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
