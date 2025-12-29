'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import MorningBriefing from '@/components/home/MorningBriefing';
import AlertCard from '@/components/dashboard/AlertCard';
import { Title } from '@tremor/react';

// Datos de ejemplo para alertas (usando props correctas de AlertCard)
const alertasEjemplo = [
  {
    id: '1',
    severidad: 'alta' as const,
    titulo: 'CPL elevado en campaña TEA',
    mensaje: 'El costo por lead subió 45% respecto a la semana pasada. Revisar segmentación.',
    area: 'Marketing',
    timestamp: new Date().toISOString(),
    accion: 'Pausar campaña y revisar audiencia',
    link: '/marketing'
  },
  {
    id: '2',
    severidad: 'media' as const,
    titulo: '5 leads sin respuesta >24h',
    mensaje: 'Hay leads de ayer que no fueron contactados. Priorizar seguimiento.',
    area: 'Ventas',
    timestamp: new Date().toISOString(),
    accion: 'Asignar a vendedora disponible',
    link: '/ventas'
  },
  {
    id: '3',
    severidad: 'baja' as const,
    titulo: 'Pico de consultas esperado',
    mensaje: 'Basado en el histórico, mañana habrá +30% de mensajes entrantes.',
    area: 'Sistema',
    timestamp: new Date().toISOString(),
    link: '/overview'
  }
];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e63946]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header titulo="Dashboard" subtitulo="Centro de comando PSI" />
      
      <div className="p-3 lg:p-4 space-y-3 lg:space-y-4">
        <MorningBriefing />
        
        {/* Alertas Activas */}
        <div>
          <Title className="text-sm lg:text-base mb-2 lg:mb-3 text-[#1e2a3b]">
            Alertas Activas
          </Title>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-3">
            {alertasEjemplo.map((alerta) => (
              <AlertCard key={alerta.id} {...alerta} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
