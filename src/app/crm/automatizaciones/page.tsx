'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Settings, BarChart3, BookOpen, Megaphone, RefreshCw } from 'lucide-react';

interface Curso {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  total_leads?: number;
  ctr_promedio?: number;
  leads_este_mes?: number;
}

interface DashboardStats {
  leads_este_mes: number;
  interacciones_este_mes: number;
  ctr_promedio: number;
  cursos_activos: number;
  anuncios_activos: number;
}

export default function AutomatizacionesPage() {
  const router = useRouter();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = '/api/automatizaciones';

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    setError(null);
    try {
      // Cargar stats
      const statsRes = await fetch(`${API_URL}?path=stats/dashboard`);
      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData.data);

      // Cargar cursos con CTR
      const cursosRes = await fetch(`${API_URL}?path=stats/cursos`);
      const cursosData = await cursosRes.json();
      if (cursosData.success) setCursos(cursosData.data);
    } catch (err) {
      setError('Error conectando con el servicio de automatizaciones');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleCurso(id: string) {
    try {
      const res = await fetch(`${API_URL}?path=cursos/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        setCursos(cursos.map(c => c.id === id ? { ...c, activo: data.data.activo } : c));
      }
    } catch (err) {
      console.error('Error toggling curso:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automatizaciones CTWA</h1>
          <p className="text-gray-500">Menús interactivos para leads de Meta Ads</p>
        </div>
        <button
          onClick={() => router.push('/crm/automatizaciones/cursos/nuevo')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Nuevo Curso
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="text-3xl font-bold text-blue-600">{stats.leads_este_mes}</div>
            <div className="text-sm text-gray-500">Leads este mes</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="text-3xl font-bold text-green-600">{stats.ctr_promedio}%</div>
            <div className="text-sm text-gray-500">CTR Promedio</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="text-3xl font-bold text-purple-600">{stats.interacciones_este_mes}</div>
            <div className="text-sm text-gray-500">Interacciones</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="text-3xl font-bold text-orange-600">{stats.cursos_activos}</div>
            <div className="text-sm text-gray-500">Cursos activos</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="text-3xl font-bold text-pink-600">{stats.anuncios_activos}</div>
            <div className="text-sm text-gray-500">Anuncios activos</div>
          </div>
        </div>
      )}

      {/* Cursos List */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Cursos
          </h2>
          <button onClick={cargarDatos} className="text-gray-500 hover:text-gray-700">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {cursos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay cursos configurados. Creá uno nuevo para empezar.
          </div>
        ) : (
          <div className="divide-y">
            {cursos.map(curso => (
              <div key={curso.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold ${curso.activo ? 'bg-blue-500' : 'bg-gray-400'}`}>
                    {curso.codigo}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{curso.nombre}</div>
                    <div className="text-sm text-gray-500">
                      {curso.leads_este_mes || 0} leads este mes • {curso.ctr_promedio || 0}% CTR
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Toggle activo */}
                  <button
                    onClick={() => toggleCurso(curso.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${curso.activo ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${curso.activo ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>

                  {/* Botón configurar */}
                  <button
                    onClick={() => router.push(`/crm/automatizaciones/cursos/${curso.id}`)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Configurar"
                  >
                    <Settings className="w-5 h-5" />
                  </button>

                  {/* Botón stats */}
                  <button
                    onClick={() => router.push(`/crm/automatizaciones/cursos/${curso.id}?tab=stats`)}
                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                    title="Estadísticas"
                  >
                    <BarChart3 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
