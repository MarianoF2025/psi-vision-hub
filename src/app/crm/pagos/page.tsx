'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Search, Plus, Copy, Send, Eye, X,
  CheckCircle, Clock, AlertTriangle, Ban, RefreshCw,
  DollarSign, TrendingUp, AlertCircle, ExternalLink
} from 'lucide-react';

interface Provider {
  id: string;
  nombre: string;
  activo: boolean;
}

interface Contacto {
  id: string;
  telefono: string;
  nombre?: string;
  email?: string;
}

interface PagoEvento {
  id: string;
  pago_id: string;
  evento: string;
  descripcion?: string;
  created_at: string;
}

interface Pago {
  id: string;
  conversacion_id?: string;
  contacto_id?: string;
  provider: string;
  monto: number;
  moneda: string;
  estado: string;
  link_pago?: string;
  descripcion?: string;
  vencimiento?: string;
  pagado_at?: string;
  created_at: string;
  enviado_whatsapp_at?: string;
  recordatorios_enviados?: number;
  contacto?: Contacto;
}

interface KPIs {
  totalPendiente: number;
  cobradoHoy: number;
  cobradoMes: number;
  vencidos: number;
}

const ESTADO_CONFIG: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  pendiente: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pendiente' },
  pagado: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Pagado' },
  vencido: { color: 'bg-red-100 text-red-800', icon: AlertTriangle, label: 'Vencido' },
  cancelado: { color: 'bg-slate-100 text-slate-800', icon: Ban, label: 'Cancelado' },
  reembolsado: { color: 'bg-purple-100 text-purple-800', icon: RefreshCw, label: 'Reembolsado' },
};

const PROVIDER_CONFIG: Record<string, { color: string; label: string }> = {
  mercadopago: { color: 'bg-sky-100 text-sky-800', label: 'MercadoPago' },
  stripe: { color: 'bg-violet-100 text-violet-800', label: 'Stripe' },
  siro: { color: 'bg-emerald-100 text-emerald-800', label: 'SIRO' },
  dlocal: { color: 'bg-orange-100 text-orange-800', label: 'DLocal' },
};

export default function PagosPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIs>({ totalPendiente: 0, cobradoHoy: 0, cobradoMes: 0, vencidos: 0 });

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroProvider, setFiltroProvider] = useState<string>('todos');

  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalDetalle, setModalDetalle] = useState<Pago | null>(null);
  const [pagoEventos, setPagoEventos] = useState<PagoEvento[]>([]);

  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [contactoBusqueda, setContactoBusqueda] = useState('');
  const [contactoSeleccionado, setContactoSeleccionado] = useState<Contacto | null>(null);
  const [contactoManual, setContactoManual] = useState({ nombre: '', telefono: '', email: '' });
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [nuevoDescripcion, setNuevoDescripcion] = useState('');
  const [nuevoMoneda, setNuevoMoneda] = useState('ARS');
  const [nuevoProvider, setNuevoProvider] = useState('');
  const [nuevoDiasVenc, setNuevoDiasVenc] = useState('7');
  const [enviarWhatsapp, setEnviarWhatsapp] = useState(true);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    fetch('/api/pagos/providers')
      .then(r => r.json())
      .then(data => {
        if (data.providers) {
          setProviders(data.providers);
          const activo = data.providers.find((p: Provider) => p.activo);
          if (activo) setNuevoProvider(activo.id);
        }
      })
      .catch(console.error);
  }, []);

  const cargarPagos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado !== 'todos') params.set('estado', filtroEstado);
      if (filtroProvider !== 'todos') params.set('provider', filtroProvider);

      const res = await fetch('/api/pagos/listar?' + params.toString());
      const data = await res.json();

      if (data.success && data.pagos) {
        setPagos(data.pagos);
        calcularKPIs(data.pagos);
      }
    } catch (error) {
      console.error('Error cargando pagos:', error);
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, filtroProvider]);

  useEffect(() => {
    cargarPagos();
  }, [cargarPagos]);

  const calcularKPIs = (listaPagos: Pago[]) => {
    const hoy = new Date().toISOString().split('T')[0];
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const totalPendiente = listaPagos
      .filter(p => p.estado === 'pendiente')
      .reduce((sum, p) => sum + p.monto, 0);

    const cobradoHoy = listaPagos
      .filter(p => p.estado === 'pagado' && p.pagado_at?.startsWith(hoy))
      .reduce((sum, p) => sum + p.monto, 0);

    const cobradoMes = listaPagos
      .filter(p => p.estado === 'pagado' && p.pagado_at && p.pagado_at >= inicioMes)
      .reduce((sum, p) => sum + p.monto, 0);

    const vencidos = listaPagos.filter(p => p.estado === 'vencido').length;

    setKpis({ totalPendiente, cobradoHoy, cobradoMes, vencidos });
  };

  const buscarContactos = async (query: string) => {
    if (query.length < 2) {
      setContactos([]);
      return;
    }
    try {
      const res = await fetch('/api/contactos/buscar?q=' + encodeURIComponent(query));
      const data = await res.json();
      setContactos(data.contactos || []);
    } catch (error) {
      console.error('Error buscando contactos:', error);
    }
  };

  const handleCrearPago = async () => {
    if (!nuevoMonto || !nuevoDescripcion || !nuevoProvider) {
      alert('Completá todos los campos');
      return;
    }

    const contactoFinal = contactoSeleccionado || (contactoManual.nombre && contactoManual.telefono ? contactoManual : null);
    if (!contactoFinal) {
      alert('Seleccioná o ingresá un contacto');
      return;
    }

    setCreando(true);
    try {
      const telefono = 'telefono' in contactoFinal ? contactoFinal.telefono : contactoManual.telefono;
      const nombre = 'nombre' in contactoFinal ? contactoFinal.nombre : contactoManual.nombre;
      const email = 'email' in contactoFinal ? contactoFinal.email : contactoManual.email;

      const res = await fetch('/api/pagos/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono,
          nombre,
          email,
          monto: parseFloat(nuevoMonto),
          moneda: nuevoMoneda,
          descripcion: nuevoDescripcion,
          provider: nuevoProvider,
          dias_vencimiento: parseInt(nuevoDiasVenc),
          enviar_whatsapp: enviarWhatsapp,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setModalNuevo(false);
        resetForm();
        cargarPagos();
        const msg = enviarWhatsapp && data.mensaje_enviado ? 'Pago creado y enviado por WhatsApp' : 'Pago creado correctamente';
        alert(msg);
      } else {
        alert(data.error || 'Error creando pago');
      }
    } catch (error) {
      console.error('Error creando pago:', error);
      alert('Error creando pago');
    } finally {
      setCreando(false);
    }
  };

  const resetForm = () => {
    setContactoSeleccionado(null);
    setContactoBusqueda('');
    setContactoManual({ nombre: '', telefono: '', email: '' });
    setNuevoMonto('');
    setNuevoDescripcion('');
    setNuevoMoneda('ARS');
    setNuevoDiasVenc('7');
    setEnviarWhatsapp(true);
  };

  const copiarLink = (link: string) => {
    navigator.clipboard.writeText(link);
    alert('Link copiado');
  };

  const reenviarWhatsapp = async (pago: Pago) => {
    try {
      const res = await fetch('/api/pagos/reenviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pago_id: pago.id }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Recordatorio enviado');
        cargarPagos();
      } else {
        alert(data.error || 'Error enviando');
      }
    } catch (error) {
      alert('Error enviando recordatorio');
    }
  };

  const verDetalle = async (pago: Pago) => {
    setModalDetalle(pago);
    try {
      const url = '/api/pagos/' + pago.id + '/eventos';
      const res = await fetch(url);
      const data = await res.json();
      setPagoEventos(data.eventos || []);
    } catch (error) {
      setPagoEventos([]);
    }
  };

  const pagosFiltrados = pagos.filter(p => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    const descMatch = p.descripcion?.toLowerCase().includes(q) || false;
    const nombreMatch = p.contacto?.nombre?.toLowerCase().includes(q) || false;
    const telMatch = p.contacto?.telefono?.includes(q) || false;
    return descMatch || nombreMatch || telMatch;
  });

  const formatMonto = (monto: number, moneda: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 0,
    }).format(monto);
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  const formatFechaHora = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isVencimientoProximo = (vencimiento?: string) => {
    if (!vencimiento) return false;
    const dias = Math.ceil((new Date(vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return dias <= 2 && dias >= 0;
  };

  const providersActivos = providers.filter(p => p.activo);
  const hayProvidersActivos = providersActivos.length > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <CreditCard className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Pagos</h1>
            <p className="text-sm text-gray-500">
              {providersActivos.length} de {providers.length} pasarelas activas
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalNuevo(true)}
          disabled={!hayProvidersActivos}
          className={'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ' +
            (hayProvidersActivos
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed')}
        >
          <Plus className="w-5 h-5" />
          Nuevo Pago
        </button>
      </div>

      {!hayProvidersActivos && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">No hay pasarelas configuradas</p>
            <p className="text-sm text-amber-700">
              Configurá las credenciales en el archivo .env del microservicio de pagos.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pendiente</p>
              <p className="text-xl font-bold text-gray-900">{formatMonto(kpis.totalPendiente, 'ARS')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cobrado Hoy</p>
              <p className="text-xl font-bold text-gray-900">{formatMonto(kpis.cobradoHoy, 'ARS')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cobrado Mes</p>
              <p className="text-xl font-bold text-gray-900">{formatMonto(kpis.cobradoMes, 'ARS')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Vencidos</p>
              <p className="text-xl font-bold text-gray-900">{kpis.vencidos}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por contacto o descripción..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
            <option value="vencido">Vencido</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <select
            value={filtroProvider}
            onChange={(e) => setFiltroProvider(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="todos">Todas las pasarelas</option>
            {providers.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          <button
            onClick={cargarPagos}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando pagos...</div>
        ) : pagosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {pagos.length === 0 ? 'No hay pagos registrados' : 'No se encontraron pagos con los filtros aplicados'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pasarela</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Vence</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pagosFiltrados.map((pago) => {
                const estadoConf = ESTADO_CONFIG[pago.estado] || ESTADO_CONFIG.pendiente;
                const providerConf = PROVIDER_CONFIG[pago.provider] || { color: 'bg-gray-100 text-gray-800', label: pago.provider };
                const IconEstado = estadoConf.icon;

                return (
                  <tr key={pago.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{pago.contacto?.nombre || 'Sin nombre'}</p>
                      <p className="text-sm text-gray-500">{pago.contacto?.telefono || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 truncate max-w-[200px]">{pago.descripcion}</p>
                      <p className="text-xs text-gray-400">{formatFecha(pago.created_at)}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-semibold text-gray-900">{formatMonto(pago.monto, pago.moneda)}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={'inline-flex px-2 py-1 text-xs font-medium rounded-full ' + providerConf.color}>
                        {providerConf.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ' + estadoConf.color}>
                        <IconEstado className="w-3 h-3" />
                        {estadoConf.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {pago.vencimiento ? (
                        <span className={'text-sm ' + (isVencimientoProximo(pago.vencimiento) ? 'text-red-600 font-medium' : 'text-gray-600')}>
                          {formatFecha(pago.vencimiento)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {pago.link_pago && (
                          <>
                            <button
                              onClick={() => copiarLink(pago.link_pago!)}
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                              title="Copiar link"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            
                              <a href={pago.link_pago}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                              title="Abrir link"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </>
                        )}
                        {pago.estado === 'pendiente' && (
                          <button
                            onClick={() => reenviarWhatsapp(pago)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                            title="Reenviar por WhatsApp"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => verDetalle(pago)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalNuevo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nuevo Pago</h2>
              <button onClick={() => { setModalNuevo(false); resetForm(); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
                {contactoSeleccionado ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div>
                      <p className="font-medium">{contactoSeleccionado.nombre || 'Sin nombre'}</p>
                      <p className="text-sm text-gray-600">{contactoSeleccionado.telefono}</p>
                    </div>
                    <button onClick={() => setContactoSeleccionado(null)} className="text-gray-500 hover:text-gray-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={contactoBusqueda}
                      onChange={(e) => {
                        setContactoBusqueda(e.target.value);
                        buscarContactos(e.target.value);
                      }}
                      placeholder="Buscar contacto existente..."
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                    {contactos.length > 0 && (
                      <div className="border rounded-lg max-h-32 overflow-y-auto">
                        {contactos.map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setContactoSeleccionado(c);
                              setContactoBusqueda('');
                              setContactos([]);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-0"
                          >
                            <p className="font-medium">{c.nombre || 'Sin nombre'}</p>
                            <p className="text-sm text-gray-500">{c.telefono}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500 mb-2">O ingresá un contacto nuevo:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={contactoManual.nombre}
                          onChange={(e) => setContactoManual({ ...contactoManual, nombre: e.target.value })}
                          placeholder="Nombre"
                          className="px-3 py-2 border rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          value={contactoManual.telefono}
                          onChange={(e) => setContactoManual({ ...contactoManual, telefono: e.target.value })}
                          placeholder="+54911..."
                          className="px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input
                  type="text"
                  value={nuevoDescripcion}
                  onChange={(e) => setNuevoDescripcion(e.target.value)}
                  placeholder="Ej: Inscripción Curso AT - Marzo 2026"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                  <input
                    type="number"
                    value={nuevoMonto}
                    onChange={(e) => setNuevoMonto(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                  <select
                    value={nuevoMoneda}
                    onChange={(e) => setNuevoMoneda(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ARS">ARS (Pesos)</option>
                    <option value="USD">USD (Dólares)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pasarela</label>
                  <select
                    value={nuevoProvider}
                    onChange={(e) => setNuevoProvider(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Seleccionar...</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.id} disabled={!p.activo}>
                        {p.nombre} {!p.activo && '(no configurado)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vence en</label>
                  <select
                    value={nuevoDiasVenc}
                    onChange={(e) => setNuevoDiasVenc(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="3">3 días</option>
                    <option value="7">7 días</option>
                    <option value="15">15 días</option>
                    <option value="30">30 días</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enviarWhatsapp}
                  onChange={(e) => setEnviarWhatsapp(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">Enviar link por WhatsApp al crear</span>
              </label>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => { setModalNuevo(false); resetForm(); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearPago}
                disabled={creando}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {creando ? 'Creando...' : 'Crear Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalDetalle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Detalle del Pago</h2>
              <button onClick={() => setModalDetalle(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Monto</p>
                  <p className="text-xl font-bold">{formatMonto(modalDetalle.monto, modalDetalle.moneda)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Estado</p>
                  <span className={'inline-flex items-center gap-1 px-2 py-1 text-sm font-medium rounded-full ' + (ESTADO_CONFIG[modalDetalle.estado]?.color || '')}>
                    {ESTADO_CONFIG[modalDetalle.estado]?.label || modalDetalle.estado}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Descripción</p>
                  <p className="text-gray-900">{modalDetalle.descripcion}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Contacto</p>
                  <p className="text-gray-900">{modalDetalle.contacto?.nombre || '-'}</p>
                  <p className="text-sm text-gray-600">{modalDetalle.contacto?.telefono}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Pasarela</p>
                    <p className="text-gray-900">{PROVIDER_CONFIG[modalDetalle.provider]?.label || modalDetalle.provider}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Creado</p>
                    <p className="text-gray-900">{formatFechaHora(modalDetalle.created_at)}</p>
                  </div>
                </div>
                {modalDetalle.vencimiento && (
                  <div>
                    <p className="text-xs text-gray-500">Vencimiento</p>
                    <p className="text-gray-900">{formatFecha(modalDetalle.vencimiento)}</p>
                  </div>
                )}
                {modalDetalle.pagado_at && (
                  <div>
                    <p className="text-xs text-gray-500">Pagado</p>
                    <p className="text-green-600 font-medium">{formatFechaHora(modalDetalle.pagado_at)}</p>
                  </div>
                )}
              </div>

              {modalDetalle.link_pago && (
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500 mb-2">Link de pago</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={modalDetalle.link_pago}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-50 border rounded-lg text-sm"
                    />
                    <button
                      onClick={() => copiarLink(modalDetalle.link_pago!)}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    
                      <a href={modalDetalle.link_pago}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {pagoEventos.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500 mb-3">Historial</p>
                  <div className="space-y-3">
                    {pagoEventos.map((evento, i) => (
                      <div key={evento.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                          {i < pagoEventos.length - 1 && <div className="w-0.5 flex-1 bg-gray-200" />}
                        </div>
                        <div className="pb-3">
                          <p className="text-sm font-medium text-gray-900 capitalize">{evento.evento}</p>
                          {evento.descripcion && <p className="text-xs text-gray-500">{evento.descripcion}</p>}
                          <p className="text-xs text-gray-400">{formatFechaHora(evento.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              {modalDetalle.estado === 'pendiente' && (
                <button
                  onClick={() => {
                    reenviarWhatsapp(modalDetalle);
                    setModalDetalle(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Reenviar WhatsApp
                </button>
              )}
              <button
                onClick={() => setModalDetalle(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
