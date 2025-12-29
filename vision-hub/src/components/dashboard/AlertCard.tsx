'use client';

import { Card, Badge, Text } from '@tremor/react';
import { AlertTriangle, AlertCircle, Info, X, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

interface AlertCardProps {
  id: string;
  titulo: string;
  mensaje: string;
  severidad: 'alta' | 'media' | 'baja';
  area: string;
  accion?: string;
  link?: string;
  score?: number;
  timestamp: string;
  onDismiss?: (id: string) => void;
}

const severidadConfig = {
  alta: { icon: AlertTriangle, color: 'rose', bgColor: 'bg-rose-50', borderColor: 'border-l-rose-500', textColor: 'text-rose-700' },
  media: { icon: AlertCircle, color: 'amber', bgColor: 'bg-amber-50', borderColor: 'border-l-amber-500', textColor: 'text-amber-700' },
  baja: { icon: Info, color: 'blue', bgColor: 'bg-blue-50', borderColor: 'border-l-blue-500', textColor: 'text-blue-700' }
};

export default function AlertCard({ id, titulo, mensaje, severidad, area, accion, link, score, timestamp, onDismiss }: AlertCardProps) {
  const config = severidadConfig[severidad];
  const Icono = config.icon;
  const tiempoRelativo = formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: es });

  return (
    <Card className={`${config.bgColor} border-l-4 ${config.borderColor} relative p-3`}>
      {onDismiss && (
        <button 
          onClick={() => onDismiss(id)} 
          className="absolute top-2 right-2 p-0.5 hover:bg-white/50 rounded transition-colors" 
          title="Descartar"
        >
          <X className="w-3.5 h-3.5 text-gray-500" />
        </button>
      )}
      
      <div className="flex items-start space-x-2 pr-6">
        <div className="p-1.5 rounded-md bg-white">
          <Icono className={`w-4 h-4 ${config.textColor}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1.5 mb-0.5">
            <Text className="font-semibold text-gray-900 text-xs">{titulo}</Text>
            <Badge color={config.color as 'rose' | 'amber' | 'blue'} size="xs">{area}</Badge>
            {score && <span className="text-[10px] text-gray-500">{score}% confianza</span>}
          </div>
          
          <Text className="text-gray-600 text-[11px] mb-1.5">{mensaje}</Text>
          
          {accion && (
            <div className="flex items-center space-x-1.5 mt-2">
              <Text className="text-[11px] font-medium text-gray-700">Sugerencia: {accion}</Text>
              {link && (
                <Link href={link} className="inline-flex items-center text-[11px] text-[#e63946] hover:underline">
                  Ver más <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                </Link>
              )}
            </div>
          )}
          
          <Text className="text-[10px] text-gray-400 mt-1.5">{tiempoRelativo}</Text>
        </div>
      </div>
    </Card>
  );
}
