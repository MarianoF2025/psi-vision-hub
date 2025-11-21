'use client';

import { User } from '@/lib/types';
import { CRMFunction } from './InboxSidebar';
import ContactsView from './functions/ContactsView';
import TagsView from './functions/TagsView';
import QuickRepliesView from './functions/QuickRepliesView';
import StatisticsView from './functions/StatisticsView';
import SettingsView from './functions/SettingsView';
import { X } from 'lucide-react';

interface FunctionPanelProps {
  functionId: CRMFunction;
  user: User | null;
  onClose: () => void;
}

export default function FunctionPanel({ functionId, user, onClose }: FunctionPanelProps) {
  const renderFunction = () => {
    switch (functionId) {
      case 'contactos':
        return <ContactsView user={user} />;
      case 'etiquetas':
        return <TagsView user={user} />;
      case 'respuestas':
        return <QuickRepliesView user={user} />;
      case 'estadisticas':
        return <StatisticsView user={user} />;
      case 'ajustes':
        return <SettingsView user={user} />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (functionId) {
      case 'contactos':
        return 'Contactos';
      case 'etiquetas':
        return 'Etiquetas';
      case 'respuestas':
        return 'Respuestas Rápidas';
      case 'estadisticas':
        return 'Estadísticas';
      case 'ajustes':
        return 'Ajustes';
      default:
        return '';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white h-screen" style={{ minHeight: 0 }}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white flex-shrink-0 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{getTitle()}</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 text-gray-600 transition-all duration-150"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ minHeight: 0 }}>
        {renderFunction()}
      </div>
    </div>
  );
}

