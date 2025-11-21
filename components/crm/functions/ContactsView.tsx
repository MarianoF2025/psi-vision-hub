'use client';

import { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import { Search, Plus, Edit, Trash2, Phone, Mail, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

interface Contact {
  id: string;
  telefono: string;
  nombre: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export default function ContactsView({ user }: { user: User | null }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contactos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const query = searchQuery.toLowerCase();
    return (
      contact.nombre?.toLowerCase().includes(query) ||
      contact.telefono.includes(query) ||
      contact.email?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex h-full">
      {/* Lista de contactos */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        {/* Header con búsqueda */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar contactos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Nuevo Contacto</span>
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <p className="text-sm text-gray-500">No se encontraron contactos</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                    selectedContact?.id === contact.id ? 'bg-primary/5 border-l-4 border-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-white">
                        {contact.nombre?.charAt(0).toUpperCase() || contact.telefono.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {contact.nombre || 'Sin nombre'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{contact.telefono}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detalles del contacto */}
      <div className="flex-1 p-6">
        {selectedContact ? (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <span className="text-2xl font-medium text-white">
                    {selectedContact.nombre?.charAt(0).toUpperCase() || selectedContact.telefono.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedContact.nombre || 'Sin nombre'}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedContact.telefono}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <Edit className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 rounded-lg hover:bg-primary-50 transition-colors">
                  <Trash2 className="w-5 h-5 text-primary" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Teléfono</span>
                </div>
                <p className="text-sm text-gray-900">{selectedContact.telefono}</p>
              </div>

              {selectedContact.email && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Mail className="w-5 h-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Email</span>
                  </div>
                  <p className="text-sm text-gray-900">{selectedContact.email}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <MessageSquare className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Información</span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>Creado: {format(new Date(selectedContact.created_at), 'dd/MM/yyyy HH:mm')}</p>
                  <p>Actualizado: {format(new Date(selectedContact.updated_at), 'dd/MM/yyyy HH:mm')}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500">Selecciona un contacto para ver sus detalles</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

