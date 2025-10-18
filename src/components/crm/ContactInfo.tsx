// src/components/crm/ContactInfo.tsx - Clonando diseño exacto de Chatwoot
"use client"

import { useState } from "react"
import type { Conversation } from "@/lib/supabase"

interface ContactInfoProps {
  contact: Conversation | null
  onUpdateContact: (conversationId: string, newEstado: string) => void
}

export default function ContactInfo({ contact, onUpdateContact }: ContactInfoProps) {
  const [isEditing, setIsEditing] = useState(false)

  // Función para obtener color del avatar
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-red-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  // Función para obtener iniciales
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2)
  }

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Función para formatear tiempo
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!contact) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Información del Contacto</h3>
          <p className="text-gray-500 text-sm">Selecciona una conversación para ver la información del contacto</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto">
      {/* Header - EXACTO de Chatwoot */}
      <div className="p-6 text-center border-b border-gray-200">
        <div className={`w-20 h-20 rounded-full ${getAvatarColor(contact.persona?.nombre || contact.nombre || 'Usuario')} mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold`}>
          {getInitials(contact.persona?.nombre || contact.nombre || 'Usuario')}
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{contact.persona?.nombre || contact.nombre || contact.persona?.telefono || contact.telefono || 'Sin nombre'}</h2>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="text-blue-500 text-sm hover:text-blue-600 transition-colors"
        >
          {isEditing ? 'Cancelar' : 'Editar'}
        </button>
      </div>

      {/* Información del contacto - EXACTO de Chatwoot */}
      <div className="p-6 space-y-6">
        {/* Teléfono */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-2">
            Teléfono
          </label>
          <p className="text-sm text-gray-900">{contact.persona?.telefono || contact.telefono}</p>
        </div>

        {/* Fecha de creación */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-2">
            Creado
          </label>
          <p className="text-sm text-gray-900">{formatDate(contact.created_at)}</p>
        </div>

        {/* Última actividad */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-2">
            Última actividad
          </label>
          <p className="text-sm text-gray-900">{formatTime(contact.updated_at || contact.created_at)}</p>
        </div>

        {/* Estado */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-2">
            Estado
          </label>
          {isEditing ? (
            <select
              value={contact.estado || 'nuevo'}
              onChange={(e) => onUpdateContact(contact.id, e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="nuevo">Nuevo</option>
              <option value="abierto">Abierto</option>
              <option value="pendiente">Pendiente</option>
              <option value="resuelto">Resuelto</option>
              <option value="cerrado">Cerrado</option>
            </select>
          ) : (
            <p className="text-sm text-gray-900 capitalize">{contact.estado || 'Nuevo'}</p>
          )}
        </div>

        {/* Asignado a */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-2">
            Asignado a
          </label>
          {isEditing ? (
            <select
              value={contact.asignado_a || ''}
              onChange={(e) => onUpdateContact(contact.id, e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sin asignar</option>
              <option value="admin@psivisionhub.com">Admin</option>
              <option value="agente1@psivisionhub.com">Agente 1</option>
              <option value="agente2@psivisionhub.com">Agente 2</option>
            </select>
          ) : (
            <p className="text-sm text-gray-900">
              {contact.asignado_a ? contact.asignado_a.split('@')[0] : 'Sin asignar'}
            </p>
          )}
        </div>

        {/* Separador */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Detalles de la conversación</h3>
          
          {/* Inbox */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-2">
              Inbox
            </label>
            <p className="text-sm text-gray-900">{contact.inbox || 'EME Automations'}</p>
          </div>

          {/* Total de mensajes */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-2">
              Total mensajes
            </label>
            <p className="text-sm text-gray-900">{contact.total_mensajes || '0'}</p>
          </div>

          {/* Canal */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-2">
              Canal
            </label>
            <p className="text-sm text-gray-900">{contact.canal || 'Channel::Whatsapp'}</p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="pt-6 border-t border-gray-200">
          <div className="space-y-2">
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Crear nota
              </div>
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Agregar etiqueta
              </div>
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Programar seguimiento
              </div>
            </button>
            <button 
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              onClick={() => window.open(`https://wa.me/${(contact.persona?.telefono || contact.telefono || '').replace('+', '')}`, '_blank')}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
                Abrir WhatsApp
              </div>
            </button>
            <button 
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              onClick={() => navigator.clipboard.writeText(contact.persona?.telefono || contact.telefono || '')}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copiar teléfono
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}