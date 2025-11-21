'use client';

import Link from 'next/link';
import { 
  MessageSquare, 
  LayoutDashboard, 
  Brain, 
  Eye, 
  Lightbulb, 
  MessageCircle,
  LucideIcon 
} from 'lucide-react';

interface Feature {
  text: string;
}

type IconName = 'eye' | 'messageSquare' | 'brain' | 'lightbulb' | 'messageCircle';

const iconMap: Record<IconName, LucideIcon> = {
  eye: Eye,
  messageSquare: MessageSquare,
  brain: Brain,
  lightbulb: Lightbulb,
  messageCircle: MessageCircle,
};

interface ModuleCardProps {
  title: string;
  subtitle: string;
  description: string;
  iconName: IconName;
  href: string;
  iconBgColor: string;
  iconColor: string;
  features: Feature[];
  highlightText?: string;
  highlightIconName?: IconName;
  buttonBgColor?: string;
  buttonHoverColor?: string;
  titleHoverColor?: string;
}

export default function ModuleCard({
  title,
  subtitle,
  description,
  iconName,
  href,
  iconBgColor,
  iconColor,
  features,
  highlightText,
  highlightIconName,
  buttonBgColor = 'bg-red-600',
  buttonHoverColor = 'hover:bg-red-700',
  titleHoverColor = 'group-hover:text-red-600',
}: ModuleCardProps) {
  const Icon = iconMap[iconName];
  const HighlightIcon = highlightIconName ? iconMap[highlightIconName] : null;

  return (
    <Link href={href} className="block">
      <div className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 h-full flex flex-col">
        <div className="p-6 flex-1 flex flex-col">
          {/* Icono circular */}
          <div className={`w-16 h-16 rounded-full ${iconBgColor} flex items-center justify-center mb-5 group-hover:scale-105 transition-transform`}>
            <Icon className={`w-8 h-8 ${iconColor}`} />
          </div>

          {/* Título y subtítulo */}
          <h3 className={`text-2xl font-bold text-gray-900 mb-1 ${titleHoverColor} transition-colors`}>
            {title}
          </h3>
          <p className="text-base text-gray-600 mb-3 font-medium">
            {subtitle}
          </p>

          {/* Descripción */}
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            {description}
          </p>

          {/* Lista de características */}
          <ul className="space-y-2.5 mb-5 flex-1">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="text-red-600 mt-1">•</span>
                <span className="text-gray-700 text-sm leading-relaxed">{feature.text}</span>
              </li>
            ))}
          </ul>

          {/* Sección destacada */}
          {highlightText && HighlightIcon && (
            <div className="bg-gray-50 rounded-lg p-3.5 mb-5 border border-gray-200">
              <div className="flex items-start gap-3">
                <HighlightIcon className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-700 text-sm font-medium leading-relaxed">
                  {highlightText}
                </p>
              </div>
            </div>
          )}

          {/* Botón de acceso */}
          <div className="mt-auto">
            <button className={`w-full ${buttonBgColor} ${buttonHoverColor} text-white font-semibold py-2.5 px-5 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 group-hover:shadow-md`}>
              Acceder
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
