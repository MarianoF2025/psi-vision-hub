'use client';

import { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import { ArrowLeft, RefreshCw, Plus, Search, MoreVertical, Phone, Mail, Tag as TagIcon, Users, CheckCircle, PlusCircle, Filter, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Contact {
  id: string;
  telefono: string;
  nombre: string | null;
  email: string | null;
  estado?: string;
  tipo?: string;
  etiquetas?: string[];
  created_at: string;
  updated_at: string;
}

interface ContactStats {
  total: number;
  activos: number;
  nuevos: number;
  filtrosAplicados: number;
}

export default function ContactsPage({ user }: { user: User | null }) {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [tags, setTags] = useState<Array<{ id: string; nombre: string; color: string }>>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    estado: 'activo',
    tipo: '',
    etiquetas: [] as string[],
  });
  const supabase = createClient();

  useEffect(() => {
    loadContacts();
    loadTags();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contactos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Cargar etiquetas de cada contacto si existe la relación
      const contactsWithTags = await Promise.all(
        (data || []).map(async (contact) => {
          try {
            const { data: contactTags } = await supabase
              .from('contacto_etiquetas')
              .select('etiqueta_id, etiquetas(nombre, color)')
              .eq('contacto_id', contact.id);
            
            return {
              ...contact,
              etiquetas: contactTags?.map((ct: any) => ct.etiquetas?.nombre).filter(Boolean) || [],
            };
          } catch {
            return { ...contact, etiquetas: [] };
          }
        })
      );
      
      setContacts(contactsWithTags);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTags = async () => {
    try {
      const { data, error } = await supabase
        .from('etiquetas')
        .select('id, nombre, color')
        .order('nombre', { ascending: true });

      if (!error && data) {
        setTags(data);
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadContacts();
    loadTags();
  };

  const handleSave = async () => {
    try {
      if (editingContact) {
        // Actualizar contacto
        const { data, error } = await supabase
          .from('contactos')
          .update({
            nombre: formData.nombre || null,
            telefono: formData.telefono,
            email: formData.email || null,
            estado: formData.estado,
            tipo: formData.tipo || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingContact.id)
          .select()
          .single();

        if (error) throw error;

        // Actualizar etiquetas
        if (data) {
          // Eliminar etiquetas existentes
          await supabase
            .from('contacto_etiquetas')
            .delete()
            .eq('contacto_id', data.id);

          // Agregar nuevas etiquetas
          if (formData.etiquetas.length > 0) {
            const etiquetasToInsert = formData.etiquetas.map(etiquetaId => ({
              contacto_id: data.id,
              etiqueta_id: etiquetaId,
            }));

            await supabase
              .from('contacto_etiquetas')
              .insert(etiquetasToInsert);
          }
        }
      } else {
        // Crear nuevo contacto
        const { data, error } = await supabase
          .from('contactos')
          .insert({
            nombre: formData.nombre || null,
            telefono: formData.telefono,
            email: formData.email || null,
            estado: formData.estado,
            tipo: formData.tipo || null,
          })
          .select()
          .single();

        if (error) throw error;

        // Agregar etiquetas
        if (data && formData.etiquetas.length > 0) {
          const etiquetasToInsert = formData.etiquetas.map(etiquetaId => ({
            contacto_id: data.id,
            etiqueta_id: etiquetaId,
          }));

          await supabase
            .from('contacto_etiquetas')
            .insert(etiquetasToInsert);
        }
      }

      setShowCreateModal(false);
      setEditingContact(null);
      setFormData({
        nombre: '',
        telefono: '',
        email: '',
        estado: 'activo',
        tipo: '',
        etiquetas: [],
      });
      loadContacts();
    } catch (error: any) {
      console.error('Error saving contact:', error);
      alert(`Error: ${error.message || 'No se pudo guardar el contacto'}`);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm('¿Estás seguro de eliminar este contacto?')) return;

    try {
      // Eliminar etiquetas primero
      await supabase
        .from('contacto_etiquetas')
        .delete()
        .eq('contacto_id', contactId);

      // Eliminar contacto
      const { error } = await supabase
        .from('contactos')
        .delete()
        .eq('id', contactId);

      if (error) throw error;
      loadContacts();
    } catch (error: any) {
      console.error('Error deleting contact:', error);
      alert(`Error: ${error.message || 'No se pudo eliminar el contacto'}`);
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      nombre: contact.nombre || '',
      telefono: contact.telefono,
      email: contact.email || '',
      estado: contact.estado || 'activo',
      tipo: contact.tipo || '',
      etiquetas: [], // Se cargará después
    });
    setShowCreateModal(true);
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.telefono.includes(searchQuery) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'all' || contact.tipo === filterType;
    const matchesStatus = filterStatus === 'all' || contact.estado === filterStatus;
    
    // Filtrar por etiqueta
    let matchesTag = filterTag === 'all';
    if (filterTag !== 'all' && contact.etiquetas) {
      matchesTag = contact.etiquetas.includes(filterTag);
    }

    return matchesSearch && matchesType && matchesStatus && matchesTag;
  });

  const stats: ContactStats = {
    total: contacts.length,
    activos: contacts.filter(c => c.estado === 'activo').length,
    nuevos: contacts.filter(c => {
      const created = new Date(c.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return created >= weekAgo;
    }).length,
    filtrosAplicados: (filterType !== 'all' ? 1 : 0) + 
                      (filterStatus !== 'all' ? 1 : 0) + 
                      (filterTag !== 'all' ? 1 : 0),
  };

  const getContactTypes = () => {
    const types = new Set(contacts.map(c => c.tipo).filter(Boolean));
    return Array.from(types);
  };

  const getContactStatuses = () => {
    const statuses = new Set(contacts.map(c => c.estado).filter(Boolean));
    return Array.from(statuses);
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
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
                  <p className="text-sm text-gray-500">Gestiona tu base de contactos y clientes</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>
              <button
                onClick={() => {
                  setEditingContact(null);
                  setFormData({
                    nombre: '',
                    telefono: '',
                    email: '',
                    estado: 'activo',
                    tipo: '',
                    etiquetas: [],
                  });
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Contacto</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Users}
            value={stats.total}
            label="Total"
            subtitle="contactos"
            color="blue"
          />
          <StatCard
            icon={CheckCircle}
            value={stats.activos}
            label="Activos"
            subtitle="contactos"
            color="green"
          />
          <StatCard
            icon={PlusCircle}
            value={stats.nuevos}
            label="Nuevos"
            subtitle="contactos"
            color="purple"
          />
          <StatCard
            icon={Filter}
            value={stats.filtrosAplicados}
            label="Filtros"
            subtitle="aplicados"
            color="yellow"
          />
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar contactos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
            >
              <option value="all">Todos los tipos</option>
              {getContactTypes().map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
            >
              <option value="all">Todos los estados</option>
              {getContactStatuses().map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
            >
              <option value="all">Todas las etiquetas</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.nombre}>{tag.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Etiquetas
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-gray-500">No se encontraron contactos</p>
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {(contact.nombre || contact.telefono).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {contact.nombre || 'Sin nombre'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{contact.telefono}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          {contact.email ? (
                            <>
                              <Mail className="w-4 h-4" />
                              <span>{contact.email}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {contact.etiquetas && contact.etiquetas.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {contact.etiquetas.map((tagName, idx) => {
                              const tag = tags.find(t => t.nombre === tagName);
                              return (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                                  style={{
                                    backgroundColor: tag?.color ? `${tag.color}20` : '#E5E7EB',
                                    color: tag?.color || '#6B7280',
                                  }}
                                >
                                  <TagIcon className="w-3 h-3" />
                                  {tagName}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 flex items-center gap-1">
                            <TagIcon className="w-4 h-4" />
                            Sin etiquetas
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(contact)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Editar"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <ContactModal
          contact={editingContact}
          formData={formData}
          setFormData={setFormData}
          tags={tags}
          onSave={handleSave}
          onClose={() => {
            setShowCreateModal(false);
            setEditingContact(null);
            setFormData({
              nombre: '',
              telefono: '',
              email: '',
              estado: 'activo',
              tipo: '',
              etiquetas: [],
            });
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  subtitle,
  color,
}: {
  icon: any;
  value: number;
  label: string;
  subtitle: string;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-12 h-12 rounded-full ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">
        {label} <span className="text-gray-400">{subtitle}</span>
      </div>
    </div>
  );
}

function ContactModal({
  contact,
  formData,
  setFormData,
  tags,
  onSave,
  onClose,
}: {
  contact: Contact | null;
  formData: any;
  setFormData: (data: any) => void;
  tags: Array<{ id: string; nombre: string; color: string }>;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-primary/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {contact ? 'Editar Contacto' : 'Nuevo Contacto'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
              placeholder="Nombre del contacto"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono *
            </label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
              placeholder="+54 9 11 1234-5678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
              placeholder="email@ejemplo.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <input
                type="text"
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
                placeholder="Cliente, Proveedor, etc."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Etiquetas
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => {
                    const isSelected = formData.etiquetas.includes(tag.id);
                    setFormData({
                      ...formData,
                      etiquetas: isSelected
                        ? formData.etiquetas.filter((id: string) => id !== tag.id)
                        : [...formData.etiquetas, tag.id],
                    });
                  }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    formData.etiquetas.includes(tag.id)
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{
                    backgroundColor: formData.etiquetas.includes(tag.id) ? tag.color : undefined,
                  }}
                >
                  {tag.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={!formData.telefono.trim()}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {contact ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

