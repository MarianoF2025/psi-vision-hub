'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { gruposApi } from './hooks';
import {
  Search, RefreshCw, Send, Users, CheckSquare, Square, Clock,
  AlertTriangle, Check, X, Calendar, Pause, Play, Eye, Plus, Image,
  Pencil, Trash2, ChevronDown, ChevronRight, Repeat, CalendarClock,
  Copy, UserPlus, Filter, Shield, ShieldAlert, ShieldCheck, Activity,
  Zap, Bell, FileText, BarChart3, ArrowUpDown, Upload, Loader2, UserMinus, ExternalLink
} from 'lucide-react';

// ══════════════════════════════════════
// TYPES
// ══════════════════════════════════════

interface GrupoWhatsApp {
  id: string;
  chat_id: string;
  group_jid: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  estado: string;
  puede_enviar: boolean;
  participantes_count: number;
  ts_ultimo_envio?: string;
  created_at: string;
  link_invitacion?: string;
}

interface EnvioProgramado {
  id: string;
  nombre: string;
  mensaje: string;
  media_url?: string;
  grupos_destino: string[];
  grupos_enviados?: string[];
  total_grupos: number;
  enviados: number;
  fallidos: number;
  estado: string;
  distribuir_en_horas: number;
  delay_entre_envios: number;
  inicio_programado: string;
  proximo_envio?: string;
  created_at: string;
}

interface SecuenciaGrupo {
  id: string;
  grupo_id: string;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  mensajes?: MensajeSecuencia[];
}

interface MensajeSecuencia {
  id?: string;
  nombre?: string;
  mensaje: string;
  media_url?: string;
  media_type?: string;
  tipo_programacion: 'unico' | 'recurrente';
  fecha_unica?: string;
  recurrencia_tipo?: 'semanal' | 'mensual';
  recurrencia_dias_semana?: number[];
  recurrencia_dia_mes?: number;
  recurrencia_fecha_fin?: string;
  hora_envio: string;
  activo: boolean;
  total_enviados?: number;
}

interface Inscripcion {
  id: string;
  telefono: string;
  nombre: string;
  email?: string;
  curso_codigo: string;
  curso_nombre: string;
  fecha_inscripcion?: string;
  estado: string;
}

interface CursoOption {
  codigo: string;
  nombre: string;
  cantidad: number;
}

interface HealthStatus {
  evolution: { connected: boolean; state: string };
  circuit: { status: string; consecutiveErrors: number };
  rate: { sentThisHour: number; sentToday: number; batchCount: number };
}

// ══════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════

const CATEGORIAS = [
  { value: 'todos', label: 'Todas' },
  { value: 'curso', label: 'Cursos' },
  { value: 'especializacion', label: 'Especializaciones' },
  { value: 'comunidad', label: 'Comunidad' },
  { value: 'otro', label: 'Otros' },
];

const DIAS_SEMANA = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
];

type TabType = 'grupos' | 'nuevo' | 'secuencias' | 'historial' | 'crear' | 'monitor';

// ══════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════

export default function GruposPage() {
  const [activeTab, setActiveTab] = useState<TabType>('grupos');
  const [grupos, setGrupos] = useState<GrupoWhatsApp[]>([]);
  const [envios, setEnvios] = useState<EnvioProgramado[]>([]);
  const [secuencias, setSecuencias] = useState<SecuenciaGrupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [toast, setToast] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  // ── Tab Grupos ──
  const [busquedaGrupos, setBusquedaGrupos] = useState('');
  const [categoriaGrupos, setCategoriaGrupos] = useState('todos');
  const [grupoEditando, setGrupoEditando] = useState<GrupoWhatsApp | null>(null);
  const [grupoEditForm, setGrupoEditForm] = useState({ nombre: '', descripcion: '', categoria: '' });
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [loadingParticipantes, setLoadingParticipantes] = useState(false);
  const [guardandoGrupo, setGuardandoGrupo] = useState(false);
  const [nuevoParticipante, setNuevoParticipante] = useState('');
  const [removingParticipant, setRemovingParticipant] = useState<string | null>(null);

  // ── Tab Nuevo Envío ──
  const [nuevoEnvio, setNuevoEnvio] = useState({
    nombre: '', mensaje: '', mediaUrl: '',
    gruposSeleccionados: new Set<string>(),
    programarPara: 'ahora' as 'ahora' | 'fecha',
    fechaProgramada: '', horaProgramada: '',
    distribuirEnHoras: 48,
  });
  const [busquedaNuevo, setBusquedaNuevo] = useState('');
  const [categoriaNuevo, setCategoriaNuevo] = useState('todos');
  const [enviandoNuevo, setEnviandoNuevo] = useState(false);

  // ── Tab Secuencias ──
  const [busquedaSecuencias, setBusquedaSecuencias] = useState('');
  const [categoriaSecuencias, setCategoriaSecuencias] = useState('todos');
  const [gruposExpandidos, setGruposExpandidos] = useState<Set<string>>(new Set());
  const [modalSecuencia, setModalSecuencia] = useState<{
    abierto: boolean; grupo: GrupoWhatsApp | null; secuencia: SecuenciaGrupo | null; editando: boolean;
  }>({ abierto: false, grupo: null, secuencia: null, editando: false });
  const [formSecuencia, setFormSecuencia] = useState({ nombre: '', descripcion: '', mensajes: [] as MensajeSecuencia[] });
  const [guardandoSecuencia, setGuardandoSecuencia] = useState(false);

  // ── Modal editar envío ──
  const [editando, setEditando] = useState<EnvioProgramado | null>(null);
  const [editForm, setEditForm] = useState({ nombre: '', mensaje: '' });

  // ── Modal detalle envío ──
  const [detalleEnvio, setDetalleEnvio] = useState<EnvioProgramado | null>(null);
  const [logsEnvio, setLogsEnvio] = useState<any[]>([]);
  const [cargandoLogs, setCargandoLogs] = useState(false);

  // ── Tab Crear Grupo ──
  const [cursos, setCursos] = useState<CursoOption[]>([]);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [cargandoCursos, setCargandoCursos] = useState(false);
  const [cargandoInscripciones, setCargandoInscripciones] = useState(false);
  const [crearGrupoForm, setCrearGrupoForm] = useState({
    nombreGrupo: '', descripcion: '', cursoSeleccionado: '',
    estadoFiltro: 'todos', fechaDesde: '', fechaHasta: '',
    mensajeInvitacion: '¡Hola {nombre}! 👋\n\nDesde *PSI Asociación* te invitamos a unirte al grupo de WhatsApp de *{curso}*.\n\nEn este grupo vas a recibir información importante, novedades y podrás conectar con tus compañeros.\n\n👉 Uníte acá: {link}\n\n¡Te esperamos! 🎓',
    seleccionados: new Set<string>(),
  });
  const [pasoCrear, setPasoCrear] = useState<1 | 2 | 3>(1);
  const [creandoGrupo, setCreandoGrupo] = useState(false);
  const [grupoCreado, setGrupoCreado] = useState<{ jid: string; link: string } | null>(null);

  // ── Tab Monitor ──
  const [alertas, setAlertas] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // ══════════════════════════════════════
  // TOAST
  // ══════════════════════════════════════

  const showToast = useCallback((tipo: 'success' | 'error', texto: string) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ══════════════════════════════════════
  // DATA LOADING
  // ══════════════════════════════════════


  // ── Editar grupo ──
  const abrirEditarGrupo = async (grupo: GrupoWhatsApp) => {
    setGrupoEditando(grupo);
    setGrupoEditForm({ nombre: grupo.nombre, descripcion: grupo.descripcion || '', categoria: grupo.categoria });
    setParticipantes([]);
    setLoadingParticipantes(true);
    try {
      const res = await gruposApi.getParticipantes(grupo.id);
      setParticipantes(res.participants || []);
    } catch (err) {
      console.error('Error cargando participantes:', err);
    }
    setLoadingParticipantes(false);
  };

  const guardarGrupo = async () => {
    if (!grupoEditando) return;
    setGuardandoGrupo(true);
    try {
      await gruposApi.updateGrupo(grupoEditando.id, grupoEditForm);
      showToast('success', 'Grupo actualizado');
      cargarDatos();
      setGrupoEditando(null);
    } catch (err: any) {
      showToast('error', err.message);
    }
    setGuardandoGrupo(false);
  };

  const eliminarGrupo = async () => {
    if (!grupoEditando) return;
    if (!confirm('¿Salir del grupo y eliminarlo? Esta acción no se puede deshacer.')) return;
    try {
      await gruposApi.deleteGrupo(grupoEditando.id);
      showToast('success', 'Grupo eliminado');
      cargarDatos();
      setGrupoEditando(null);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const agregarParticipante = async () => {
    if (!grupoEditando || !nuevoParticipante.trim()) return;
    const phone = nuevoParticipante.replace(/[^0-9]/g, '');
    if (phone.length < 10) { showToast('error', 'Número inválido'); return; }
    try {
      await gruposApi.addParticipantes(grupoEditando.id, [phone]);
      showToast('success', 'Participante agregado');
      setNuevoParticipante('');
      const res = await gruposApi.getParticipantes(grupoEditando.id);
      setParticipantes(res.participants || []);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const removerParticipante = async (phone: string) => {
    if (!grupoEditando) return;
    if (!confirm('¿Remover este participante del grupo?')) return;
    setRemovingParticipant(phone);
    try {
      await gruposApi.removeParticipantes(grupoEditando.id, [phone]);
      showToast('success', 'Participante removido');
      const res = await gruposApi.getParticipantes(grupoEditando.id);
      setParticipantes(res.participants || []);
    } catch (err: any) {
      showToast('error', err.message);
    }
    setRemovingParticipant(null);
  };

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [gruposRes, enviosRes, secuenciasRes, healthRes] = await Promise.all([
        gruposApi.getGrupos().catch(() => ({ grupos: [] })),
        gruposApi.getEnvios().catch(() => ({ envios: [] })),
        gruposApi.getSecuencias().catch(() => ({ secuencias: [] })),
        gruposApi.health().catch(() => null),
      ]);
      setGrupos(gruposRes.grupos || []);
      setEnvios(enviosRes.envios || []);
      setSecuencias(secuenciasRes.secuencias || []);
      if (healthRes) setHealth(healthRes);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);
  const cargarCursos = async () => {
    setCargandoCursos(true);
    const { data } = await supabase.rpc('get_cursos_inscripciones');
    if (data) {
      setCursos(data.map((r: any) => ({ codigo: r.curso_codigo, nombre: r.curso_nombre, cantidad: r.total })).sort((a: CursoOption, b: CursoOption) => a.nombre.localeCompare(b.nombre)));
    }
    setCargandoCursos(false);
  };
  const cargarInscripciones = async () => {
    if (!crearGrupoForm.cursoSeleccionado) return;
    setCargandoInscripciones(true);
    let q = supabase.from('inscripciones_psi')
      .select('id, telefono, nombre, email, curso_codigo, curso_nombre, fecha_inscripcion, estado')
      .eq('curso_codigo', crearGrupoForm.cursoSeleccionado);
    if (crearGrupoForm.estadoFiltro !== 'todos') q = q.eq('estado', crearGrupoForm.estadoFiltro);
    if (crearGrupoForm.fechaDesde) q = q.gte('fecha_inscripcion', crearGrupoForm.fechaDesde);
    if (crearGrupoForm.fechaHasta) q = q.lte('fecha_inscripcion', crearGrupoForm.fechaHasta);
    const allData: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: page } = await q.order('nombre').range(from, from + pageSize - 1);
      if (!page || page.length === 0) break;
      allData.push(...page);
      if (page.length < pageSize) break;
      from += pageSize;
    }
    const data = allData;
    if (data) {
      const uniq = new Map<string, Inscripcion>();
      data.forEach((r: any) => { if (r.telefono && !uniq.has(r.telefono)) uniq.set(r.telefono, r); });
      setInscripciones(Array.from(uniq.values()));
    }
    setCargandoInscripciones(false);
  };

  useEffect(() => { cargarDatos(); }, [cargarDatos]);
  useEffect(() => { if (activeTab === 'crear' && cursos.length === 0) cargarCursos(); }, [activeTab]);
  useEffect(() => {
    if (crearGrupoForm.cursoSeleccionado) {
      cargarInscripciones();
      setCrearGrupoForm(p => ({ ...p, seleccionados: new Set() }));
    }
  }, [crearGrupoForm.cursoSeleccionado, crearGrupoForm.estadoFiltro, crearGrupoForm.fechaDesde, crearGrupoForm.fechaHasta]);

  // Health polling
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const h = await gruposApi.health();
        setHealth(h);
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // ══════════════════════════════════════
  // SYNC
  // ══════════════════════════════════════

  const sincronizarGrupos = async () => {
    setSincronizando(true);
    try {
      const res = await gruposApi.sync();
      showToast('success', `Sincronización: ${res.nuevos} nuevos, ${res.actualizados} actualizados`);
      await cargarDatos();
    } catch (err: any) {
      showToast('error', err.message);
    }
    setSincronizando(false);
  };

  // ══════════════════════════════════════
  // FILTERS
  // ══════════════════════════════════════

  const filtrarGrupos = (busq: string, cat: string) => grupos.filter(g => {
    const matchB = g.nombre?.toLowerCase().includes(busq.toLowerCase());
    const matchC = cat === 'todos' || g.categoria === cat;
    return matchB && matchC;
  });

  const gruposFiltrados = filtrarGrupos(busquedaGrupos, categoriaGrupos);
  const gruposNuevoFiltrados = filtrarGrupos(busquedaNuevo, categoriaNuevo);
  const gruposSecuenciasFiltrados = filtrarGrupos(busquedaSecuencias, categoriaSecuencias);

  // ══════════════════════════════════════
  // ENVÍO MASIVO
  // ══════════════════════════════════════

  const toggleGrupoNuevo = (id: string) => {
    const s = new Set(nuevoEnvio.gruposSeleccionados);
    s.has(id) ? s.delete(id) : s.add(id);
    setNuevoEnvio({ ...nuevoEnvio, gruposSeleccionados: s });
  };

  const seleccionarTodosNuevo = () => {
    const all = nuevoEnvio.gruposSeleccionados.size === gruposNuevoFiltrados.length;
    setNuevoEnvio({
      ...nuevoEnvio,
      gruposSeleccionados: all ? new Set() : new Set(gruposNuevoFiltrados.map(g => g.id))
    });
  };

  const programarEnvio = async () => {
    if (!nuevoEnvio.mensaje.trim()) return showToast('error', 'El mensaje es requerido');
    if (nuevoEnvio.gruposSeleccionados.size === 0) return showToast('error', 'Seleccioná al menos un grupo');
    setEnviandoNuevo(true);
    try {
      let inicio: string | undefined;
      if (nuevoEnvio.programarPara === 'fecha') {
        inicio = new Date(`${nuevoEnvio.fechaProgramada}T${nuevoEnvio.horaProgramada || '09:00'}`).toISOString();
      }
      await gruposApi.programarEnvio({
        nombre: nuevoEnvio.nombre || `Envío ${new Date().toLocaleDateString('es-AR')}`,
        mensaje: nuevoEnvio.mensaje,
        mediaUrl: nuevoEnvio.mediaUrl || undefined,
        gruposIds: Array.from(nuevoEnvio.gruposSeleccionados),
        distribuirEnHoras: nuevoEnvio.distribuirEnHoras,
        inicioProgramado: inicio,
      });
      showToast('success', `Envío programado para ${nuevoEnvio.gruposSeleccionados.size} grupos`);
      setNuevoEnvio({ nombre: '', mensaje: '', mediaUrl: '', gruposSeleccionados: new Set(), programarPara: 'ahora', fechaProgramada: '', horaProgramada: '', distribuirEnHoras: 48 });
      setActiveTab('historial');
      cargarDatos();
    } catch (err: any) {
      showToast('error', err.message);
    }
    setEnviandoNuevo(false);
  };

  const calcularTiempoEstimado = () => {
    const n = nuevoEnvio.gruposSeleccionados.size;
    if (n === 0) return '';
    const min = Math.floor((nuevoEnvio.distribuirEnHoras * 60) / n);
    return min >= 60 ? `≈ 1 msg cada ${Math.floor(min / 60)}h ${min % 60}m` : `≈ 1 msg cada ${min} min`;
  };

  // ══════════════════════════════════════
  // HISTORIAL
  // ══════════════════════════════════════

  const pausarEnvio = async (id: string) => {
    await gruposApi.pausarEnvio(id); showToast('success', 'Envío pausado'); cargarDatos();
  };
  const reanudarEnvio = async (id: string) => {
    await gruposApi.reanudarEnvio(id); showToast('success', 'Envío reanudado'); cargarDatos();
  };
  const eliminarEnvio = async (id: string) => {
    if (!confirm('¿Eliminar este envío?')) return;
    await gruposApi.eliminarEnvio(id); showToast('success', 'Envío eliminado'); cargarDatos();
  };

  const verDetalle = async (envio: EnvioProgramado) => {
    setDetalleEnvio(envio);
    setCargandoLogs(true);
    try {
      const res = await gruposApi.getEnvioLog(envio.id);
      setLogsEnvio(res.logs || []);
    } catch { setLogsEnvio([]); }
    setCargandoLogs(false);
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    const { error } = await supabase.from('envios_programados')
      .update({ nombre: editForm.nombre, mensaje: editForm.mensaje }).eq('id', editando.id);
    if (error) showToast('error', 'Error al guardar');
    else { showToast('success', 'Envío actualizado'); setEditando(null); cargarDatos(); }
  };

  // ══════════════════════════════════════
  // SECUENCIAS
  // ══════════════════════════════════════

  const getSecuenciasGrupo = (grupoId: string) => secuencias.filter(s => s.grupo_id === grupoId);

  const toggleGrupoExpandido = (id: string) => {
    const s = new Set(gruposExpandidos);
    s.has(id) ? s.delete(id) : s.add(id);
    setGruposExpandidos(s);
  };

  const abrirModalSecuencia = (grupo: GrupoWhatsApp, sec?: SecuenciaGrupo) => {
    if (sec) {
      setFormSecuencia({
        nombre: sec.nombre, descripcion: sec.descripcion || '',
        mensajes: sec.mensajes?.map(m => ({ ...m, tipo_programacion: m.tipo_programacion as 'unico' | 'recurrente' })) || [],
      });
      setModalSecuencia({ abierto: true, grupo, secuencia: sec, editando: true });
    } else {
      setFormSecuencia({ nombre: '', descripcion: '', mensajes: [] });
      setModalSecuencia({ abierto: true, grupo, secuencia: null, editando: false });
    }
  };

  const agregarMensajeSecuencia = () => {
    setFormSecuencia({
      ...formSecuencia,
      mensajes: [...formSecuencia.mensajes, { nombre: '', mensaje: '', tipo_programacion: 'unico', hora_envio: '09:00', activo: true, recurrencia_dias_semana: [] }],
    });
  };

  const actualizarMensajeSecuencia = (i: number, campo: string, valor: any) => {
    const m = [...formSecuencia.mensajes];
    (m[i] as any)[campo] = valor;
    setFormSecuencia({ ...formSecuencia, mensajes: m });
  };

  const toggleDiaSemana = (mi: number, dia: number) => {
    const msg = formSecuencia.mensajes[mi];
    const d = msg.recurrencia_dias_semana || [];
    actualizarMensajeSecuencia(mi, 'recurrencia_dias_semana', d.includes(dia) ? d.filter(x => x !== dia) : [...d, dia].sort());
  };

  const calcularProximoEnvio = (msg: MensajeSecuencia): string | null => {
    const ahora = new Date();
    if (msg.tipo_programacion === 'unico' && msg.fecha_unica) {
      const f = new Date(msg.fecha_unica);
      const [h, m] = msg.hora_envio.split(':').map(Number);
      f.setHours(h, m, 0, 0);
      return f > ahora ? f.toISOString() : null;
    }
    if (msg.tipo_programacion === 'recurrente' && msg.recurrencia_dias_semana?.length) {
      const [h, m] = msg.hora_envio.split(':').map(Number);
      for (let i = 0; i < 8; i++) {
        const f = new Date(ahora);
        f.setDate(f.getDate() + i);
        f.setHours(h, m, 0, 0);
        if (msg.recurrencia_dias_semana.includes(f.getDay()) && f > ahora) {
          if (msg.recurrencia_fecha_fin && f > new Date(msg.recurrencia_fecha_fin)) return null;
          return f.toISOString();
        }
      }
    }
    return null;
  };

  const guardarSecuencia = async () => {
    if (!formSecuencia.nombre.trim()) return showToast('error', 'Nombre requerido');
    if (formSecuencia.mensajes.length === 0) return showToast('error', 'Agregá al menos un mensaje');
    for (const msg of formSecuencia.mensajes) {
      if (!msg.mensaje.trim()) return showToast('error', 'Todos los mensajes necesitan contenido');
      if (msg.tipo_programacion === 'unico' && !msg.fecha_unica) return showToast('error', 'Fecha requerida para mensajes únicos');
      if (msg.tipo_programacion === 'recurrente' && (!msg.recurrencia_dias_semana || msg.recurrencia_dias_semana.length === 0))
        return showToast('error', 'Seleccioná al menos un día');
    }
    setGuardandoSecuencia(true);
    try {
      let secId = modalSecuencia.secuencia?.id;
      if (modalSecuencia.editando && secId) {
        await supabase.from('secuencias_grupo').update({ nombre: formSecuencia.nombre, descripcion: formSecuencia.descripcion || null, updated_at: new Date().toISOString() }).eq('id', secId);
        await supabase.from('mensajes_secuencia').delete().eq('secuencia_id', secId);
      } else {
        const { data: ns, error } = await supabase.from('secuencias_grupo').insert({ grupo_id: modalSecuencia.grupo!.id, nombre: formSecuencia.nombre, descripcion: formSecuencia.descripcion || null, activa: true }).select().single();
        if (error) throw error;
        secId = ns.id;
      }
      const msgs = formSecuencia.mensajes.map(msg => ({
        secuencia_id: secId, nombre: msg.nombre || null, mensaje: msg.mensaje,
        media_url: msg.media_url || null, media_type: msg.media_type || null,
        tipo_programacion: msg.tipo_programacion,
        fecha_unica: msg.tipo_programacion === 'unico' ? msg.fecha_unica : null,
        recurrencia_tipo: msg.tipo_programacion === 'recurrente' ? (msg.recurrencia_tipo || 'semanal') : null,
        recurrencia_dias_semana: msg.tipo_programacion === 'recurrente' ? msg.recurrencia_dias_semana : null,
        hora_envio: msg.hora_envio, recurrencia_fecha_fin: msg.recurrencia_fecha_fin || null,
        activo: true, proximo_envio: calcularProximoEnvio(msg),
      }));
      await supabase.from('mensajes_secuencia').insert(msgs);
      showToast('success', modalSecuencia.editando ? 'Secuencia actualizada' : 'Secuencia creada');
      setModalSecuencia({ abierto: false, grupo: null, secuencia: null, editando: false });
      cargarDatos();
    } catch (err: any) {
      showToast('error', err.message);
    }
    setGuardandoSecuencia(false);
  };

  const eliminarSecuencia = async (id: string) => {
    if (!confirm('¿Eliminar esta secuencia?')) return;
    await supabase.from('secuencias_grupo').delete().eq('id', id);
    showToast('success', 'Secuencia eliminada'); cargarDatos();
  };

  const toggleSecuenciaActiva = async (sec: SecuenciaGrupo) => {
    await supabase.from('secuencias_grupo').update({ activa: !sec.activa }).eq('id', sec.id);
    showToast('success', sec.activa ? 'Pausada' : 'Activada'); cargarDatos();
  };

  // ══════════════════════════════════════
  // CREAR GRUPO
  // ══════════════════════════════════════

  const crearGrupoWhatsApp = async () => {
    if (!crearGrupoForm.nombreGrupo.trim()) return showToast('error', 'Nombre requerido');
    setCreandoGrupo(true);
    try {
      const res = await gruposApi.crearGrupo(crearGrupoForm.nombreGrupo, crearGrupoForm.descripcion);
      setGrupoCreado({ jid: res.grupo?.group_jid, link: res.inviteLink });
      setPasoCrear(3);
      showToast('success', 'Grupo creado exitosamente');
      cargarDatos();
    } catch (err: any) {
      showToast('error', err.message);
    }
    setCreandoGrupo(false);
  };

  const enviarInvitaciones = async () => {
    if (!grupoCreado) return;
    const sel = Array.from(crearGrupoForm.seleccionados);
    const dest = inscripciones.filter(i => sel.includes(i.id));
    if (dest.length === 0) return showToast('error', 'Seleccioná destinatarios');
    try {
      await gruposApi.enviarInvitaciones({
        grupoId: grupoCreado.jid,
        inviteLink: grupoCreado.link,
        destinatarios: dest.map(d => ({ telefono: d.telefono, nombre: d.nombre })),
        mensajeTemplate: crearGrupoForm.mensajeInvitacion,
      });
      showToast('success', `Envío de ${dest.length} invitaciones iniciado`);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const resetearCrearGrupo = () => {
    setCrearGrupoForm({ nombreGrupo: '', descripcion: '', cursoSeleccionado: '', estadoFiltro: 'todos', fechaDesde: '', fechaHasta: '', mensajeInvitacion: '¡Hola {nombre}! 👋\n\nDesde *PSI Asociación* te invitamos a unirte al grupo de WhatsApp de *{curso}*.\n\nEn este grupo vas a recibir información importante, novedades y podrás conectar con tus compañeros.\n\n👉 Uníte acá: {link}\n\n¡Te esperamos! 🎓', seleccionados: new Set() });
    setPasoCrear(1); setGrupoCreado(null); setInscripciones([]);
  };

  // ══════════════════════════════════════
  // MONITOR
  // ══════════════════════════════════════

  const cargarMonitor = async () => {
    const [a, l] = await Promise.all([
      gruposApi.getAlertas(20).catch(() => ({ alertas: [] })),
      gruposApi.getLogs(50).catch(() => ({ logs: [] })),
    ]);
    setAlertas(a.alertas || []);
    setLogs(l.logs || []);
  };

  useEffect(() => { if (activeTab === 'monitor') cargarMonitor(); }, [activeTab]);

  // ══════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════

  const catBadge = (cat: string) => {
    const m: Record<string, string> = { curso: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400', especializacion: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400', comunidad: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' };
    return m[cat] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
  };

  const estadoBadge = (e: string) => {
    const m: Record<string, { bg: string; label: string }> = {
      programado: { bg: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400', label: 'Programado' },
      en_curso: { bg: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400', label: 'En curso' },
      completado: { bg: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400', label: 'Completado' },
      pausado: { bg: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400', label: 'Pausado' },
      cancelado: { bg: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400', label: 'Cancelado' },
    };
    const s = m[e] || { bg: 'bg-slate-100 text-slate-600', label: e };
    return <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', s.bg)}>{s.label}</span>;
  };

  const formatDias = (d?: number[]) => d?.length ? d.map(x => DIAS_SEMANA.find(ds => ds.value === x)?.label).join(', ') : '-';

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className={cn("fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right", toast.tipo === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white")}>
          {toast.tipo === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          {toast.texto}
        </div>
      )}

      {/* Modal Editar Envío */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Editar envío</h2>
              <button onClick={() => setEditando(null)} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Nombre</label>
                <input type="text" value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Mensaje</label>
                <textarea value={editForm.mensaje} onChange={e => setEditForm({ ...editForm, mensaje: e.target.value })} rows={4} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm resize-none" />
              </div>
              <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400">⚠️ Los cambios solo afectan mensajes pendientes.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditando(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button onClick={guardarEdicion} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle Envío */}
      {detalleEnvio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{detalleEnvio.nombre || 'Detalle envío'}</h2>
                <div className="flex items-center gap-3 mt-1">
                  {estadoBadge(detalleEnvio.estado)}
                  <span className="text-xs text-slate-500">{detalleEnvio.enviados}/{detalleEnvio.total_grupos} enviados</span>
                  {detalleEnvio.fallidos > 0 && <span className="text-xs text-red-500">{detalleEnvio.fallidos} fallidos</span>}
                </div>
              </div>
              <button onClick={() => setDetalleEnvio(null)} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{detalleEnvio.mensaje}</p>
              </div>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Log de envíos</h3>
              {cargandoLogs ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400" /></div>
              ) : logsEnvio.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Sin registros aún</p>
              ) : (
                <div className="space-y-1">
                  {logsEnvio.map((l, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                      {l.estado === 'enviado' ? <Check size={14} className="text-green-500" /> : <X size={14} className="text-red-500" />}
                      <span className="text-slate-700 dark:text-slate-300 flex-1">{l.grupo_nombre}</span>
                      {l.error && <span className="text-red-400 truncate max-w-[200px]">{l.error}</span>}
                      <span className="text-slate-400">{new Date(l.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Secuencia */}
      {modalSecuencia.abierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{modalSecuencia.editando ? 'Editar' : 'Nueva'} secuencia</h2>
                <p className="text-sm text-slate-500">Grupo: {modalSecuencia.grupo?.nombre}</p>
              </div>
              <button onClick={() => setModalSecuencia({ abierto: false, grupo: null, secuencia: null, editando: false })} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-3">
                <input type="text" value={formSecuencia.nombre} onChange={e => setFormSecuencia({ ...formSecuencia, nombre: e.target.value })} placeholder="Nombre de la secuencia *" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                <input type="text" value={formSecuencia.descripcion} onChange={e => setFormSecuencia({ ...formSecuencia, descripcion: e.target.value })} placeholder="Descripción (opcional)" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Mensajes</h3>
                <button onClick={agregarMensajeSecuencia} className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg flex items-center gap-1"><Plus size={16} />Agregar</button>
              </div>
              {formSecuencia.mensajes.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
                  <CalendarClock size={40} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500 text-sm">Sin mensajes</p>
                  <button onClick={agregarMensajeSecuencia} className="mt-2 text-sm text-indigo-600 hover:underline">+ Agregar mensaje</button>
                </div>
              ) : formSecuencia.mensajes.map((msg, idx) => (
                <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs rounded-full">Mensaje {idx + 1}</span>
                    <button onClick={() => { const m = formSecuencia.mensajes.filter((_, i) => i !== idx); setFormSecuencia({ ...formSecuencia, mensajes: m }); }} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                  </div>
                  <textarea value={msg.mensaje} onChange={e => actualizarMensajeSecuencia(idx, 'mensaje', e.target.value)} placeholder="Mensaje..." rows={3} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm resize-none" />
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={msg.tipo_programacion === 'unico'} onChange={() => actualizarMensajeSecuencia(idx, 'tipo_programacion', 'unico')} className="text-indigo-500" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Fecha única</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={msg.tipo_programacion === 'recurrente'} onChange={() => actualizarMensajeSecuencia(idx, 'tipo_programacion', 'recurrente')} className="text-indigo-500" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Recurrente</span>
                    </label>
                  </div>
                  {msg.tipo_programacion === 'unico' ? (
                    <div className="flex gap-3">
                      <input type="date" value={msg.fecha_unica || ''} onChange={e => actualizarMensajeSecuencia(idx, 'fecha_unica', e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                      <input type="time" value={msg.hora_envio} onChange={e => actualizarMensajeSecuencia(idx, 'hora_envio', e.target.value)} className="w-32 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {DIAS_SEMANA.map(dia => (
                          <button key={dia.value} type="button" onClick={() => toggleDiaSemana(idx, dia.value)} className={cn("px-3 py-1.5 text-sm rounded-lg border", msg.recurrencia_dias_semana?.includes(dia.value) ? "bg-indigo-500 text-white border-indigo-500" : "bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700")}>{dia.label}</button>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <input type="time" value={msg.hora_envio} onChange={e => actualizarMensajeSecuencia(idx, 'hora_envio', e.target.value)} className="w-32 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                        <input type="date" value={msg.recurrencia_fecha_fin || ''} onChange={e => actualizarMensajeSecuencia(idx, 'recurrencia_fecha_fin', e.target.value)} placeholder="Hasta (opcional)" className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setModalSecuencia({ abierto: false, grupo: null, secuencia: null, editando: false })} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button onClick={guardarSecuencia} disabled={guardandoSecuencia} className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2">
                {guardandoSecuencia ? <><Loader2 size={16} className="animate-spin" />Guardando...</> : <><Check size={16} />{modalSecuencia.editando ? 'Guardar' : 'Crear'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ HEADER ══════════════════════ */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">Grupos WhatsApp</h1>
              <p className="text-sm text-slate-500">{grupos.length} grupos · PSI Alumnos</p>
            </div>
            {/* Status indicator */}
            {health && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800">
                <div className={cn("w-2 h-2 rounded-full", health.evolution.connected ? "bg-green-500" : "bg-red-500")} />
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {health.evolution.connected ? 'Conectado' : 'Desconectado'}
                </span>
                {health.circuit.status !== 'closed' && (
                  <span className="text-xs text-amber-500 font-medium ml-1">· Circuit {health.circuit.status}</span>
                )}
                {health.rate.sentToday > 0 && (
                  <span className="text-xs text-slate-400 ml-1">· {health.rate.sentToday} hoy</span>
                )}
              </div>
            )}
          </div>
          <button onClick={sincronizarGrupos} disabled={sincronizando} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-200 disabled:opacity-50">
            <RefreshCw size={16} className={sincronizando ? 'animate-spin' : ''} />
            {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'grupos' as TabType, label: 'Grupos', icon: Users },
            { id: 'nuevo' as TabType, label: 'Nuevo envío', icon: Send },
            { id: 'secuencias' as TabType, label: 'Secuencias', icon: Repeat },
            { id: 'historial' as TabType, label: 'Historial', icon: Clock },
            { id: 'crear' as TabType, label: 'Crear grupo', icon: Plus },
            { id: 'monitor' as TabType, label: 'Monitor', icon: Activity },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn("px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors",
                activeTab === tab.id ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}>
              <tab.icon size={16} />{tab.label}
              {tab.id === 'historial' && envios.filter(e => e.estado === 'en_curso').length > 0 && (
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════ CONTENT ══════════════════════ */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-slate-400" /></div>
        ) : (
          <>
            {/* ════════ TAB GRUPOS ════════ */}
            {activeTab === 'grupos' && (
              <div>
                <div className="flex gap-3 mb-4">
                  <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Buscar grupos..." value={busquedaGrupos} onChange={e => setBusquedaGrupos(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                  </div>
                  <select value={categoriaGrupos} onChange={e => setCategoriaGrupos(e.target.value)} className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                    {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Grupo</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Categoría</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Participantes</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Estado</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Último envío</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {gruposFiltrados.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No hay grupos</td></tr>
                      ) : gruposFiltrados.map(g => (
                        <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => abrirEditarGrupo(g)}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800 dark:text-white">{g.nombre}</p>
                            {g.descripcion && <p className="text-xs text-slate-400 truncate max-w-xs">{g.descripcion}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("px-2 py-0.5 text-xs rounded-full", catBadge(g.categoria))}>{g.categoria}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{g.participantes_count} 👥</td>
                          <td className="px-4 py-3">
                            <div className={cn("w-2 h-2 rounded-full inline-block mr-2", g.puede_enviar ? "bg-green-500" : "bg-red-500")} />
                            <span className="text-sm text-slate-600 dark:text-slate-400">{g.puede_enviar ? 'Activo' : 'Inactivo'}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {g.ts_ultimo_envio ? new Date(g.ts_ultimo_envio).toLocaleDateString('es-AR') : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                              <button onClick={() => abrirEditarGrupo(g)} className="p-1.5 text-slate-400 hover:text-indigo-500 rounded" title="Editar"><Pencil size={15} /></button>
                              {g.link_invitacion && <button onClick={() => { navigator.clipboard.writeText(g.link_invitacion!); showToast('success', 'Link copiado'); }} className="p-1.5 text-slate-400 hover:text-green-500 rounded" title="Copiar link"><Copy size={15} /></button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ════════ TAB NUEVO ENVÍO ════════ */}
            {activeTab === 'nuevo' && (
              <div className="max-w-4xl">
                {/* Anti-ban warning */}
                <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-3 mb-4 flex items-start gap-3">
                  <ShieldCheck size={20} className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">Protección anti-baneo activa</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                      Delay aleatorio {(4)}–{(12)}s entre envíos · Máx {(30)}/hora · Cooldown cada {(10)} mensajes · Horario {(8)}:00–{(22)}:00
                    </p>
                  </div>
                </div>

                {/* Paso 1: Mensaje */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-4">
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">1</span>
                    Mensaje
                  </h2>
                  <div className="space-y-3">
                    <input type="text" value={nuevoEnvio.nombre} onChange={e => setNuevoEnvio({ ...nuevoEnvio, nombre: e.target.value })} placeholder="Nombre del envío (opcional)" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                    <textarea value={nuevoEnvio.mensaje} onChange={e => setNuevoEnvio({ ...nuevoEnvio, mensaje: e.target.value })} placeholder="Escribí el mensaje..." rows={4} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm resize-none" />
                    <input type="text" value={nuevoEnvio.mediaUrl} onChange={e => setNuevoEnvio({ ...nuevoEnvio, mediaUrl: e.target.value })} placeholder="URL de imagen (opcional)" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                  </div>
                </div>

                {/* Paso 2: Grupos */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">2</span>
                      Grupos destino
                      {nuevoEnvio.gruposSeleccionados.size > 0 && <span className="ml-2 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 text-xs rounded-full">{nuevoEnvio.gruposSeleccionados.size}</span>}
                    </h2>
                    <button onClick={seleccionarTodosNuevo} className="text-xs text-indigo-600 hover:underline">
                      {nuevoEnvio.gruposSeleccionados.size === gruposNuevoFiltrados.length ? 'Deseleccionar' : 'Seleccionar todos'}
                    </button>
                  </div>
                  <div className="flex gap-3 mb-3">
                    <div className="relative flex-1">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" placeholder="Buscar..." value={busquedaNuevo} onChange={e => setBusquedaNuevo(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                    </div>
                    <select value={categoriaNuevo} onChange={e => setCategoriaNuevo(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                      {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                    {gruposNuevoFiltrados.length === 0 ? (
                      <p className="p-4 text-center text-slate-400 text-sm">No hay grupos</p>
                    ) : gruposNuevoFiltrados.map(g => (
                      <div key={g.id} onClick={() => toggleGrupoNuevo(g.id)} className={cn("flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0", nuevoEnvio.gruposSeleccionados.has(g.id) ? "bg-indigo-50 dark:bg-indigo-500/10" : "hover:bg-slate-50")}>
                        {nuevoEnvio.gruposSeleccionados.has(g.id) ? <CheckSquare size={18} className="text-indigo-500 flex-shrink-0" /> : <Square size={18} className="text-slate-300 flex-shrink-0" />}
                        <span className="text-sm text-slate-800 dark:text-white flex-1">{g.nombre}</span>
                        <span className="text-xs text-slate-400">{g.participantes_count} 👥</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Paso 3: Programación */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-4">
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">3</span>
                    Programación
                  </h2>
                  <div className="space-y-3">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={nuevoEnvio.programarPara === 'ahora'} onChange={() => setNuevoEnvio({ ...nuevoEnvio, programarPara: 'ahora' })} className="text-indigo-500" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">Enviar ahora</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={nuevoEnvio.programarPara === 'fecha'} onChange={() => setNuevoEnvio({ ...nuevoEnvio, programarPara: 'fecha' })} className="text-indigo-500" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">Programar</span>
                      </label>
                    </div>
                    {nuevoEnvio.programarPara === 'fecha' && (
                      <div className="flex gap-3">
                        <input type="date" value={nuevoEnvio.fechaProgramada} onChange={e => setNuevoEnvio({ ...nuevoEnvio, fechaProgramada: e.target.value })} className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                        <input type="time" value={nuevoEnvio.horaProgramada} onChange={e => setNuevoEnvio({ ...nuevoEnvio, horaProgramada: e.target.value })} className="w-32 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Distribuir en (horas): {nuevoEnvio.distribuirEnHoras}h</label>
                      <input type="range" min={1} max={72} value={nuevoEnvio.distribuirEnHoras} onChange={e => setNuevoEnvio({ ...nuevoEnvio, distribuirEnHoras: parseInt(e.target.value) })} className="w-full" />
                      {nuevoEnvio.gruposSeleccionados.size > 0 && <p className="text-xs text-slate-400 mt-1">{calcularTiempoEstimado()}</p>}
                    </div>
                  </div>
                </div>

                {/* Botón enviar */}
                <button onClick={programarEnvio} disabled={enviandoNuevo || !nuevoEnvio.mensaje.trim() || nuevoEnvio.gruposSeleccionados.size === 0} className="w-full py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {enviandoNuevo ? <><Loader2 size={18} className="animate-spin" />Programando...</> : <><Send size={18} />Programar envío a {nuevoEnvio.gruposSeleccionados.size} grupos</>}
                </button>
              </div>
            )}

            {/* ════════ TAB SECUENCIAS ════════ */}
            {activeTab === 'secuencias' && (
              <div>
                <div className="flex gap-3 mb-4">
                  <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Buscar..." value={busquedaSecuencias} onChange={e => setBusquedaSecuencias(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                  </div>
                  <select value={categoriaSecuencias} onChange={e => setCategoriaSecuencias(e.target.value)} className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                    {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  {gruposSecuenciasFiltrados.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
                      <Users size={40} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-slate-500">No hay grupos</p>
                    </div>
                  ) : gruposSecuenciasFiltrados.map(grupo => {
                    const secs = getSecuenciasGrupo(grupo.id);
                    const exp = gruposExpandidos.has(grupo.id);
                    return (
                      <div key={grupo.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => toggleGrupoExpandido(grupo.id)}>
                          <div className="flex items-center gap-3">
                            {exp ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white"><Users size={16} /></div>
                            <div>
                              <p className="font-medium text-slate-800 dark:text-white">{grupo.nombre}</p>
                              <p className="text-xs text-slate-500">{secs.length === 0 ? 'Sin secuencias' : `${secs.length} secuencia${secs.length > 1 ? 's' : ''}`}</p>
                            </div>
                          </div>
                          <button onClick={e => { e.stopPropagation(); abrirModalSecuencia(grupo); }} className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg flex items-center gap-1"><Plus size={16} />Secuencia</button>
                        </div>
                        {exp && (
                          <div className="border-t border-slate-100 dark:border-slate-800">
                            {secs.length === 0 ? (
                              <div className="px-4 py-6 text-center">
                                <p className="text-sm text-slate-400">Sin secuencias</p>
                                <button onClick={() => abrirModalSecuencia(grupo)} className="mt-2 text-sm text-indigo-600 hover:underline">+ Crear primera</button>
                              </div>
                            ) : secs.map(sec => (
                              <div key={sec.id} className="px-4 py-3 pl-14 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <Repeat size={14} className={sec.activa ? "text-green-500" : "text-slate-400"} />
                                      <span className="font-medium text-slate-800 dark:text-white">{sec.nombre}</span>
                                      {!sec.activa && <span className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">Pausada</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{sec.mensajes?.length || 0} mensaje{(sec.mensajes?.length || 0) !== 1 ? 's' : ''}</p>
                                    {sec.mensajes?.slice(0, 2).map((m, i) => (
                                      <div key={i} className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                        {m.tipo_programacion === 'recurrente' ? <Repeat size={12} className="text-indigo-400" /> : <Calendar size={12} className="text-amber-400" />}
                                        <span className="truncate max-w-xs">{m.mensaje.substring(0, 40)}...</span>
                                        <span className="text-slate-400">{m.tipo_programacion === 'recurrente' ? `${formatDias(m.recurrencia_dias_semana)} ${m.hora_envio}` : m.fecha_unica || ''}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => toggleSecuenciaActiva(sec)} className={cn("p-1.5 rounded hover:bg-slate-100", sec.activa ? "text-amber-500" : "text-green-500")} title={sec.activa ? 'Pausar' : 'Activar'}>{sec.activa ? <Pause size={16} /> : <Play size={16} />}</button>
                                    <button onClick={() => abrirModalSecuencia(grupo, sec)} className="p-1.5 text-slate-400 hover:text-indigo-500 rounded" title="Editar"><Pencil size={16} /></button>
                                    <button onClick={() => eliminarSecuencia(sec.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded" title="Eliminar"><Trash2 size={16} /></button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ════════ TAB HISTORIAL ════════ */}
            {activeTab === 'historial' && (
              <div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Envío</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Grupos</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Progreso</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Estado</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Programado</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {envios.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No hay envíos</td></tr>
                      ) : envios.map(envio => (
                        <tr key={envio.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800 dark:text-white">{envio.nombre || 'Sin nombre'}</p>
                            <p className="text-xs text-slate-500 truncate max-w-xs">{envio.mensaje.substring(0, 50)}...</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{envio.total_grupos}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${envio.total_grupos > 0 ? (envio.enviados / envio.total_grupos) * 100 : 0}%` }} />
                              </div>
                              <span className="text-xs text-slate-500">{envio.enviados}/{envio.total_grupos}</span>
                            </div>
                            {envio.fallidos > 0 && <p className="text-xs text-red-500 mt-0.5">{envio.fallidos} fallidos</p>}
                          </td>
                          <td className="px-4 py-3">{estadoBadge(envio.estado)}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{envio.inicio_programado ? new Date(envio.inicio_programado).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {(envio.estado === 'programado' || envio.estado === 'en_curso') && <button onClick={() => pausarEnvio(envio.id)} className="p-1.5 text-slate-400 hover:text-amber-500 rounded" title="Pausar"><Pause size={16} /></button>}
                              {envio.estado === 'pausado' && <button onClick={() => reanudarEnvio(envio.id)} className="p-1.5 text-slate-400 hover:text-green-500 rounded" title="Reanudar"><Play size={16} /></button>}
                              {envio.estado !== 'completado' && <button onClick={() => { setEditForm({ nombre: envio.nombre || '', mensaje: envio.mensaje }); setEditando(envio); }} className="p-1.5 text-slate-400 hover:text-indigo-500 rounded" title="Editar"><Pencil size={16} /></button>}
                              <button onClick={() => verDetalle(envio)} className="p-1.5 text-slate-400 hover:text-indigo-500 rounded" title="Detalle"><Eye size={16} /></button>
                              <button onClick={() => eliminarEnvio(envio.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded" title="Eliminar"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ════════ TAB CREAR GRUPO ════════ */}
            {activeTab === 'crear' && (
              <div className="max-w-3xl">
                {/* Steps */}
                <div className="flex items-center gap-2 mb-6">
                  {[1, 2, 3].map(s => (
                    <div key={s} className="flex items-center gap-2">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium", pasoCrear >= s ? "bg-indigo-500 text-white" : "bg-slate-200 text-slate-500")}>{s}</div>
                      <span className={cn("text-sm", pasoCrear >= s ? "text-slate-800 dark:text-white" : "text-slate-400")}>{s === 1 ? 'Configurar' : s === 2 ? 'Seleccionar' : 'Invitar'}</span>
                      {s < 3 && <div className={cn("w-12 h-0.5", pasoCrear > s ? "bg-indigo-500" : "bg-slate-200")} />}
                    </div>
                  ))}
                </div>

                {pasoCrear === 1 && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del grupo *</label>
                      <input type="text" value={crearGrupoForm.nombreGrupo} onChange={e => setCrearGrupoForm({ ...crearGrupoForm, nombreGrupo: e.target.value })} placeholder="Ej: AT 2026 - Grupo 1" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                      <textarea value={crearGrupoForm.descripcion} onChange={e => setCrearGrupoForm({ ...crearGrupoForm, descripcion: e.target.value })} rows={2} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm resize-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Curso</label>
                      <select value={crearGrupoForm.cursoSeleccionado} onChange={e => setCrearGrupoForm({ ...crearGrupoForm, cursoSeleccionado: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" disabled={cargandoCursos}>
                        <option value="">Seleccionar curso...</option>
                        {cursos.map(c => <option key={c.codigo} value={c.codigo}>{c.nombre} ({c.cantidad})</option>)}
                      </select>
                    </div>
                    {crearGrupoForm.cursoSeleccionado && (
                      <div className="flex gap-3">
                        <select value={crearGrupoForm.estadoFiltro} onChange={e => setCrearGrupoForm({ ...crearGrupoForm, estadoFiltro: e.target.value })} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                          <option value="todos">Todos los estados</option>
                          <option value="activo">Activo</option>
                          <option value="finalizado">Finalizado</option>
                          <option value="baja">Baja</option>
                        </select>
                        <input type="date" value={crearGrupoForm.fechaDesde} onChange={e => setCrearGrupoForm({ ...crearGrupoForm, fechaDesde: e.target.value })} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" placeholder="Desde" />
                        <input type="date" value={crearGrupoForm.fechaHasta} onChange={e => setCrearGrupoForm({ ...crearGrupoForm, fechaHasta: e.target.value })} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" placeholder="Hasta" />
                      </div>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button onClick={crearGrupoWhatsApp} disabled={creandoGrupo || !crearGrupoForm.nombreGrupo.trim()} className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2">
                        {creandoGrupo ? <><Loader2 size={16} className="animate-spin" />Creando...</> : <><Plus size={16} />Crear grupo</>}
                      </button>
                      {inscripciones.length > 0 && (
                        <button onClick={() => setPasoCrear(2)} className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200">
                          Seleccionar inscriptos ({inscripciones.length}) →
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {pasoCrear === 2 && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-slate-800 dark:text-white">Seleccionar inscriptos ({inscripciones.length})</h3>
                      <button onClick={() => {
                        const all = crearGrupoForm.seleccionados.size === inscripciones.length;
                        setCrearGrupoForm({ ...crearGrupoForm, seleccionados: all ? new Set() : new Set(inscripciones.map(i => i.id)) });
                      }} className="text-xs text-indigo-600 hover:underline">
                        {crearGrupoForm.seleccionados.size === inscripciones.length ? 'Deseleccionar' : 'Seleccionar todos'}
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
                      {inscripciones.map(i => (
                        <div key={i.id} onClick={() => {
                          const s = new Set(crearGrupoForm.seleccionados);
                          s.has(i.id) ? s.delete(i.id) : s.add(i.id);
                          setCrearGrupoForm({ ...crearGrupoForm, seleccionados: s });
                        }} className={cn("flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-slate-100 last:border-0", crearGrupoForm.seleccionados.has(i.id) ? "bg-indigo-50 dark:bg-indigo-500/10" : "hover:bg-slate-50")}>
                          {crearGrupoForm.seleccionados.has(i.id) ? <CheckSquare size={16} className="text-indigo-500" /> : <Square size={16} className="text-slate-300" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-800 dark:text-white truncate">{i.nombre}</p>
                            <p className="text-xs text-slate-400">{i.telefono}</p>
                          </div>
                          <span className={cn("px-2 py-0.5 text-xs rounded-full", i.estado === 'activo' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500')}>{i.estado}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setPasoCrear(1)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">← Volver</button>
                      <button onClick={crearGrupoWhatsApp} disabled={creandoGrupo} className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2">
                        {creandoGrupo ? <><Loader2 size={16} className="animate-spin" />Creando...</> : <><Plus size={16} />Crear grupo e invitar {crearGrupoForm.seleccionados.size}</>}
                      </button>
                    </div>
                  </div>
                )}

                {pasoCrear === 3 && grupoCreado && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><Check size={32} className="text-green-600" /></div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">¡Grupo creado!</h3>
                    <div className="flex items-center justify-center gap-2 mb-6">
                      <code className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm">{grupoCreado.link}</code>
                      <button onClick={() => { navigator.clipboard.writeText(grupoCreado.link); showToast('success', 'Link copiado'); }} className="p-2 text-slate-400 hover:text-indigo-500 rounded"><Copy size={16} /></button>
                    </div>
                    {crearGrupoForm.seleccionados.size > 0 && (
                      <div className="mb-4">
                        <div className="text-left mb-2">
                          <p className="text-xs text-slate-500 mb-1">Variables disponibles: <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{nombre}'}</code> <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{curso}'}</code> <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{link}'}</code></p>
                        </div>
                        <textarea value={crearGrupoForm.mensajeInvitacion} onChange={e => setCrearGrupoForm({ ...crearGrupoForm, mensajeInvitacion: e.target.value })} rows={6} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm resize-none mb-3" />
                        <div className="rounded-2xl overflow-hidden max-w-sm mx-auto mb-3" style={{ background: '#e5ddd5' }}>
                          <div className="bg-teal-700 px-4 py-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">PSI</div>
                            <div>
                              <p className="text-white text-sm font-medium">PSI Asociación</p>
                              <p className="text-teal-200 text-[10px]">Alumnos</p>
                            </div>
                          </div>
                          <div className="p-4 min-h-[120px]">
                            <div className="max-w-[85%] ml-auto">
                              <div className="bg-white rounded-xl rounded-tr-sm shadow-sm overflow-hidden">
                                <div className="px-3 py-2">
                                  <p className="text-[13px] text-slate-800 leading-relaxed whitespace-pre-wrap">{crearGrupoForm.mensajeInvitacion.replace('{nombre}', 'Juan Pérez').replace('{curso}', cursos.find(c => c.codigo === crearGrupoForm.cursoSeleccionado)?.nombre || 'el curso').replace('{link}', grupoCreado?.link || 'https://chat.whatsapp.com/...')}</p>
                                </div>
                                <div className="px-3 pb-1.5 flex justify-end">
                                  <span className="text-[10px] text-slate-400">14:32 ✓✓</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <button onClick={enviarInvitaciones} className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 mx-auto">
                          <UserPlus size={16} />Enviar {crearGrupoForm.seleccionados.size} invitaciones
                        </button>
                      </div>
                    )}
                    <button onClick={resetearCrearGrupo} className="text-sm text-indigo-600 hover:underline mt-4">Crear otro grupo</button>
                  </div>
                )}
              </div>
            )}

            {/* ════════ TAB MONITOR ════════ */}
            {activeTab === 'monitor' && (
              <div className="space-y-4">
                {/* Status cards */}
                {health && (
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {health.evolution.connected ? <ShieldCheck size={20} className="text-green-500" /> : <ShieldAlert size={20} className="text-red-500" />}
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Evolution API</span>
                      </div>
                      <p className={cn("text-lg font-bold", health.evolution.connected ? "text-green-600" : "text-red-600")}>{health.evolution.connected ? 'Conectado' : 'Desconectado'}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield size={20} className={health.circuit.status === 'closed' ? "text-green-500" : "text-amber-500"} />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Circuit Breaker</span>
                      </div>
                      <p className={cn("text-lg font-bold", health.circuit.status === 'closed' ? "text-green-600" : "text-amber-600")}>{health.circuit.status === 'closed' ? 'Cerrado ✓' : health.circuit.status.toUpperCase()}</p>
                      {health.circuit.consecutiveErrors > 0 && <p className="text-xs text-red-500">{health.circuit.consecutiveErrors} errores</p>}
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap size={20} className="text-indigo-500" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Enviados hoy</span>
                      </div>
                      <p className="text-lg font-bold text-slate-800 dark:text-white">{health.rate.sentToday}</p>
                      <p className="text-xs text-slate-500">{health.rate.sentThisHour} esta hora</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 size={20} className="text-indigo-500" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Grupos</span>
                      </div>
                      <p className="text-lg font-bold text-slate-800 dark:text-white">{grupos.length}</p>
                      <p className="text-xs text-slate-500">{envios.filter(e => e.estado === 'en_curso').length} envíos activos</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button onClick={async () => { try { await gruposApi.triggerCron(); showToast('success', 'Cron ejecutado'); } catch (e: any) { showToast('error', e.message); } }} className="px-4 py-2 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 rounded-lg text-sm flex items-center gap-2 hover:bg-indigo-200">
                    <Zap size={16} />Trigger cron
                  </button>
                  <button onClick={async () => { try { await gruposApi.resetCircuit(); showToast('success', 'Circuit breaker reseteado'); const h = await gruposApi.health(); setHealth(h); } catch (e: any) { showToast('error', e.message); } }} className="px-4 py-2 bg-amber-100 dark:bg-amber-500/10 text-amber-600 rounded-lg text-sm flex items-center gap-2 hover:bg-amber-200">
                    <Shield size={16} />Reset circuit
                  </button>
                  <button onClick={cargarMonitor} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-lg text-sm flex items-center gap-2 hover:bg-slate-200">
                    <RefreshCw size={16} />Actualizar
                  </button>
                </div>

                {/* Alertas */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2"><Bell size={16} />Alertas recientes</h3>
                  {alertas.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Sin alertas 🎉</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {alertas.map((a, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm py-1.5">
                          <span className={cn("mt-0.5", a.tipo === 'circuit_breaker' ? "text-red-500" : "text-blue-500")}>{a.tipo === 'circuit_breaker' ? <AlertTriangle size={14} /> : <Activity size={14} />}</span>
                          <div className="flex-1">
                            <p className="text-slate-700 dark:text-slate-300">{a.mensaje}</p>
                            <p className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString('es-AR')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Logs */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2"><FileText size={16} />Últimos envíos</h3>
                  {logs.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Sin registros</p>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {logs.map((l, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                          {l.estado === 'enviado' ? <Check size={14} className="text-green-500" /> : <X size={14} className="text-red-500" />}
                          <span className="text-slate-700 dark:text-slate-300 flex-1">{l.grupo_nombre}</span>
                          <span className="text-slate-400">{l.tipo || 'masivo'}</span>
                          {l.error && <span className="text-red-400 truncate max-w-[150px]">{l.error}</span>}
                          <span className="text-slate-400">{new Date(l.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

        {/* ════════ MODAL EDITAR GRUPO ════════ */}
        {grupoEditando && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setGrupoEditando(null)}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Editar grupo</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{grupoEditando.group_jid}</p>
                </div>
                <button onClick={() => setGrupoEditando(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20} /></button>
              </div>
              <div className="overflow-y-auto max-h-[calc(85vh-140px)] p-6 space-y-5">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Nombre del grupo *</label>
                    <input type="text" value={grupoEditForm.nombre} onChange={e => setGrupoEditForm({...grupoEditForm, nombre: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Descripción</label>
                    <textarea value={grupoEditForm.descripcion} onChange={e => setGrupoEditForm({...grupoEditForm, descripcion: e.target.value})} rows={2} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Categoría</label>
                    <select value={grupoEditForm.categoria} onChange={e => setGrupoEditForm({...grupoEditForm, categoria: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                      <option value="curso">Curso</option>
                      <option value="especializacion">Especialización</option>
                      <option value="comunidad">Comunidad</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  {grupoEditando.link_invitacion && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-500/10 rounded-lg">
                      <ExternalLink size={14} className="text-green-600" />
                      <span className="text-xs text-green-700 dark:text-green-400 truncate flex-1">{grupoEditando.link_invitacion}</span>
                      <button onClick={() => { navigator.clipboard.writeText(grupoEditando.link_invitacion || ''); showToast('success', 'Link copiado'); }} className="text-xs text-green-600 hover:underline font-medium">Copiar</button>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                      <Users size={16} /> Participantes
                      <span className="text-xs font-normal text-slate-400">({participantes.length})</span>
                    </h3>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <input type="text" value={nuevoParticipante} onChange={e => setNuevoParticipante(e.target.value)} placeholder="Número (ej: 5491130643668)" onKeyDown={e => { if (e.key === 'Enter') agregarParticipante(); }} className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
                    <button onClick={agregarParticipante} className="px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600 flex items-center gap-1"><UserPlus size={14} /> Agregar</button>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto">
                    {loadingParticipantes ? (
                      <div className="p-4 text-center"><Loader2 size={20} className="animate-spin mx-auto text-slate-400" /></div>
                    ) : participantes.length === 0 ? (
                      <p className="p-4 text-center text-slate-400 text-sm">Sin participantes</p>
                    ) : participantes.map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-500">
                            {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{p.name || p.phone || 'Desconocido'}</p>
                            {p.phone && p.name && <p className="text-xs text-slate-400">+{p.phone}</p>}
                          </div>
                          {p.admin && <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">{p.admin === 'superadmin' ? 'Admin' : p.admin}</span>}
                        </div>
                        {p.admin !== 'superadmin' && p.phone && (
                          <button onClick={() => removerParticipante(p.phone)} disabled={removingParticipant === p.phone} className="p-1 text-slate-400 hover:text-red-500 rounded disabled:opacity-50" title="Remover">
                            {removingParticipant === p.phone ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <button onClick={eliminarGrupo} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg flex items-center gap-1"><Trash2 size={14} /> Eliminar grupo</button>
                <div className="flex gap-2">
                  <button onClick={() => setGrupoEditando(null)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancelar</button>
                  <button onClick={guardarGrupo} disabled={guardandoGrupo || !grupoEditForm.nombre.trim()} className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-1">
                    {guardandoGrupo ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
