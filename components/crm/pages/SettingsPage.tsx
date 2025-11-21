'use client';

import { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import { Save, Bell, User as UserIcon, Shield, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function SettingsPage({ user }: { user: User | null }) {
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

  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('configuraciones_usuario')
        .select('*')
        .eq('usuario_id', user.id)
        .single();

      if (!error && data) {
        if (data.notificaciones) {
          setNotifications(data.notificaciones);
        }
        if (data.preferencias) {
          setPreferences(data.preferencias);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (!user?.id) {
        alert('Usuario no identificado');
        return;
      }

      const { error } = await supabase
        .from('configuraciones_usuario')
        .upsert({
          usuario_id: user.id,
          notificaciones: notifications,
          preferencias: preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      alert('Configuración guardada exitosamente');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert(`Error: ${error.message || 'No se pudo guardar la configuración'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/crm-com"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Volver al CRM</span>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>
                  <p className="text-sm text-gray-500">Personaliza tu experiencia en el CRM</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <input
                  type="text"
                  value={user.role || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                />
              </div>
            </div>
          </div>
        )}
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

