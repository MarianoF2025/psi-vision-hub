// src/components/crm/ContactEditModal.tsx - Modal para editar información del contacto
'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  Save, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Tag,
  MessageCircle,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react'
import type { Conversation } from '@/lib/supabase'

interface ContactEditModalProps {
  contact: Conversation | null
  isOpen: boolean
  onClose: () => void
  onSave: (contactId: string, updates: Partial<Conversation>) => Promise<void>
}

export default function ContactEditModal({ 
  contact, 
  isOpen, 
  onClose, 
  onSave 
}: ContactEditModalProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    ubicacion: '',
    estado: '',
    assignee_name: '',
    curso_interes: '',
    tags: '',
    notas_internas: ''
  })
  
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errors, setErrors] = useState<Record<string, string>>({})

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

  // Cursos disponibles
  const cursos = [
    'Psicología Clínica',
    'Terapia Cognitivo-Conductual',
    'Psicología Organizacional',
    'Neuropsicología',
    'Psicología Social',
    'Otro'
  ]

  // Tags disponibles
  const tagsDisponibles = [
    'Comercial',
    'Comunidad',
    'Administración',
    'VIP',
    'Problema técnico',
    'Seguimiento',
    'Interesado',
    'No interesado'
  ]

  // Inicializar formulario
  useEffect(() => {
    if (contact) {
      setFormData({
        nombre: contact.nombre || '',
        telefono: contact.telefono || '',
        email: contact.email || '',
        ubicacion: '', // Campo nuevo
        estado: contact.estado || '',
        assignee_name: contact.assignee_name || 'Sin asignar',
        curso_interes: '', // Campo nuevo
        tags: contact.subetiqueta || '',
        notas_internas: '' // Campo nuevo
      })
    }
  }, [contact])

  // Validación
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido'
    }
    
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es requerido'
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Guardar cambios
  const handleSave = async () => {
    if (!contact || !validateForm()) return
    
    setSaving(true)
    setSaveStatus('saving')
    
    try {
      await onSave(contact.id, {
        nombre: formData.nombre,
        telefono: formData.telefono,
        email: formData.email,
        estado: formData.estado,
        assignee_name: formData.assignee_name === 'Sin asignar' ? undefined : formData.assignee_name,
        subetiqueta: formData.tags
      })
      
      setSaveStatus('saved')
      setTimeout(() => {
        onClose()
        setSaveStatus('idle')
      }, 1000)
    } catch (error) {
      console.error('Error guardando contacto:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setSaving(false)
    }
  }

  // Manejar cambios en inputs
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (!isOpen || !contact) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {contact.nombre.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2)}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Editar Contacto</h2>
              <p className="text-sm text-gray-500">Modifica la información del contacto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <div className="p-6 space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User size={16} className="inline mr-2" />
                Nombre *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.nombre ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Nombre completo"
              />
              {errors.nombre && (
                <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone size={16} className="inline mr-2" />
                Teléfono *
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => handleInputChange('telefono', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.telefono ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="+54 9 11 1234-5678"
              />
              {errors.telefono && (
                <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail size={16} className="inline mr-2" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="email@ejemplo.com"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin size={16} className="inline mr-2" />
                Ubicación
              </label>
              <input
                type="text"
                value={formData.ubicacion}
                onChange={(e) => handleInputChange('ubicacion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ciudad, País"
              />
            </div>
          </div>

          {/* Estado y asignación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag size={16} className="inline mr-2" />
                Estado
              </label>
              <select
                value={formData.estado}
                onChange={(e) => handleInputChange('estado', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {estados.map(estado => (
                  <option key={estado} value={estado}>{estado}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User size={16} className="inline mr-2" />
                Asignado a
              </label>
              <select
                value={formData.assignee_name}
                onChange={(e) => handleInputChange('assignee_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {agentes.map(agente => (
                  <option key={agente} value={agente}>{agente}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Curso de interés */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-2" />
              Curso de interés
            </label>
            <select
              value={formData.curso_interes}
              onChange={(e) => handleInputChange('curso_interes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar curso</option>
              {cursos.map(curso => (
                <option key={curso} value={curso}>{curso}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag size={16} className="inline mr-2" />
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Comercial, Comunidad, VIP"
            />
            <p className="text-xs text-gray-500 mt-1">
              Separa múltiples tags con comas
            </p>
          </div>

          {/* Notas internas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageCircle size={16} className="inline mr-2" />
              Notas internas
            </label>
            <textarea
              value={formData.notas_internas}
              onChange={(e) => handleInputChange('notas_internas', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Notas adicionales sobre el contacto..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <>
                <Loader2 size={16} className="animate-spin text-blue-500" />
                <span className="text-blue-600 text-sm">Guardando...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check size={16} className="text-green-500" />
                <span className="text-green-600 text-sm">Guardado exitosamente</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle size={16} className="text-red-500" />
                <span className="text-red-600 text-sm">Error al guardar</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed crm-button flex items-center gap-2"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
