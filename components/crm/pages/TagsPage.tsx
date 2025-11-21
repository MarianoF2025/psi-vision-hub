'use client';

import { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import { ArrowLeft, RefreshCw, Plus, Search, Edit, Trash2, Tag as TagIcon, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Tag {
  id: string;
  nombre: string;
  color: string;
  descripcion?: string;
  created_at: string;
}

export default function TagsPage({ user }: { user: User | null }) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#3B82F6');
  const [tagDescription, setTagDescription] = useState('');
  const supabase = createClient();

  const colors = [
    { name: 'Azul', value: '#3B82F6' },
    { name: 'Rojo', value: '#EF4444' },
    { name: 'Verde', value: '#10B981' },
    { name: 'Amarillo', value: '#F59E0B' },
    { name: 'Púrpura', value: '#8B5CF6' },
    { name: 'Rosa', value: '#EC4899' },
    { name: 'Gris', value: '#6B7280' },
  ];

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('etiquetas')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        console.warn('Tabla etiquetas no encontrada. Se puede crear más adelante.');
        setTags([]);
      } else {
        setTags(data || []);
      }
    } catch (error) {
      console.error('Error loading tags:', error);
      setTags([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTags();
  };

  const handleSave = async () => {
    try {
      if (editingTag) {
        const { error } = await supabase
          .from('etiquetas')
          .update({
            nombre: tagName,
            color: tagColor,
            descripcion: tagDescription,
          })
          .eq('id', editingTag.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('etiquetas')
          .insert({
            nombre: tagName,
            color: tagColor,
            descripcion: tagDescription,
          });

        if (error) throw error;
      }

      setShowCreateModal(false);
      setEditingTag(null);
      setTagName('');
      setTagColor('#3B82F6');
      setTagDescription('');
      loadTags();
    } catch (error: any) {
      console.error('Error saving tag:', error);
      alert(`Error: ${error.message || 'No se pudo guardar la etiqueta'}`);
    }
  };

  const handleDelete = async (tagId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta etiqueta?')) return;

    try {
      // Eliminar relaciones primero
      await supabase
        .from('contacto_etiquetas')
        .delete()
        .eq('etiqueta_id', tagId);

      const { error } = await supabase
        .from('etiquetas')
        .delete()
        .eq('id', tagId);

      if (error) throw error;
      loadTags();
    } catch (error: any) {
      console.error('Error deleting tag:', error);
      alert(`Error: ${error.message || 'No se pudo eliminar la etiqueta'}`);
    }
  };

  const filteredTags = tags.filter((tag) =>
    tag.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <TagIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Etiquetas</h1>
                  <p className="text-sm text-gray-500">Organiza y categoriza tus conversaciones</p>
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
                  setEditingTag(null);
                  setTagName('');
                  setTagColor('#3B82F6');
                  setTagDescription('');
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Etiqueta</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar etiquetas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
            />
          </div>
        </div>

        {/* Tags Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <TagIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No hay etiquetas</p>
            <p className="text-sm text-gray-400 mt-1">Crea tu primera etiqueta para comenzar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTags.map((tag) => (
              <div
                key={tag.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="font-medium text-gray-900">{tag.nombre}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingTag(tag);
                        setTagName(tag.nombre);
                        setTagColor(tag.color);
                        setTagDescription(tag.descripcion || '');
                        setShowCreateModal(true);
                      }}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id)}
                      className="p-1 rounded hover:bg-primary-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-primary" />
                    </button>
                  </div>
                </div>
                {tag.descripcion && (
                  <p className="text-sm text-gray-600">{tag.descripcion}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-primary/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTag ? 'Editar Etiqueta' : 'Nueva Etiqueta'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTag(null);
                }}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
                  placeholder="Ej: Cliente VIP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setTagColor(color.value)}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        tagColor === color.value
                          ? 'border-gray-900 scale-110'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  value={tagDescription}
                  onChange={(e) => setTagDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
                  rows={3}
                  placeholder="Descripción de la etiqueta..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTag(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!tagName.trim()}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingTag ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

