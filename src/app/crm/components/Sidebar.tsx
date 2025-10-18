// src/app/crm/components/Sidebar.tsx
'use client'

import { ChevronLeft, ChevronRight, MessageSquare, Briefcase, TrendingUp, Users, Inbox, User, BarChart3 } from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  activeSidebarItem: string
  setActiveSidebarItem: (item: string) => void
  activeFunctionItem: string
  setActiveFunctionItem: (item: string) => void
}

export function Sidebar({
  collapsed,
  setCollapsed,
  activeSidebarItem,
  setActiveSidebarItem,
  activeFunctionItem,
  setActiveFunctionItem
}: SidebarProps) {
  const mainAreas = [
    { id: 'Ventas', icon: MessageSquare, label: 'Ventas', stats: 'Leads 24, Seguimientos 12, Conversiones 3' },
    { id: 'Alumnos', icon: Briefcase, label: 'Alumnos', stats: 'Activos 156, Pendientes 8' },
    { id: 'Administración', icon: TrendingUp, label: 'Administración', stats: 'Usuarios 12, Reportes 5, Configuración' },
    { id: 'Comunidad', icon: Users, label: 'Comunidad', stats: 'Grupos WhatsApp 8, Eventos 3, Recursos 15' }
  ]

  const functions = [
    { id: 'CRM Inbox', icon: Inbox, label: 'CRM Inbox' },
    { id: 'Contactos', icon: User, label: 'Contactos' },
    { id: 'Dashboard', icon: BarChart3, label: 'Dashboard' }
  ]

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
      collapsed ? 'w-[72px]' : 'w-[280px]'
    }`}>
      {/* Toggle Button */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Resumen Hoy - SIEMPRE VISIBLE */}
      <div className="p-4 border-b border-gray-200">
        {!collapsed && (
          <h3 className="text-sm font-semibold text-gray-600 mb-3">RESUMEN HOY</h3>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">45</div>
            <div className="text-xs text-gray-500">Activos</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-600">12</div>
            <div className="text-xs text-gray-500">Pendientes</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-600">23</div>
            <div className="text-xs text-gray-500">Cerrados</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">8</div>
            <div className="text-xs text-gray-500">Conversiones</div>
          </div>
        </div>
      </div>

      {/* Áreas principales con scroll */}
      <div className="flex-1 overflow-y-auto">
        {mainAreas.map((area) => {
          const Icon = area.icon
          return (
            <div key={area.id} className="border-b border-gray-100">
              <button
                onClick={() => setActiveSidebarItem(area.id)}
                className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors ${
                  activeSidebarItem === area.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                }`}
              >
                <Icon 
                  size={20} 
                  className={`flex-shrink-0 ${
                    activeSidebarItem === area.id ? 'text-blue-600' : 'text-gray-500'
                  }`} 
                />
                {!collapsed && (
                  <div className="flex-1 text-left">
                    <div className="font-medium">{area.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{area.stats}</div>
                  </div>
                )}
              </button>
            </div>
          )
        })}

        {/* Separador */}
        <div className="my-4 h-px bg-gray-200" />

        {/* FUNCIONES */}
        {!collapsed && (
          <div className="px-4 py-2 text-xs font-semibold text-gray-500">FUNCIONES</div>
        )}
        
        {functions.map((func) => {
          const Icon = func.icon
          return (
            <div key={func.id} className="border-b border-gray-100">
              <button
                onClick={() => setActiveFunctionItem(func.id)}
                className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors ${
                  activeFunctionItem === func.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                }`}
              >
                <Icon 
                  size={20} 
                  className={`flex-shrink-0 ${
                    activeFunctionItem === func.id ? 'text-blue-600' : 'text-gray-500'
                  }`} 
                />
                {!collapsed && (
                  <span className="text-gray-700">{func.label}</span>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
