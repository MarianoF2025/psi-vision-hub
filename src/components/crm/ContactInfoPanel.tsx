// src/components/crm/ContactInfoPanel.tsx - Panel de información del contacto con auto-save
'use client'

import { useState, useEffect } from 'react'
import { 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Tag, 
  MessageCircle,
  Check,
  Loader2,
  X,
  Edit3
} from 'lucide-react'
import type { Conversation } from '@/lib/supabase'
import ContactEditModal from './ContactEditModal'

interface ContactInfoPanelProps {
  contact: Conversation | null
  onUpdateContact?: (contactId: string, updates: Partial<Conversation>) => Promise<void>
}

export default function ContactInfoPanel({ contact, onUpdateContact }: ContactInfoPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [selectedEstado, setSelectedEstado] = useState('')
  const [selectedAssignee, setSelectedAssignee] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showEditModal, setShowEditModal] = useState(false)

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    try {
      // console.log('formatDate recibió:', dateString, 'tipo:', typeof dateString)
      
      if (!dateString) {
        return 'Sin fecha'
      }
      
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        console.warn('Fecha inválida:', dateString)
        return 'Fecha inválida'
      }
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch (error) {
      console.error('Error en formatDate:', error, dateString)
      return 'Fecha inválida'
    }
  }

  // Función para formatear tiempo relativo
  const formatRelativeTime = (dateString: string) => {
    try {
      // console.log('formatRelativeTime recibió:', dateString, 'tipo:', typeof dateString)
      
      if (!dateString) {
        return 'Sin fecha'
      }
      
      const now = new Date()
      const date = new Date(dateString)
      
      if (isNaN(date.getTime())) {
        console.warn('Fecha inválida en formatRelativeTime:', dateString)
        return 'Fecha inválida'
      }
      
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffMins < 1) return 'Ahora'
      if (diffMins < 60) return `Hace ${diffMins}m`
      if (diffHours < 24) return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      if (diffDays === 1) return 'Ayer'
      if (diffDays < 7) return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
    } catch (error) {
      console.error('Error en formatRelativeTime:', error, dateString)
      return 'Fecha inválida'
    }
  }

  // Estados disponibles
  const estados = [
    'Nuevo',
    'Seguimiento activo', 
    'NR',
    'Silencioso',
    'Pendiente de pago',
    'Alumna',
    'NOINT',
    'NOCONT'
  ]

  // Agentes disponibles
  const agentes = [
    'Sin asignar',
    'Mariano',
    'Nina',
    'Sofía',
    'Ángel'
  ]

  // Inicializar valores
  useEffect(() => {
    if (contact) {
      setEditedName(contact.nombre)
      setSelectedEstado(contact.estado)
      setSelectedAssignee(contact.assignee_name || 'Sin asignar')
    }
  }, [contact])

  // Auto-save cuando cambian los valores
  useEffect(() => {
    if (!contact || !onUpdateContact) return

    const saveChanges = async () => {
      if (saving) return
      
      setSaving(true)
      setSaveStatus('saving')

      try {
        await onUpdateContact(contact.id, {
          nombre: editedName,
          estado: selectedEstado,
          assignee_name: selectedAssignee === 'Sin asignar' ? undefined : selectedAssignee
        })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (error) {
        console.error('Error guardando cambios:', error)
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } finally {
        setSaving(false)
      }
    }

    // Solo hacer auto-save si hay cambios reales
    const hasChanges = editedName !== contact.nombre || 
                      selectedEstado !== contact.estado || 
                      selectedAssignee !== (contact.assignee_name || 'Sin asignar')

    if (hasChanges) {
      const timer = setTimeout(saveChanges, 1000) // Auto-save después de 1 segundo
      return () => clearTimeout(timer)
    }
  }, [editedName, selectedEstado, selectedAssignee, contact, onUpdateContact, saving])

  // Función para obtener color del estado
  const getStateColor = (estado: string) => {
    switch (estado) {
      case 'Nuevo': return 'bg-green-100 text-green-800 border-green-200'
      case 'Seguimiento activo': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'NR': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Silencioso': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'Pendiente de pago': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Alumna': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'NOINT': return 'bg-red-100 text-red-800 border-red-200'
      case 'NOCONT': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Función para obtener iniciales
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2)
  }



  if (!contact) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-6">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <User size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Selecciona una conversación para ver la información del contacto</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Información del Contacto</h3>
          <button 
            onClick={() => setShowEditModal(true)}
            className="text-gray-400 hover:text-gray-600 crm-button"
            title="Editar contacto"
          >
            <Edit3 size={16} />
          </button>
        </div>

        {/* Avatar grande */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
            {getInitials(contact.nombre)}
          </div>
        </div>

        {/* Nombre editable */}
        <div className="text-center">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-xl font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none text-center"
                autoFocus
              />
              <button
                onClick={() => setIsEditing(false)}
                className="text-green-600 hover:text-green-700"
              >
                <Check size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900">{contact.nombre}</h2>
              <button
                onClick={() => setIsEditing(true)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Edit3 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Información del contacto */}
      <div className="flex-1 p-6 space-y-4">
        {/* Información básica */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Phone size={16} className="text-gray-400" />
            <span className="text-gray-600">{contact.telefono}</span>
          </div>
          
          {contact.email && (
            <div className="flex items-center gap-3 text-sm">
              <Mail size={16} className="text-gray-400" />
              <span className="text-gray-600">{contact.email}</span>
            </div>
          )}
          
          <div className="flex items-center gap-3 text-sm">
            <Calendar size={16} className="text-gray-400" />
            <span className="text-gray-600">Creado: {formatDate(contact.created_at || contact.ts_ultimo_mensaje || contact.updated_at)}</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <Clock size={16} className="text-gray-400" />
            <span className="text-gray-600">Última actividad: {formatRelativeTime(contact.ultima_actividad || contact.ts_ultimo_mensaje || contact.updated_at || contact.created_at)}</span>
          </div>
        </div>

        {/* Campos editables */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {estados.map(estado => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
          </div>

          {/* Asignado a */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Asignado a</label>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {agentes.map(agente => (
                <option key={agente} value={agente}>{agente}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Información adicional */}
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-3 text-sm">
            <MessageCircle size={16} className="text-gray-400" />
            <span className="text-gray-600">Inbox: {contact.inbox_name}</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <Tag size={16} className="text-gray-400" />
            <span className="text-gray-600">Total mensajes: {contact.total_mensajes || '4'}</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <Phone size={16} className="text-gray-400" />
            <span className="text-gray-600">Canal: {contact.canal}</span>
          </div>
        </div>

        {/* Estado de guardado */}
        {saveStatus !== 'idle' && (
          <div className="flex items-center gap-2 text-sm">
            {saveStatus === 'saving' && (
              <>
                <Loader2 size={16} className="animate-spin text-blue-500" />
                <span className="text-blue-600">Guardando...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check size={16} className="text-green-500" />
                <span className="text-green-600">Guardado</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <X size={16} className="text-red-500" />
                <span className="text-red-600">Error al guardar</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal de edición */}
      <ContactEditModal
        contact={contact}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={onUpdateContact || (async () => {})}
      />
    </div>
  )
}
