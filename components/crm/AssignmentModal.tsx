'use client';

import { useState } from 'react';
import { Conversation, InboxType } from '@/lib/types/crm';
import { X, User, Building } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AssignmentModalProps {
  conversation: Conversation | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function AssignmentModal({
  conversation,
  isOpen,
  onClose,
  onUpdate,
}: AssignmentModalProps) {
  const [selectedArea, setSelectedArea] = useState<InboxType | ''>('');
  const [assignedTo, setAssignedTo] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  if (!isOpen || !conversation) return null;

  const handleAssign = async () => {
    if (!conversation) return;

    setLoading(true);
    try {
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (selectedArea) {
        updates.assigned_area = selectedArea;
        updates.inbox = selectedArea; // Por donde entra, sale
      }

      if (assignedTo) {
        updates.assigned_to = assignedTo;
      }

      const { error } = await supabase
        .from('conversaciones')
        .update(updates)
        .eq('id', conversation.id);

      if (error) throw error;

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error assigning conversation:', error);
      alert('Error al asignar conversación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Asignar Conversación</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Área
            </label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value as InboxType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value="">Seleccionar área</option>
              <option value="Ventas">Ventas</option>
              <option value="Alumnos">Alumnos</option>
              <option value="Administración">Administración</option>
              <option value="Comunidad">Comunidad</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asignar a (opcional)
            </label>
            <input
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="ID de usuario o email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAssign}
              disabled={loading || !selectedArea}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {loading ? 'Asignando...' : 'Asignar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

