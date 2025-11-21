'use client';

import { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import { Search, Plus, Edit, Trash2, MessageSquare, Copy, X, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface QuickReply {
  id: string;
  nombre: string;
  mensaje: string;
  categoria?: string;
  created_at: string;
}

export default function QuickRepliesView({ user }: { user: User | null }) {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [replyName, setReplyName] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [replyCategory, setReplyCategory] = useState('');
  const supabase = createClient();

  const categories = ['Saludo', 'Despedida', 'Información', 'Soporte', 'Ventas', 'Otros'];

  useEffect(() => {
    loadReplies();
  }, []);

  const loadReplies = async () => {
    try {
      setLoading(true);
      // Nota: Asumiendo que existe una tabla 'respuestas_rapidas' en Supabase
      const { data, error } = await supabase
        .from('respuestas_rapidas')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        console.warn('Tabla respuestas_rapidas no encontrada. Se puede crear más adelante.');
        setReplies([]);
      } else {
        setReplies(data || []);
      }
    } catch (error) {
      console.error('Error loading replies:', error);
      setReplies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingReply) {
        const { error } = await supabase
          .from('respuestas_rapidas')
          .update({
            nombre: replyName,
            mensaje: replyMessage,
            categoria: replyCategory || null,
          })
          .eq('id', editingReply.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('respuestas_rapidas')
          .insert({
            nombre: replyName,
            mensaje: replyMessage,
            categoria: replyCategory || null,
          });

        if (error) throw error;
      }

      setShowCreateModal(false);
      setEditingReply(null);
      setReplyName('');
      setReplyMessage('');
      setReplyCategory('');
      loadReplies();
    } catch (error: any) {
      console.error('Error saving reply:', error);
      alert(`Error: ${error.message || 'No se pudo guardar la respuesta'}`);
    }
  };

  const handleDelete = async (replyId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta respuesta rápida?')) return;

    try {
      const { error } = await supabase
        .from('respuestas_rapidas')
        .delete()
        .eq('id', replyId);

      if (error) throw error;
      loadReplies();
    } catch (error: any) {
      console.error('Error deleting reply:', error);
      alert(`Error: ${error.message || 'No se pudo eliminar la respuesta'}`);
    }
  };

  const handleCopy = (message: string) => {
    navigator.clipboard.writeText(message);
    // Podrías agregar una notificación aquí
  };

  const filteredReplies = replies.filter((reply) => {
    const query = searchQuery.toLowerCase();
    return (
      reply.nombre.toLowerCase().includes(query) ||
      reply.mensaje.toLowerCase().includes(query) ||
      reply.categoria?.toLowerCase().includes(query)
    );
  });

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
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Respuestas Rápidas</h1>
                  <p className="text-sm text-gray-500">Crea plantillas de mensajes para usar rápidamente</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEditingReply(null);
                  setReplyName('');
                  setReplyMessage('');
                  setReplyCategory('');
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Respuesta</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Búsqueda */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar respuestas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
            />
          </div>
        </div>

        {/* Lista de respuestas */}
        {loading ? (
          <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredReplies.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No hay respuestas rápidas</p>
            <p className="text-sm text-gray-400 mt-1">Crea tu primera respuesta rápida</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReplies.map((reply) => (
              <div
                key={reply.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{reply.nombre}</h4>
                      {reply.categoria && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                          {reply.categoria}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{reply.mensaje}</p>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <button
                      onClick={() => handleCopy(reply.mensaje)}
                      className="p-2 rounded hover:bg-gray-100 transition-colors"
                      title="Copiar mensaje"
                    >
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingReply(reply);
                        setReplyName(reply.nombre);
                        setReplyMessage(reply.mensaje);
                        setReplyCategory(reply.categoria || '');
                        setShowCreateModal(true);
                      }}
                      className="p-2 rounded hover:bg-gray-100 transition-colors"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(reply.id)}
                      className="p-2 rounded hover:bg-primary-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-primary" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de crear/editar */}
        {showCreateModal && (
        <div className="fixed inset-0 bg-primary/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingReply ? 'Editar Respuesta Rápida' : 'Nueva Respuesta Rápida'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingReply(null);
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
                  value={replyName}
                  onChange={(e) => setReplyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
                  placeholder="Ej: Saludo inicial"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={replyCategory}
                  onChange={(e) => setReplyCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
                >
                  <option value="">Sin categoría</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje
                </label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
                  rows={6}
                  placeholder="Escribe el mensaje de la respuesta rápida..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingReply(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!replyName.trim() || !replyMessage.trim()}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingReply ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

