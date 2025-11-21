'use client';

import { useState } from 'react';
import { User } from '@/lib/types';
import { Save, Bell, User as UserIcon, Shield, Mail } from 'lucide-react';

export default function SettingsView({ user }: { user: User | null }) {
  const [notifications, setNotifications] = useState({
    newConversation: true,
    newMessage: true,
    assignment: true,
    mentions: false,
  });

  const [preferences, setPreferences] = useState({
    autoAssign: false,
    soundEnabled: true,
    desktopNotifications: true,
    emailDigest: false,
  });

  const handleSave = () => {
    // TODO: Guardar configuración en Supabase
    alert('Configuración guardada (funcionalidad pendiente de implementar)');
  };

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Ajustes del CRM</h3>
          <p className="text-sm text-gray-500 mt-1">Personaliza tu experiencia en el CRM</p>
        </div>

        {/* Notificaciones */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-primary" />
            <h4 className="text-base font-semibold text-gray-900">Notificaciones</h4>
          </div>
          <div className="space-y-4">
            <SettingToggle
              label="Nuevas conversaciones"
              description="Recibe notificaciones cuando se crea una nueva conversación"
              checked={notifications.newConversation}
              onChange={(checked) =>
                setNotifications({ ...notifications, newConversation: checked })
              }
            />
            <SettingToggle
              label="Nuevos mensajes"
              description="Recibe notificaciones cuando llegan nuevos mensajes"
              checked={notifications.newMessage}
              onChange={(checked) =>
                setNotifications({ ...notifications, newMessage: checked })
              }
            />
            <SettingToggle
              label="Asignaciones"
              description="Recibe notificaciones cuando te asignan una conversación"
              checked={notifications.assignment}
              onChange={(checked) =>
                setNotifications({ ...notifications, assignment: checked })
              }
            />
            <SettingToggle
              label="Menciones"
              description="Recibe notificaciones cuando te mencionan en un mensaje"
              checked={notifications.mentions}
              onChange={(checked) =>
                setNotifications({ ...notifications, mentions: checked })
              }
            />
          </div>
        </div>

        {/* Preferencias */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <UserIcon className="w-5 h-5 text-primary" />
            <h4 className="text-base font-semibold text-gray-900">Preferencias</h4>
          </div>
          <div className="space-y-4">
            <SettingToggle
              label="Asignación automática"
              description="Asigna automáticamente nuevas conversaciones a agentes disponibles"
              checked={preferences.autoAssign}
              onChange={(checked) =>
                setPreferences({ ...preferences, autoAssign: checked })
              }
            />
            <SettingToggle
              label="Sonidos"
              description="Reproduce sonidos para notificaciones"
              checked={preferences.soundEnabled}
              onChange={(checked) =>
                setPreferences({ ...preferences, soundEnabled: checked })
              }
            />
            <SettingToggle
              label="Notificaciones de escritorio"
              description="Muestra notificaciones en tu escritorio"
              checked={preferences.desktopNotifications}
              onChange={(checked) =>
                setPreferences({ ...preferences, desktopNotifications: checked })
              }
            />
            <SettingToggle
              label="Resumen por email"
              description="Recibe un resumen diario por email"
              checked={preferences.emailDigest}
              onChange={(checked) =>
                setPreferences({ ...preferences, emailDigest: checked })
              }
            />
          </div>
        </div>

        {/* Información del usuario */}
        {user && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h4 className="text-base font-semibold text-gray-900">Información de la cuenta</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={user.name || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <input
                  type="text"
                  value={user.role || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Botón guardar */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Cambios</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
          checked ? 'bg-primary' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-sm ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}

