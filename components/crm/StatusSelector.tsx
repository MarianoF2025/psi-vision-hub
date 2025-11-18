'use client';

import { ConversationStatus } from '@/lib/types/crm';
import { createClient } from '@/lib/supabase/client';

interface StatusSelectorProps {
  conversationId: string;
  currentStatus: ConversationStatus;
  onUpdate: () => void;
}

const statusOptions: Array<{ value: ConversationStatus; label: string; color: string }> = [
  { value: 'nueva', label: 'Nueva', color: 'bg-blue-100 text-blue-700' },
  { value: 'activa', label: 'Activa', color: 'bg-green-100 text-green-700' },
  { value: 'esperando', label: 'Esperando', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'resuelta', label: 'Resuelta', color: 'bg-gray-100 text-gray-700' },
  { value: 'cerrada', label: 'Cerrada', color: 'bg-gray-200 text-gray-600' },
];

export default function StatusSelector({
  conversationId,
  currentStatus,
  onUpdate,
}: StatusSelectorProps) {
  const supabase = createClient();

  const handleStatusChange = async (newStatus: ConversationStatus) => {
    try {
      const { error } = await supabase
        .from('conversaciones')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar estado');
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {statusOptions.map(({ value, label, color }) => (
        <button
          key={value}
          onClick={() => handleStatusChange(value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            currentStatus === value
              ? `${color} ring-2 ring-offset-2 ring-primary`
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

