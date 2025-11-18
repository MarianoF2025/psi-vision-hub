'use client';

import { useState } from 'react';
import { Contact, Conversation } from '@/lib/types/crm';
import { Edit, Phone, Mail, MapPin, Calendar, Clock, Tag, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface ContactInfoProps {
  contact: Contact | undefined;
  conversation: Conversation | null;
}

export default function ContactInfo({ contact, conversation }: ContactInfoProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (!contact && !conversation) {
    return (
      <div className="w-[250px] bg-white border-l border-gray-200 flex items-center justify-center">
        <p className="text-sm text-gray-500 text-center px-4">
          Selecciona una conversación para ver la información del contacto
        </p>
      </div>
    );
  }

  const displayContact = contact || conversation?.contactos;
  if (!displayContact) return null;

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'activa':
        return 'bg-green-100 text-green-700';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-700';
      case 'resuelta':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="w-[250px] bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Información del Contacto</h3>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Edit className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Avatar y nombre */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-2">
            <span className="text-2xl font-medium text-blue-700">
              {(displayContact.nombre || displayContact.telefono || 'C').charAt(0).toUpperCase()}
            </span>
          </div>
          <h4 className="text-base font-semibold text-gray-900">
            {displayContact.nombre || 'Sin nombre'}
          </h4>
          <p className="text-sm text-gray-500">{displayContact.telefono}</p>
        </div>
      </div>

      {/* Información del contacto */}
      <div className="flex-1 p-4 space-y-4">
        {/* Estado y Resultado */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Estado</span>
            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(displayContact.estado)}`}>
              {displayContact.estado || 'Activa'}
            </span>
          </div>
          {conversation && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Resultado</span>
              <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700">
                {conversation.estado === 'resuelta' ? 'Resuelta' : 'Pendiente'}
              </span>
            </div>
          )}
        </div>

        {/* Detalles */}
        <div className="space-y-3">
          {displayContact.email && (
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm text-gray-900 truncate">{displayContact.email}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Teléfono</p>
              <p className="text-sm text-gray-900">{displayContact.telefono}</p>
            </div>
          </div>

          {displayContact.ubicacion && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Ubicación</p>
                <p className="text-sm text-gray-900">{displayContact.ubicacion}</p>
              </div>
            </div>
          )}

          {displayContact.origen && (
            <div className="flex items-start gap-2">
              <Tag className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Origen</p>
                <p className="text-sm text-gray-900">{displayContact.origen}</p>
              </div>
            </div>
          )}

          {displayContact.created_at && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Creado</p>
                <p className="text-sm text-gray-900">
                  {format(new Date(displayContact.created_at), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>
          )}

          {displayContact.last_activity && (
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Última actividad</p>
                <p className="text-sm text-gray-900">
                  {format(new Date(displayContact.last_activity), 'dd/MM/yyyy, HH:mm')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Notas internas */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Notas Internas</span>
          </div>
          <textarea
            defaultValue={displayContact.notas || ''}
            placeholder="Añadir notas sobre el contacto..."
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary resize-none"
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}

