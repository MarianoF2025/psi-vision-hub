'use client';

import { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import { InboxType } from '@/lib/types/crm';
import { 
  ShoppingCart, 
  GraduationCap, 
  Building, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  Router,
  User as UserIcon,
  Tag,
  MessageCircle,
  BarChart3,
  Settings,
  Moon,
  LogOut
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface InboxSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  selectedInbox: InboxType;
  onSelectInbox: (inbox: InboxType) => void;
  user: User | null;
  inboxStats?: Record<string, number>;
}

interface InboxItem {
  id: string;
  type: InboxType;
  label: string;
  icon: typeof ShoppingCart;
  count: number;
  subInboxes?: Array<{ id: string; label: string; count: number }>;
}

const inboxes: InboxItem[] = [
  { 
    id: 'psi-principal',
    type: 'PSI Principal',
    label: 'PSI Principal',
    icon: Router,
    count: 8,
  },
  {
    id: 'ventas',
    type: 'Ventas',
    label: 'Ventas',
    icon: ShoppingCart,
    count: 0,
    subInboxes: [
      { id: 'ventas-1', label: 'Ventas 1', count: 0 },
      { id: 'ventas-2', label: 'Ventas 2', count: 0 },
      { id: 'ventas-3', label: 'Ventas 3', count: 0 },
    ],
  },
  { 
    id: 'alumnos',
    type: 'Alumnos',
    label: 'Alumnos',
    icon: GraduationCap,
    count: 0,
  },
  { 
    id: 'administracion',
    type: 'Administración',
    label: 'Administración',
    icon: Building,
    count: 0,
  },
  { 
    id: 'comunidad',
    type: 'Comunidad',
    label: 'Comunidad',
    icon: Users,
    count: 0,
  },
];

const functions = [
  { id: 'contactos', label: 'Contactos', icon: UserIcon },
  { id: 'etiquetas', label: 'Etiquetas', icon: Tag },
  { id: 'respuestas', label: 'Respuestas', icon: MessageCircle },
  { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
  { id: 'ajustes', label: 'Ajustes', icon: Settings },
];

export default function InboxSidebar({
  isCollapsed,
  onToggle,
  selectedInbox,
  onSelectInbox,
  user,
  inboxStats = {},
}: InboxSidebarProps) {
  const [expandedInboxes, setExpandedInboxes] = useState<Set<string>>(new Set());
  const [darkMode, setDarkMode] = useState(false);
  const supabase = createClient();

  const toggleInboxExpansion = (inboxId: string) => {
    const newExpanded = new Set(expandedInboxes);
    if (newExpanded.has(inboxId)) {
      newExpanded.delete(inboxId);
    } else {
      newExpanded.add(inboxId);
    }
    setExpandedInboxes(newExpanded);
  };

  const handleInboxSelect = (inbox: InboxItem) => {
    if (inbox.subInboxes) {
      toggleInboxExpansion(inbox.id);
    } else {
      onSelectInbox(inbox.type as InboxType);
    }
  };

  const handleSubInboxSelect = (subInbox: { id: string; label: string }, parentType: InboxType) => {
    onSelectInbox(parentType);
    // TODO: Filtrar por sub-inbox específico
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-[250px]'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">PSI</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Asociación PSI</p>
                <p className="text-xs text-gray-500">Centro de Atención</p>
              </div>
            </div>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title={isCollapsed ? 'Expandir' : 'Colapsar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Bandejas de Entrada */}
      {!isCollapsed && (
        <div className="px-3 py-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Bandejas de Entrada</h3>
        </div>
      )}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {inboxes.map((inbox) => {
          const isExpanded = expandedInboxes.has(inbox.id);
          const isSelected = selectedInbox === inbox.type;
          // Mapear IDs de inbox a áreas de Supabase
          const statsKey = inbox.id === 'psi-principal' ? 'PSI Principal' : inbox.type;
          const count = inboxStats[statsKey] || inboxStats[inbox.id] || inbox.count || 0;
          const Icon = inbox.icon;

          return (
            <div key={inbox.id}>
              <button
                onClick={() => handleInboxSelect(inbox)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-primary text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? inbox.label : undefined}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {!isCollapsed && count > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{inbox.label}</div>
                  </div>
                )}
                {!isCollapsed && inbox.subInboxes && (
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                )}
              </button>

              {/* Sub-inboxes */}
              {!isCollapsed && isExpanded && inbox.subInboxes && (
                <div className="ml-4 mt-1 space-y-1">
                  {inbox.subInboxes.map((subInbox) => (
                    <button
                      key={subInbox.id}
                      onClick={() => handleSubInboxSelect(subInbox, inbox.type as InboxType)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <span>{subInbox.label}</span>
                      {subInbox.count > 0 && (
                        <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                          {subInbox.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Funciones */}
      {!isCollapsed && (
        <>
          <div className="px-3 py-2 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Funciones</h3>
          </div>
          <nav className="px-2 pb-2 space-y-1">
            {functions.map((func) => {
              const Icon = func.icon;
              return (
                <button
                  key={func.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{func.label}</span>
                </button>
              );
            })}
          </nav>
        </>
      )}

      {/* Footer con modo oscuro y usuario */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200 space-y-4">
          {/* Modo Oscuro */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Modo Oscuro</span>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                darkMode ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  darkMode ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          {/* Información del usuario */}
          {user && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Conectado como:</p>
              <p className="text-sm font-medium text-gray-900">{user.name || 'Admin Sistema'}</p>
              <p className="text-xs text-gray-500 truncate">{user.email || 'admin@psivisionhub.com'}</p>
              <button
                onClick={handleLogout}
                className="mt-3 text-xs text-primary hover:text-primary-dark transition-colors flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}

          {/* Copyright */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400 text-center">PSI Vision Hub © 2025</p>
          </div>
        </div>
      )}
    </div>
  );
}
