'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  Search, RefreshCw, Send, Users,
  CheckSquare, Square, Radio, Clock, AlertTriangle, Check,
  X, Calendar, Pause, Play, Eye, RotateCcw, Plus, Image,
  Pencil, Trash2, ChevronDown, ChevronRight, Repeat, CalendarClock,
  Link as LinkIcon, Copy, UserPlus, Filter, Mail, FlaskConical
} from 'lucide-react';

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
  nombre?: string;
  mensaje: string;
  total_grupos: number;
  enviados: number;
  fallidos: number;
  estado: string;
  inicio_programado?: string;
  proximo_envio?: string;
  created_at: string;
}

interface SecuenciaGrupo {
  id: string;
  grupo_id: string;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  created_at: string;
  mensajes?: MensajeSecuencia[];
}

interface MensajeSecuencia {
  id?: string;
  secuencia_id?: string;
  nombre?: string;
  mensaje: string;
  media_url?: string;
  media_type?: string;
  tipo_programacion: 'unico' | 'recurrente';
  fecha_unica?: string;
  recurrencia_tipo?: 'semanal' | 'mensual';
  recurrencia_dias_semana?: number[];
  recurrencia_dia_mes?: number;
  hora_envio: string;
  recurrencia_fecha_fin?: string;
  activo: boolean;
  ultimo_envio?: string;
  proximo_envio?: string;
  total_enviados?: number;
}

interface Inscripcion {
  id: string;
  telefono: string;
  nombre: string;
  email?: string;
  curso_codigo: string;
  curso_nombre: string;
  fecha_inscripcion: string;
  estado: string;
}

interface CursoOption {
  codigo: string;
  nombre: string;
  cantidad: number;
}

interface LogSimulacion {
  timestamp: string;
  tipo: 'info' | 'success' | 'error';
  mensaje: string;
}

const CATEGORIAS = [
  { value: 'todos', label: 'Todas las categorías' },
  { value: 'curso', label: 'Cursos' },
  { value: 'especializacion', label: 'Especializaciones' },
  { value: 'comunidad', label: 'Comunidad' },
  { value: 'otro', label: 'Otros' },
];

const DIAS_SEMANA = [
  { value: 0, label: 'Dom', labelFull: 'Domingo' },
  { value: 1, label: 'Lun', labelFull: 'Lunes' },
  { value: 2, label: 'Mar', labelFull: 'Martes' },
  { value: 3, label: 'Mié', labelFull: 'Miércoles' },
  { value: 4, label: 'Jue', labelFull: 'Jueves' },
  { value: 5, label: 'Vie', labelFull: 'Viernes' },
  { value: 6, label: 'Sáb', labelFull: 'Sábado' },
];

const ESTADOS_INSCRIPCION = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'activo', label: 'Activo' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'baja', label: 'Baja' },
];

type TabType = 'grupos' | 'nuevo' | 'secuencias' | 'historial' | 'crear';

export default function GruposPage() {
  const [activeTab, setActiveTab] = useState<TabType>('grupos');
  const [grupos, setGrupos] = useState<GrupoWhatsApp[]>([]);
  const [envios, setEnvios] = useState<EnvioProgramado[]>([]);
  const [secuencias, setSecuencias] = useState<SecuenciaGrupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  // Tab Grupos
  const [busquedaGrupos, setBusquedaGrupos] = useState('');
  const [categoriaGrupos, setCategoriaGrupos] = useState('todos');

  // Tab Nuevo Envío
  const [nuevoEnvio, setNuevoEnvio] = useState({
    nombre: '',
    mensaje: '',
    mediaUrl: '',
    gruposSeleccionados: new Set<string>(),
    programarPara: 'ahora' as 'ahora' | 'fecha',
    fechaProgramada: '',
    horaProgramada: '',
    distribuirEnHoras: 48,
  });
  const [busquedaNuevo, setBusquedaNuevo] = useState('');
  const [categoriaNuevo, setCategoriaNuevo] = useState('todos');
  const [enviandoNuevo, setEnviandoNuevo] = useState(false);

  // Tab Secuencias
  const [busquedaSecuencias, setBusquedaSecuencias] = useState('');
  const [categoriaSecuencias, setCategoriaSecuencias] = useState('todos');
  const [gruposExpandidos, setGruposExpandidos] = useState<Set<string>>(new Set());
  const [modalSecuencia, setModalSecuencia] = useState<{
    abierto: boolean;
    grupo: GrupoWhatsApp | null;
    secuencia: SecuenciaGrupo | null;
    editando: boolean;
  }>({ abierto: false, grupo: null, secuencia: null, editando: false });
  const [formSecuencia, setFormSecuencia] = useState({
    nombre: '',
    descripcion: '',
    mensajes: [] as MensajeSecuencia[],
  });
  const [guardandoSecuencia, setGuardandoSecuencia] = useState(false);

  // Modal editar envío
  const [editando, setEditando] = useState<EnvioProgramado | null>(null);
  const [editForm, setEditForm] = useState({ nombre: '', mensaje: '' });

  // Tab Crear Grupo
  const [cursos, setCursos] = useState<CursoOption[]>([]);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [cargandoCursos, setCargandoCursos] = useState(false);
  const [cargandoInscripciones, setCargandoInscripciones] = useState(false);
  const [crearGrupoForm, setCrearGrupoForm] = useState({
    nombreGrupo: '',
    descripcion: '',
    cursoSeleccionado: '',
    estadoFiltro: 'todos',
    fechaDesde: '',
    fechaHasta: '',
    mensajeInvitacion: '¡Hola {nombre}! 👋\n\nTe invitamos a unirte al grupo de WhatsApp del curso.\n\n👉 {link}\n\n¡Te esperamos!',
    seleccionados: new Set<string>(),
  });
  const [pasoCrear, setPasoCrear] = useState<1 | 2 | 3>(1);
  const [creandoGrupo, setCreandoGrupo] = useState(false);
  const [grupoCreado, setGrupoCreado] = useState<{ jid: string; link: string } | null>(null);
  const [enviandoInvitaciones, setEnviandoInvitaciones] = useState(false);
  const [progresoInvitaciones, setProgresoInvitaciones] = useState({ enviados: 0, total: 0, errores: 0 });
  
  // Simulación
  const [modoSimulacion, setModoSimulacion] = useState(true);
  const [logsSimulacion, setLogsSimulacion] = useState<LogSimulacion[]>([]);

  const agregarLog = (tipo: 'info' | 'success' | 'error', mensaje: string) => {
    setLogsSimulacion(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      tipo,
      mensaje
    }]);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (activeTab === 'crear' && cursos.length === 0) {
      cargarCursos();
    }
  }, [activeTab]);

  useEffect(() => {
    if (mensaje) {
      const timer = setTimeout(() => setMensaje(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [mensaje]);

  const cargarDatos = async () => {
    setLoading(true);

    const { data: gruposData } = await supabase
      .from('grupos_whatsapp')
      .select('*')
      .eq('estado', 'activo')
      .order('nombre', { ascending: true });

    if (gruposData) setGrupos(gruposData);

    const { data: enviosData } = await supabase
      .from('envios_programados')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (enviosData) setEnvios(enviosData);

    const { data: secuenciasData } = await supabase
      .from('secuencias_grupo')
      .select(`
        *,
        mensajes:mensajes_secuencia(*)
      `)
      .order('created_at', { ascending: false });

    if (secuenciasData) setSecuencias(secuenciasData);

    setLoading(false);
  };

  const cargarCursos = async () => {
    setCargandoCursos(true);
    
    const { data, error } = await supabase
      .from('inscripciones_psi')
      .select('curso_codigo, curso_nombre')
      .not('curso_codigo', 'is', null);

    if (data && !error) {
      const cursosMap = new Map<string, { nombre: string; cantidad: number }>();
      
      data.forEach((row: any) => {
        if (row.curso_codigo && !/^\d+$/.test(row.curso_codigo)) {
          const existing = cursosMap.get(row.curso_codigo);
          if (existing) {
            existing.cantidad++;
          } else {
            cursosMap.set(row.curso_codigo, {
              nombre: row.curso_nombre || row.curso_codigo,
              cantidad: 1,
            });
          }
        }
      });

      const cursosArray: CursoOption[] = Array.from(cursosMap.entries())
        .map(([codigo, { nombre, cantidad }]) => ({ codigo, nombre, cantidad }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

      setCursos(cursosArray);
    }
    
    setCargandoCursos(false);
  };

  const cargarInscripciones = async () => {
    if (!crearGrupoForm.cursoSeleccionado) return;
    
    setCargandoInscripciones(true);
    
    let query = supabase
      .from('inscripciones_psi')
      .select('id, telefono, nombre, email, curso_codigo, curso_nombre, fecha_inscripcion, estado')
      .eq('curso_codigo', crearGrupoForm.cursoSeleccionado);

    if (crearGrupoForm.estadoFiltro !== 'todos') {
      query = query.eq('estado', crearGrupoForm.estadoFiltro);
    }

    if (crearGrupoForm.fechaDesde) {
      query = query.gte('fecha_inscripcion', crearGrupoForm.fechaDesde);
    }

    if (crearGrupoForm.fechaHasta) {
      query = query.lte('fecha_inscripcion', crearGrupoForm.fechaHasta);
    }

    const { data, error } = await query.order('nombre', { ascending: true });

    if (data && !error) {
      const telefonosUnicos = new Map<string, Inscripcion>();
      data.forEach((row: any) => {
        if (row.telefono && !telefonosUnicos.has(row.telefono)) {
          telefonosUnicos.set(row.telefono, row);
        }
      });
      setInscripciones(Array.from(telefonosUnicos.values()));
    }
    
    setCargandoInscripciones(false);
  };

  useEffect(() => {
    if (crearGrupoForm.cursoSeleccionado) {
      cargarInscripciones();
      setCrearGrupoForm(prev => ({ ...prev, seleccionados: new Set() }));
    }
  }, [crearGrupoForm.cursoSeleccionado, crearGrupoForm.estadoFiltro, crearGrupoForm.fechaDesde, crearGrupoForm.fechaHasta]);

  const sincronizarGrupos = async () => {
    setSincronizando(true);
    try {
      const response = await fetch('https://webhookn8n.psivisionhub.com/webhook/grupos/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'manual' }),
      });

      if (response.ok) {
        setMensaje({ tipo: 'success', texto: 'Sincronización completada' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        await cargarDatos();
      } else {
        throw new Error('Error en sincronización');
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: 'error', texto: 'Error al sincronizar grupos' });
    }
    setSincronizando(false);
  };

  // ==================== FILTROS ====================

  const gruposFiltrados = grupos.filter(g => {
    const matchBusqueda = g.nombre?.toLowerCase().includes(busquedaGrupos.toLowerCase());
    const matchCategoria = categoriaGrupos === 'todos' || g.categoria === categoriaGrupos;
    return matchBusqueda && matchCategoria;
  });

  const gruposNuevoFiltrados = grupos.filter(g => {
    const matchBusqueda = g.nombre?.toLowerCase().includes(busquedaNuevo.toLowerCase());
    const matchCategoria = categoriaNuevo === 'todos' || g.categoria === categoriaNuevo;
    return matchBusqueda && matchCategoria;
  });

  const gruposSecuenciasFiltrados = grupos.filter(g => {
    const matchBusqueda = g.nombre?.toLowerCase().includes(busquedaSecuencias.toLowerCase());
    const matchCategoria = categoriaSecuencias === 'todos' || g.categoria === categoriaSecuencias;
    return matchBusqueda && matchCategoria;
  });

  // ==================== TAB NUEVO ENVÍO ====================

  const toggleGrupoNuevo = (id: string) => {
    const nuevaSeleccion = new Set(nuevoEnvio.gruposSeleccionados);
    if (nuevaSeleccion.has(id)) {
      nuevaSeleccion.delete(id);
    } else {
      nuevaSeleccion.add(id);
    }
    setNuevoEnvio({ ...nuevoEnvio, gruposSeleccionados: nuevaSeleccion });
  };

  const seleccionarTodosNuevo = () => {
    if (nuevoEnvio.gruposSeleccionados.size === gruposNuevoFiltrados.length) {
      setNuevoEnvio({ ...nuevoEnvio, gruposSeleccionados: new Set() });
    } else {
      setNuevoEnvio({
        ...nuevoEnvio,
        gruposSeleccionados: new Set(gruposNuevoFiltrados.map(g => g.id))
      });
    }
  };

  const calcularTiempoEstimado = () => {
    const cantGrupos = nuevoEnvio.gruposSeleccionados.size;
    const horas = nuevoEnvio.distribuirEnHoras;
    if (cantGrupos === 0) return '';
    const minutosEntreEnvios = Math.floor((horas * 60) / cantGrupos);
    if (minutosEntreEnvios >= 60) {
      const hrs = Math.floor(minutosEntreEnvios / 60);
      const mins = minutosEntreEnvios % 60;
      return `≈ 1 mensaje cada ${hrs}h ${mins}m`;
    }
    return `≈ 1 mensaje cada ${minutosEntreEnvios} minutos`;
  };

  const programarEnvio = async () => {
    if (!nuevoEnvio.mensaje.trim()) {
      setMensaje({ tipo: 'error', texto: 'El mensaje es requerido' });
      return;
    }
    if (nuevoEnvio.gruposSeleccionados.size === 0) {
      setMensaje({ tipo: 'error', texto: 'Seleccioná al menos un grupo' });
      return;
    }

    setEnviandoNuevo(true);

    try {
      const gruposArray = Array.from(nuevoEnvio.gruposSeleccionados);
      const delayCalculado = Math.floor((nuevoEnvio.distribuirEnHoras * 3600) / gruposArray.length);

      let inicioProgramado: string;
      if (nuevoEnvio.programarPara === 'ahora') {
        inicioProgramado = new Date().toISOString();
      } else {
        const fechaHora = new Date(`${nuevoEnvio.fechaProgramada}T${nuevoEnvio.horaProgramada || '09:00'}`);
        inicioProgramado = fechaHora.toISOString();
      }

      const { error } = await supabase
        .from('envios_programados')
        .insert({
          nombre: nuevoEnvio.nombre || `Envío ${new Date().toLocaleDateString('es-AR')}`,
          mensaje: nuevoEnvio.mensaje,
          media_url: nuevoEnvio.mediaUrl || null,
          grupos_destino: gruposArray,
          total_grupos: gruposArray.length,
          enviados: 0,
          fallidos: 0,
          estado: 'programado',
          distribuir_en_horas: nuevoEnvio.distribuirEnHoras,
          delay_entre_envios: delayCalculado,
          inicio_programado: inicioProgramado,
          proximo_envio: inicioProgramado,
        });

      if (error) throw error;

      setMensaje({ tipo: 'success', texto: `Envío programado para ${gruposArray.length} grupos` });

      setNuevoEnvio({
        nombre: '',
        mensaje: '',
        mediaUrl: '',
        gruposSeleccionados: new Set(),
        programarPara: 'ahora',
        fechaProgramada: '',
        horaProgramada: '',
        distribuirEnHoras: 48,
      });

      setActiveTab('historial');
      cargarDatos();
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: 'error', texto: 'Error al programar el envío' });
    }

    setEnviandoNuevo(false);
  };

  // ==================== TAB HISTORIAL ====================

  const pausarEnvio = async (envioId: string) => {
    await supabase
      .from('envios_programados')
      .update({ estado: 'pausado' })
      .eq('id', envioId);
    cargarDatos();
    setMensaje({ tipo: 'success', texto: 'Envío pausado' });
  };

  const reanudarEnvio = async (envioId: string) => {
    await supabase
      .from('envios_programados')
      .update({ estado: 'en_curso', proximo_envio: new Date().toISOString() })
      .eq('id', envioId);
    cargarDatos();
    setMensaje({ tipo: 'success', texto: 'Envío reanudado' });
  };

  const abrirEditar = (envio: EnvioProgramado) => {
    setEditForm({
      nombre: envio.nombre || '',
      mensaje: envio.mensaje,
    });
    setEditando(envio);
  };

  const guardarEdicion = async () => {
    if (!editando) return;

    const { error } = await supabase
      .from('envios_programados')
      .update({
        nombre: editForm.nombre,
        mensaje: editForm.mensaje,
      })
      .eq('id', editando.id);

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error al guardar cambios' });
    } else {
      setMensaje({ tipo: 'success', texto: 'Envío actualizado' });
      setEditando(null);
      cargarDatos();
    }
  };

  const eliminarEnvio = async (envioId: string) => {
    if (!confirm('¿Eliminar este envío? Esta acción no se puede deshacer.')) return;

    const { error } = await supabase
      .from('envios_programados')
      .delete()
      .eq('id', envioId);

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error al eliminar' });
    } else {
      setMensaje({ tipo: 'success', texto: 'Envío eliminado' });
      cargarDatos();
    }
  };

  // ==================== TAB SECUENCIAS ====================

  const toggleGrupoExpandido = (grupoId: string) => {
    const nuevos = new Set(gruposExpandidos);
    if (nuevos.has(grupoId)) {
      nuevos.delete(grupoId);
    } else {
      nuevos.add(grupoId);
    }
    setGruposExpandidos(nuevos);
  };

  const getSecuenciasGrupo = (grupoId: string) => {
    return secuencias.filter(s => s.grupo_id === grupoId);
  };

  const abrirModalSecuencia = (grupo: GrupoWhatsApp, secuencia?: SecuenciaGrupo) => {
    if (secuencia) {
      setFormSecuencia({
        nombre: secuencia.nombre,
        descripcion: secuencia.descripcion || '',
        mensajes: secuencia.mensajes?.map(m => ({
          ...m,
          tipo_programacion: m.tipo_programacion as 'unico' | 'recurrente',
          recurrencia_tipo: m.recurrencia_tipo as 'semanal' | 'mensual' | undefined,
        })) || [],
      });
      setModalSecuencia({ abierto: true, grupo, secuencia, editando: true });
    } else {
      setFormSecuencia({
        nombre: '',
        descripcion: '',
        mensajes: [],
      });
      setModalSecuencia({ abierto: true, grupo, secuencia: null, editando: false });
    }
  };

  const cerrarModalSecuencia = () => {
    setModalSecuencia({ abierto: false, grupo: null, secuencia: null, editando: false });
    setFormSecuencia({ nombre: '', descripcion: '', mensajes: [] });
  };

  const agregarMensajeSecuencia = () => {
    setFormSecuencia({
      ...formSecuencia,
      mensajes: [
        ...formSecuencia.mensajes,
        {
          nombre: '',
          mensaje: '',
          tipo_programacion: 'unico',
          hora_envio: '09:00',
          activo: true,
          recurrencia_dias_semana: [],
        }
      ]
    });
  };

  const actualizarMensajeSecuencia = (index: number, campo: string, valor: any) => {
    const nuevosMensajes = [...formSecuencia.mensajes];
    (nuevosMensajes[index] as any)[campo] = valor;
    setFormSecuencia({ ...formSecuencia, mensajes: nuevosMensajes });
  };

  const eliminarMensajeSecuencia = (index: number) => {
    const nuevosMensajes = formSecuencia.mensajes.filter((_, i) => i !== index);
    setFormSecuencia({ ...formSecuencia, mensajes: nuevosMensajes });
  };

  const toggleDiaSemana = (msgIndex: number, dia: number) => {
    const mensaje = formSecuencia.mensajes[msgIndex];
    const dias = mensaje.recurrencia_dias_semana || [];
    const nuevosDias = dias.includes(dia)
      ? dias.filter(d => d !== dia)
      : [...dias, dia].sort((a, b) => a - b);
    actualizarMensajeSecuencia(msgIndex, 'recurrencia_dias_semana', nuevosDias);
  };

  const calcularProximoEnvio = (msg: MensajeSecuencia): string | null => {
    const ahora = new Date();

    if (msg.tipo_programacion === 'unico' && msg.fecha_unica) {
      const fecha = new Date(msg.fecha_unica);
      const [horas, minutos] = msg.hora_envio.split(':').map(Number);
      fecha.setHours(horas, minutos, 0, 0);
      return fecha > ahora ? fecha.toISOString() : null;
    }

    if (msg.tipo_programacion === 'recurrente' && msg.recurrencia_tipo === 'semanal' && msg.recurrencia_dias_semana?.length) {
      const [horas, minutos] = msg.hora_envio.split(':').map(Number);

      for (let i = 0; i < 8; i++) {
        const fecha = new Date(ahora);
        fecha.setDate(fecha.getDate() + i);
        fecha.setHours(horas, minutos, 0, 0);

        if (msg.recurrencia_dias_semana.includes(fecha.getDay()) && fecha > ahora) {
          if (msg.recurrencia_fecha_fin) {
            const fin = new Date(msg.recurrencia_fecha_fin);
            if (fecha > fin) return null;
          }
          return fecha.toISOString();
        }
      }
    }

    return null;
  };

  const guardarSecuencia = async () => {
    if (!formSecuencia.nombre.trim()) {
      setMensaje({ tipo: 'error', texto: 'El nombre de la secuencia es requerido' });
      return;
    }
    if (formSecuencia.mensajes.length === 0) {
      setMensaje({ tipo: 'error', texto: 'Agregá al menos un mensaje' });
      return;
    }
    for (const msg of formSecuencia.mensajes) {
      if (!msg.mensaje.trim()) {
        setMensaje({ tipo: 'error', texto: 'Todos los mensajes deben tener contenido' });
        return;
      }
      if (msg.tipo_programacion === 'unico' && !msg.fecha_unica) {
        setMensaje({ tipo: 'error', texto: 'Los mensajes únicos necesitan una fecha' });
        return;
      }
      if (msg.tipo_programacion === 'recurrente' && (!msg.recurrencia_dias_semana || msg.recurrencia_dias_semana.length === 0)) {
        setMensaje({ tipo: 'error', texto: 'Los mensajes recurrentes necesitan al menos un día' });
        return;
      }
    }

    setGuardandoSecuencia(true);

    try {
      let secuenciaId = modalSecuencia.secuencia?.id;

      if (modalSecuencia.editando && secuenciaId) {
        const { error: errorSecuencia } = await supabase
          .from('secuencias_grupo')
          .update({
            nombre: formSecuencia.nombre,
            descripcion: formSecuencia.descripcion || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', secuenciaId);

        if (errorSecuencia) throw errorSecuencia;

        await supabase
          .from('mensajes_secuencia')
          .delete()
          .eq('secuencia_id', secuenciaId);
      } else {
        const { data: nuevaSecuencia, error: errorSecuencia } = await supabase
          .from('secuencias_grupo')
          .insert({
            grupo_id: modalSecuencia.grupo!.id,
            nombre: formSecuencia.nombre,
            descripcion: formSecuencia.descripcion || null,
            activa: true,
          })
          .select()
          .single();

        if (errorSecuencia) throw errorSecuencia;
        secuenciaId = nuevaSecuencia.id;
      }

      const mensajesParaInsertar = formSecuencia.mensajes.map(msg => ({
        secuencia_id: secuenciaId,
        nombre: msg.nombre || null,
        mensaje: msg.mensaje,
        media_url: msg.media_url || null,
        media_type: msg.media_type || null,
        tipo_programacion: msg.tipo_programacion,
        fecha_unica: msg.tipo_programacion === 'unico' ? msg.fecha_unica : null,
        recurrencia_tipo: msg.tipo_programacion === 'recurrente' ? (msg.recurrencia_tipo || 'semanal') : null,
        recurrencia_dias_semana: msg.tipo_programacion === 'recurrente' ? msg.recurrencia_dias_semana : null,
        hora_envio: msg.hora_envio,
        recurrencia_fecha_fin: msg.recurrencia_fecha_fin || null,
        activo: true,
        proximo_envio: calcularProximoEnvio(msg),
      }));

      const { error: errorMensajes } = await supabase
        .from('mensajes_secuencia')
        .insert(mensajesParaInsertar);

      if (errorMensajes) throw errorMensajes;

      setMensaje({ tipo: 'success', texto: modalSecuencia.editando ? 'Secuencia actualizada' : 'Secuencia creada' });
      cerrarModalSecuencia();
      cargarDatos();
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: 'error', texto: 'Error al guardar la secuencia' });
    }

    setGuardandoSecuencia(false);
  };

  const eliminarSecuencia = async (secuenciaId: string) => {
    if (!confirm('¿Eliminar esta secuencia y todos sus mensajes? Esta acción no se puede deshacer.')) return;

    const { error } = await supabase
      .from('secuencias_grupo')
      .delete()
      .eq('id', secuenciaId);

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error al eliminar' });
    } else {
      setMensaje({ tipo: 'success', texto: 'Secuencia eliminada' });
      cargarDatos();
    }
  };

  const toggleSecuenciaActiva = async (secuencia: SecuenciaGrupo) => {
    const { error } = await supabase
      .from('secuencias_grupo')
      .update({ activa: !secuencia.activa })
      .eq('id', secuencia.id);

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error al actualizar' });
    } else {
      setMensaje({ tipo: 'success', texto: secuencia.activa ? 'Secuencia pausada' : 'Secuencia activada' });
      cargarDatos();
    }
  };

  // ==================== TAB CREAR GRUPO ====================

  const toggleSeleccionInscripcion = (id: string) => {
    const nuevos = new Set(crearGrupoForm.seleccionados);
    if (nuevos.has(id)) {
      nuevos.delete(id);
    } else {
      nuevos.add(id);
    }
    setCrearGrupoForm({ ...crearGrupoForm, seleccionados: nuevos });
  };

  const seleccionarTodosInscripciones = () => {
    if (crearGrupoForm.seleccionados.size === inscripciones.length) {
      setCrearGrupoForm({ ...crearGrupoForm, seleccionados: new Set() });
    } else {
      setCrearGrupoForm({
        ...crearGrupoForm,
        seleccionados: new Set(inscripciones.map(i => i.id))
      });
    }
  };

  const crearGrupoWhatsApp = async () => {
    if (!crearGrupoForm.nombreGrupo.trim()) {
      setMensaje({ tipo: 'error', texto: 'El nombre del grupo es requerido' });
      return;
    }

    setCreandoGrupo(true);
    setLogsSimulacion([]);

    try {
      agregarLog('info', `Iniciando creación de grupo "${crearGrupoForm.nombreGrupo}"...`);
      
      // 1. Crear grupo en Evolution API
      const createResponse = await fetch('/api/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createGroup',
          subject: crearGrupoForm.nombreGrupo,
          description: crearGrupoForm.descripcion,
          simulacion: modoSimulacion,
        }),
      });

      const createData = await createResponse.json();
      
      if (!createResponse.ok) {
        throw new Error(createData.error || 'Error al crear grupo');
      }

      const groupJid = createData.id || createData.groupJid || createData.jid;
      agregarLog('success', `Grupo creado con JID: ${groupJid}${createData.simulado ? ' (SIMULADO)' : ''}`);
      
      if (!groupJid) {
        throw new Error('No se obtuvo el ID del grupo');
      }

      // 2. Obtener link de invitación
      agregarLog('info', 'Obteniendo link de invitación...');
      
      const inviteResponse = await fetch('/api/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getInviteCode',
          groupJid,
          simulacion: modoSimulacion,
        }),
      });

      const inviteData = await inviteResponse.json();
      
      if (!inviteResponse.ok) {
        throw new Error(inviteData.error || 'Error al obtener link de invitación');
      }

      const inviteLink = inviteData.inviteUrl || inviteData.code 
        ? `https://chat.whatsapp.com/${inviteData.code}` 
        : inviteData.inviteLink;

      agregarLog('success', `Link obtenido: ${inviteLink}${inviteData.simulado ? ' (SIMULADO)' : ''}`);

      if (!inviteLink) {
        throw new Error('No se obtuvo el link de invitación');
      }

      // 3. Guardar en base de datos (solo si NO es simulación)
      if (!modoSimulacion) {
        const cursoInfo = cursos.find(c => c.codigo === crearGrupoForm.cursoSeleccionado);
        
        await supabase
          .from('grupos_whatsapp')
          .insert({
            group_jid: groupJid,
            chat_id: groupJid,
            nombre: crearGrupoForm.nombreGrupo,
            descripcion: crearGrupoForm.descripcion || null,
            categoria: 'curso',
            estado: 'activo',
            puede_enviar: true,
            participantes_count: 1,
            link_invitacion: inviteLink,
          });
        agregarLog('success', 'Grupo guardado en base de datos');
      } else {
        agregarLog('info', '⚠️ Modo simulación: NO se guardó en base de datos');
      }

      setGrupoCreado({ jid: groupJid, link: inviteLink });
      setPasoCrear(3);
      setMensaje({ tipo: 'success', texto: modoSimulacion ? 'Simulación completada' : 'Grupo creado exitosamente' });
      
      if (!modoSimulacion) {
        cargarDatos();
      }
    } catch (err: any) {
      console.error(err);
      agregarLog('error', `Error: ${err.message}`);
      setMensaje({ tipo: 'error', texto: err.message || 'Error al crear el grupo' });
    }

    setCreandoGrupo(false);
  };

  const enviarInvitaciones = async () => {
    if (!grupoCreado) return;
    
    const seleccionadosArray = Array.from(crearGrupoForm.seleccionados);
    const destinatarios = inscripciones.filter(i => seleccionadosArray.includes(i.id));
    
    if (destinatarios.length === 0) {
      setMensaje({ tipo: 'error', texto: 'Seleccioná al menos un destinatario' });
      return;
    }

    setEnviandoInvitaciones(true);
    setProgresoInvitaciones({ enviados: 0, total: destinatarios.length, errores: 0 });
    
    agregarLog('info', `Iniciando envío de ${destinatarios.length} invitaciones...`);

    let enviados = 0;
    let errores = 0;

    for (const dest of destinatarios) {
      try {
        // Personalizar mensaje
        const mensajePersonalizado = crearGrupoForm.mensajeInvitacion
          .replace('{nombre}', dest.nombre.split(' ')[0])
          .replace('{link}', grupoCreado.link);

        // Enviar mensaje
        const response = await fetch('/api/evolution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sendText',
            number: dest.telefono.replace('+', ''),
            text: mensajePersonalizado,
            simulacion: modoSimulacion,
          }),
        });

        const data = await response.json();

        // Guardar en invitaciones_grupo (solo si NO es simulación)
        if (!modoSimulacion) {
          const grupoDb = grupos.find(g => g.group_jid === grupoCreado.jid);
          if (grupoDb) {
            await supabase
              .from('invitaciones_grupo')
              .insert({
                grupo_id: grupoDb.id,
                telefono: dest.telefono,
                nombre: dest.nombre,
                mensaje: mensajePersonalizado,
                estado: response.ok ? 'enviado' : 'fallido',
                whatsapp_message_id: data.key?.id || null,
                error_mensaje: !response.ok ? (data.error || 'Error desconocido') : null,
                enviado_at: new Date().toISOString(),
              });
          }
        }

        if (response.ok) {
          enviados++;
          agregarLog('success', `✓ ${dest.nombre} (${dest.telefono})${data.simulado ? ' [SIM]' : ''}`);
        } else {
          errores++;
          agregarLog('error', `✗ ${dest.nombre}: ${data.error}`);
        }
      } catch (err: any) {
        errores++;
        agregarLog('error', `✗ ${dest.nombre}: ${err.message}`);
      }

      setProgresoInvitaciones({ enviados, total: destinatarios.length, errores });
      
      // Delay entre envíos
      await new Promise(resolve => setTimeout(resolve, modoSimulacion ? 300 : 2000));
    }

    setEnviandoInvitaciones(false);
    
    const resumen = modoSimulacion 
      ? `Simulación completada: ${enviados}/${destinatarios.length} mensajes`
      : `Invitaciones enviadas: ${enviados}/${destinatarios.length}${errores > 0 ? ` (${errores} errores)` : ''}`;
    
    agregarLog(errores === 0 ? 'success' : 'error', resumen);
    setMensaje({ tipo: errores === 0 ? 'success' : 'error', texto: resumen });
  };

  const copiarLink = () => {
    if (grupoCreado?.link) {
      navigator.clipboard.writeText(grupoCreado.link);
      setMensaje({ tipo: 'success', texto: 'Link copiado al portapapeles' });
    }
  };

  const resetearCrearGrupo = () => {
    setCrearGrupoForm({
      nombreGrupo: '',
      descripcion: '',
      cursoSeleccionado: '',
      estadoFiltro: 'todos',
      fechaDesde: '',
      fechaHasta: '',
      mensajeInvitacion: '¡Hola {nombre}! 👋\n\nTe invitamos a unirte al grupo de WhatsApp del curso.\n\n👉 {link}\n\n¡Te esperamos!',
      seleccionados: new Set(),
    });
    setPasoCrear(1);
    setGrupoCreado(null);
    setInscripciones([]);
    setProgresoInvitaciones({ enviados: 0, total: 0, errores: 0 });
    setLogsSimulacion([]);
  };

  // ==================== HELPERS ====================

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'programado':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">Programado</span>;
      case 'en_curso':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">En curso</span>;
      case 'completado':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400">Completado</span>;
      case 'pausado':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400">Pausado</span>;
      case 'cancelado':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">Cancelado</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">{estado}</span>;
    }
  };

  const formatDiasSemana = (dias: number[] | undefined) => {
    if (!dias || dias.length === 0) return '-';
    return dias.map(d => DIAS_SEMANA.find(ds => ds.value === d)?.label).join(', ');
  };

  // ==================== RENDER ====================

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Toast */}
      {mensaje && (
        <div className={cn(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2",
          mensaje.tipo === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white"
        )}>
          {mensaje.tipo === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          {mensaje.texto}
        </div>
      )}

      {/* Modal Editar Envío */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Editar envío</h2>
              <button onClick={() => setEditando(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Mensaje</label>
                <textarea
                  value={editForm.mensaje}
                  onChange={(e) => setEditForm({ ...editForm, mensaje: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm resize-none"
                />
              </div>
              <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ Los cambios solo afectan a mensajes pendientes de enviar.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditando(null)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                Cancelar
              </button>
              <button onClick={guardarEdicion} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">
                Guardar cambios
              </button>
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
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                  {modalSecuencia.editando ? 'Editar secuencia' : 'Nueva secuencia'}
                </h2>
                <p className="text-sm text-slate-500">Grupo: {modalSecuencia.grupo?.nombre}</p>
              </div>
              <button onClick={cerrarModalSecuencia} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nombre de la secuencia *
                  </label>
                  <input
                    type="text"
                    value={formSecuencia.nombre}
                    onChange={(e) => setFormSecuencia({ ...formSecuencia, nombre: e.target.value })}
                    placeholder="Ej: Recordatorios de clase AT 2026"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Descripción (opcional)
                  </label>
                  <input
                    type="text"
                    value={formSecuencia.descripcion}
                    onChange={(e) => setFormSecuencia({ ...formSecuencia, descripcion: e.target.value })}
                    placeholder="Ej: Mensajes automáticos para recordar clases"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Mensajes</h3>
                  <button
                    onClick={agregarMensajeSecuencia}
                    className="px-3 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Agregar mensaje
                  </button>
                </div>

                {formSecuencia.mensajes.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
                    <CalendarClock size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-slate-500">No hay mensajes programados</p>
                    <button
                      onClick={agregarMensajeSecuencia}
                      className="mt-3 px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg"
                    >
                      + Agregar primer mensaje
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formSecuencia.mensajes.map((msg, index) => (
                      <div
                        key={index}
                        className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-full">
                            Mensaje {index + 1}
                          </span>
                          <button
                            onClick={() => eliminarMensajeSecuencia(index)}
                            className="p-1 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Mensaje *</label>
                          <textarea
                            value={msg.mensaje}
                            onChange={(e) => actualizarMensajeSecuencia(index, 'mensaje', e.target.value)}
                            placeholder="Escribí el mensaje..."
                            rows={3}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm resize-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-slate-500 mb-2">Programación</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`tipo-${index}`}
                                checked={msg.tipo_programacion === 'unico'}
                                onChange={() => actualizarMensajeSecuencia(index, 'tipo_programacion', 'unico')}
                                className="text-indigo-500"
                              />
                              <span className="text-sm text-slate-700 dark:text-slate-300">Fecha única</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`tipo-${index}`}
                                checked={msg.tipo_programacion === 'recurrente'}
                                onChange={() => actualizarMensajeSecuencia(index, 'tipo_programacion', 'recurrente')}
                                className="text-indigo-500"
                              />
                              <span className="text-sm text-slate-700 dark:text-slate-300">Recurrente</span>
                            </label>
                          </div>
                        </div>

                        {msg.tipo_programacion === 'unico' ? (
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="block text-xs text-slate-500 mb-1">Fecha *</label>
                              <input
                                type="date"
                                value={msg.fecha_unica || ''}
                                onChange={(e) => actualizarMensajeSecuencia(index, 'fecha_unica', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                              />
                            </div>
                            <div className="w-32">
                              <label className="block text-xs text-slate-500 mb-1">Hora *</label>
                              <input
                                type="time"
                                value={msg.hora_envio}
                                onChange={(e) => actualizarMensajeSecuencia(index, 'hora_envio', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs text-slate-500 mb-2">Días de la semana *</label>
                              <div className="flex flex-wrap gap-2">
                                {DIAS_SEMANA.map((dia) => (
                                  <button
                                    key={dia.value}
                                    type="button"
                                    onClick={() => toggleDiaSemana(index, dia.value)}
                                    className={cn(
                                      "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                                      msg.recurrencia_dias_semana?.includes(dia.value)
                                        ? "bg-indigo-500 text-white border-indigo-500"
                                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                                    )}
                                  >
                                    {dia.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <div className="w-32">
                                <label className="block text-xs text-slate-500 mb-1">Hora *</label>
                                <input
                                  type="time"
                                  value={msg.hora_envio}
                                  onChange={(e) => actualizarMensajeSecuencia(index, 'hora_envio', e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-xs text-slate-500 mb-1">Hasta (opcional)</label>
                                <input
                                  type="date"
                                  value={msg.recurrencia_fecha_fin || ''}
                                  onChange={(e) => actualizarMensajeSecuencia(index, 'recurrencia_fecha_fin', e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={cerrarModalSecuencia}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={guardarSecuencia}
                disabled={guardandoSecuencia}
                className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2"
              >
                {guardandoSecuencia ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    {modalSecuencia.editando ? 'Guardar cambios' : 'Crear secuencia'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Grupos WhatsApp</h1>
            <p className="text-sm text-slate-500">{grupos.length} grupos sincronizados</p>
          </div>
          <button
            onClick={sincronizarGrupos}
            disabled={sincronizando}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={16} className={sincronizando ? 'animate-spin' : ''} />
            {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('grupos')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === 'grupos'
                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <Users size={16} className="inline mr-2" />
            Grupos
          </button>
          <button
            onClick={() => setActiveTab('crear')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === 'crear'
                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <UserPlus size={16} className="inline mr-2" />
            Crear Grupo
          </button>
          <button
            onClick={() => setActiveTab('nuevo')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === 'nuevo'
                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <Send size={16} className="inline mr-2" />
            Envío Único
          </button>
          <button
            onClick={() => setActiveTab('secuencias')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === 'secuencias'
                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <Repeat size={16} className="inline mr-2" />
            Secuencias
            {secuencias.filter(s => s.activa).length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-indigo-500 text-white rounded-full">
                {secuencias.filter(s => s.activa).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === 'historial'
                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <Clock size={16} className="inline mr-2" />
            Historial
            {envios.filter(e => e.estado === 'en_curso').length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                {envios.filter(e => e.estado === 'en_curso').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">

        {/* ==================== TAB: GRUPOS ==================== */}
        {activeTab === 'grupos' && (
          <div>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar grupos..."
                  value={busquedaGrupos}
                  onChange={(e) => setBusquedaGrupos(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>
              <select
                value={categoriaGrupos}
                onChange={(e) => setCategoriaGrupos(e.target.value)}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                {CATEGORIAS.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Cargando grupos...</td>
                    </tr>
                  ) : gruposFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        {grupos.length === 0 ? 'No hay grupos. Hacé clic en "Sincronizar".' : 'No se encontraron grupos'}
                      </td>
                    </tr>
                  ) : gruposFiltrados.map((grupo) => (
                    <tr key={grupo.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white">
                            <Users size={16} />
                          </div>
                          <p className="font-medium text-slate-800 dark:text-white">{grupo.nombre}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-1 text-xs font-medium rounded-full",
                          grupo.categoria === 'curso' && "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
                          grupo.categoria === 'especializacion' && "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
                          grupo.categoria === 'comunidad' && "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400",
                          grupo.categoria === 'otro' && "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400"
                        )}>
                          {grupo.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        👥 {grupo.participantes_count || '?'}
                      </td>
                      <td className="px-4 py-3">
                        {grupo.puede_enviar ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <Radio size={12} /> Activo
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">No admin</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {grupo.ts_ultimo_envio ? new Date(grupo.ts_ultimo_envio).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-slate-500">Mostrando {gruposFiltrados.length} de {grupos.length} grupos</p>
          </div>
        )}

        {/* ==================== TAB: CREAR GRUPO ==================== */}
        {activeTab === 'crear' && (
          <div className="max-w-4xl">
            {/* Toggle Simulación */}
            <div className={cn(
              "mb-4 p-3 rounded-xl border flex items-center justify-between",
              modoSimulacion 
                ? "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30" 
                : "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30"
            )}>
              <div className="flex items-center gap-3">
                <FlaskConical size={20} className={modoSimulacion ? "text-purple-500" : "text-green-500"} />
                <div>
                  <p className={cn(
                    "font-medium",
                    modoSimulacion ? "text-purple-700 dark:text-purple-400" : "text-green-700 dark:text-green-400"
                  )}>
                    {modoSimulacion ? 'Modo Simulación ACTIVO' : 'Modo Producción'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {modoSimulacion 
                      ? 'No se crearán grupos ni enviarán mensajes reales' 
                      : '⚠️ Se ejecutarán acciones reales en WhatsApp'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModoSimulacion(!modoSimulacion)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  modoSimulacion 
                    ? "bg-purple-500 text-white hover:bg-purple-600" 
                    : "bg-green-500 text-white hover:bg-green-600"
                )}
              >
                {modoSimulacion ? 'Desactivar simulación' : 'Activar simulación'}
              </button>
            </div>

            {/* Pasos */}
            <div className="flex items-center gap-4 mb-6">
              {[1, 2, 3].map((paso) => (
                <div key={paso} className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    pasoCrear >= paso
                      ? "bg-indigo-500 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                  )}>
                    {paso}
                  </div>
                  <span className={cn(
                    "text-sm",
                    pasoCrear >= paso ? "text-slate-800 dark:text-white" : "text-slate-400"
                  )}>
                    {paso === 1 && 'Configurar'}
                    {paso === 2 && 'Seleccionar'}
                    {paso === 3 && 'Invitar'}
                  </span>
                  {paso < 3 && <ChevronRight size={16} className="text-slate-300 ml-2" />}
                </div>
              ))}
            </div>

            {/* Paso 1: Configurar grupo */}
            {pasoCrear === 1 && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Datos del grupo</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                        Nombre del grupo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={crearGrupoForm.nombreGrupo}
                        onChange={(e) => setCrearGrupoForm({ ...crearGrupoForm, nombreGrupo: e.target.value })}
                        placeholder="Ej: AT 2026 - Comisión A"
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                        Descripción (opcional)
                      </label>
                      <textarea
                        value={crearGrupoForm.descripcion}
                        onChange={(e) => setCrearGrupoForm({ ...crearGrupoForm, descripcion: e.target.value })}
                        placeholder="Descripción del grupo..."
                        rows={2}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                        Curso <span className="text-red-500">*</span>
                      </label>
                      {cargandoCursos ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                          <RefreshCw size={14} className="animate-spin" />
                          Cargando cursos...
                        </div>
                      ) : (
                        <select
                          value={crearGrupoForm.cursoSeleccionado}
                          onChange={(e) => setCrearGrupoForm({ ...crearGrupoForm, cursoSeleccionado: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                        >
                          <option value="">Seleccionar curso...</option>
                          {cursos.map(curso => (
                            <option key={curso.codigo} value={curso.codigo}>
                              {curso.nombre} ({curso.cantidad} inscriptos)
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                {crearGrupoForm.cursoSeleccionado && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <Filter size={16} />
                      Filtrar inscriptos
                    </h2>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Estado</label>
                        <select
                          value={crearGrupoForm.estadoFiltro}
                          onChange={(e) => setCrearGrupoForm({ ...crearGrupoForm, estadoFiltro: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                        >
                          {ESTADOS_INSCRIPCION.map(estado => (
                            <option key={estado.value} value={estado.value}>{estado.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Inscripto desde</label>
                        <input
                          type="date"
                          value={crearGrupoForm.fechaDesde}
                          onChange={(e) => setCrearGrupoForm({ ...crearGrupoForm, fechaDesde: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Inscripto hasta</label>
                        <input
                          type="date"
                          value={crearGrupoForm.fechaHasta}
                          onChange={(e) => setCrearGrupoForm({ ...crearGrupoForm, fechaHasta: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                        />
                      </div>
                    </div>

                    {cargandoInscripciones ? (
                      <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                        <RefreshCw size={14} className="animate-spin" />
                        Cargando inscriptos...
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        {inscripciones.length} inscriptos encontrados
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={resetearCrearGrupo}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setPasoCrear(2)}
                    disabled={!crearGrupoForm.nombreGrupo.trim() || !crearGrupoForm.cursoSeleccionado || inscripciones.length === 0}
                    className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    Siguiente
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Paso 2: Seleccionar destinatarios */}
            {pasoCrear === 2 && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
                      Seleccionar destinatarios
                      {crearGrupoForm.seleccionados.size > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs rounded-full">
                          {crearGrupoForm.seleccionados.size} seleccionados
                        </span>
                      )}
                    </h2>
                    <button
                      onClick={seleccionarTodosInscripciones}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {crearGrupoForm.seleccionados.size === inscripciones.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                    {inscripciones.map((insc) => (
                      <div
                        key={insc.id}
                        onClick={() => toggleSeleccionInscripcion(insc.id)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0",
                          crearGrupoForm.seleccionados.has(insc.id)
                            ? "bg-indigo-50 dark:bg-indigo-500/10"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        )}
                      >
                        {crearGrupoForm.seleccionados.has(insc.id) ? (
                          <CheckSquare size={18} className="text-indigo-500 flex-shrink-0" />
                        ) : (
                          <Square size={18} className="text-slate-300 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{insc.nombre}</p>
                          <p className="text-xs text-slate-500 truncate">{insc.telefono} • {insc.email || '-'}</p>
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 text-xs rounded-full",
                          insc.estado === 'activo' && "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400",
                          insc.estado === 'finalizado' && "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400",
                          insc.estado === 'pendiente' && "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                        )}>
                          {insc.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">Mensaje de invitación</h2>
                  <textarea
                    value={crearGrupoForm.mensajeInvitacion}
                    onChange={(e) => setCrearGrupoForm({ ...crearGrupoForm, mensajeInvitacion: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm resize-none"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Variables disponibles: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{'{nombre}'}</code> y <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{'{link}'}</code>
                  </p>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setPasoCrear(1)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                  >
                    <ChevronRight size={16} className="rotate-180" />
                    Anterior
                  </button>
                  <button
                    onClick={crearGrupoWhatsApp}
                    disabled={creandoGrupo || crearGrupoForm.seleccionados.size === 0}
                    className={cn(
                      "px-6 py-2 text-white rounded-lg flex items-center gap-2 disabled:opacity-50",
                      modoSimulacion ? "bg-purple-500 hover:bg-purple-600" : "bg-indigo-500 hover:bg-indigo-600"
                    )}
                  >
                    {creandoGrupo ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        {modoSimulacion ? 'Simulando...' : 'Creando grupo...'}
                      </>
                    ) : (
                      <>
                        {modoSimulacion && <FlaskConical size={16} />}
                        <UserPlus size={16} />
                        {modoSimulacion ? 'Simular creación' : 'Crear grupo'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Paso 3: Enviar invitaciones */}
            {pasoCrear === 3 && grupoCreado && (
              <div className="space-y-4">
                <div className={cn(
                  "rounded-xl border p-4",
                  modoSimulacion 
                    ? "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30"
                    : "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      modoSimulacion ? "bg-purple-500" : "bg-green-500"
                    )}>
                      {modoSimulacion ? <FlaskConical size={20} className="text-white" /> : <Check size={20} className="text-white" />}
                    </div>
                    <div>
                      <h2 className={cn(
                        "text-lg font-semibold",
                        modoSimulacion ? "text-purple-800 dark:text-purple-400" : "text-green-800 dark:text-green-400"
                      )}>
                        {modoSimulacion ? '¡Simulación completada!' : '¡Grupo creado exitosamente!'}
                      </h2>
                      <p className={cn(
                        "text-sm",
                        modoSimulacion ? "text-purple-600 dark:text-purple-500" : "text-green-600 dark:text-green-500"
                      )}>
                        {crearGrupoForm.nombreGrupo} {modoSimulacion && '(SIMULADO)'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                    <LinkIcon size={16} />
                    Link de invitación {modoSimulacion && <span className="text-xs text-purple-500">(simulado)</span>}
                  </h2>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={grupoCreado.link}
                      readOnly
                      className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    />
                    <button
                      onClick={copiarLink}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Copy size={16} />
                      Copiar
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                    <Mail size={16} />
                    Enviar invitaciones
                  </h2>
                  
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Se {modoSimulacion ? 'simularán' : 'enviarán'} invitaciones a <strong>{crearGrupoForm.seleccionados.size}</strong> personas seleccionadas.
                  </p>

                  {enviandoInvitaciones && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
                        <span>Progreso</span>
                        <span>{progresoInvitaciones.enviados}/{progresoInvitaciones.total}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-300",
                            modoSimulacion ? "bg-purple-500" : "bg-indigo-500"
                          )}
                          style={{ width: `${(progresoInvitaciones.enviados / progresoInvitaciones.total) * 100}%` }}
                        />
                      </div>
                      {progresoInvitaciones.errores > 0 && (
                        <p className="text-xs text-red-500 mt-1">{progresoInvitaciones.errores} errores</p>
                      )}
                    </div>
                  )}

                  {!modoSimulacion && (
                    <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-lg mb-4">
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        ⚠️ Los mensajes se enviarán con un delay de 2 segundos entre cada uno para evitar bloqueos de WhatsApp.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={enviarInvitaciones}
                    disabled={enviandoInvitaciones}
                    className={cn(
                      "w-full px-6 py-3 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50",
                      modoSimulacion ? "bg-purple-500 hover:bg-purple-600" : "bg-indigo-500 hover:bg-indigo-600"
                    )}
                  >
                    {enviandoInvitaciones ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        {modoSimulacion ? 'Simulando envío...' : 'Enviando invitaciones...'}
                      </>
                    ) : (
                      <>
                        {modoSimulacion && <FlaskConical size={16} />}
                        <Send size={16} />
                        {modoSimulacion ? 'Simular envío' : 'Enviar'} {crearGrupoForm.seleccionados.size} invitaciones
                      </>
                    )}
                  </button>
                </div>

                {/* Logs de simulación */}
                {logsSimulacion.length > 0 && (
                  <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
                    <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <FlaskConical size={16} className="text-purple-400" />
                      Logs {modoSimulacion ? 'de simulación' : 'de ejecución'}
                    </h2>
                    <div className="max-h-48 overflow-y-auto font-mono text-xs space-y-1">
                      {logsSimulacion.map((log, i) => (
                        <div key={i} className={cn(
                          "flex gap-2",
                          log.tipo === 'success' && "text-green-400",
                          log.tipo === 'error' && "text-red-400",
                          log.tipo === 'info' && "text-slate-400"
                        )}>
                          <span className="text-slate-600">[{log.timestamp}]</span>
                          <span>{log.mensaje}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={resetearCrearGrupo}
                    className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    {modoSimulacion ? 'Nueva simulación' : 'Crear otro grupo'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB: NUEVO ENVÍO ==================== */}
        {activeTab === 'nuevo' && (
          <div className="max-w-4xl">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-4">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">1</span>
                Mensaje
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Nombre del envío (opcional)</label>
                  <input
                    type="text"
                    value={nuevoEnvio.nombre}
                    onChange={(e) => setNuevoEnvio({ ...nuevoEnvio, nombre: e.target.value })}
                    placeholder="Ej: Promo AT Enero 2026"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Mensaje <span className="text-red-500">*</span></label>
                  <textarea
                    value={nuevoEnvio.mensaje}
                    onChange={(e) => setNuevoEnvio({ ...nuevoEnvio, mensaje: e.target.value })}
                    placeholder="Escribí el mensaje que se enviará a los grupos..."
                    rows={4}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">URL de imagen (opcional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nuevoEnvio.mediaUrl}
                      onChange={(e) => setNuevoEnvio({ ...nuevoEnvio, mediaUrl: e.target.value })}
                      placeholder="https://..."
                      className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    />
                    <button className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200">
                      <Image size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">2</span>
                  Grupos destino
                  {nuevoEnvio.gruposSeleccionados.size > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs rounded-full">
                      {nuevoEnvio.gruposSeleccionados.size} seleccionados
                    </span>
                  )}
                </h2>
                <button onClick={seleccionarTodosNuevo} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                  {nuevoEnvio.gruposSeleccionados.size === gruposNuevoFiltrados.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
              </div>

              <div className="flex gap-3 mb-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar grupos..."
                    value={busquedaNuevo}
                    onChange={(e) => setBusquedaNuevo(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>
                <select
                  value={categoriaNuevo}
                  onChange={(e) => setCategoriaNuevo(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                >
                  {CATEGORIAS.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                {gruposNuevoFiltrados.length === 0 ? (
                  <p className="p-4 text-center text-slate-400 text-sm">No hay grupos</p>
                ) : gruposNuevoFiltrados.map((grupo) => (
                  <div
                    key={grupo.id}
                    onClick={() => toggleGrupoNuevo(grupo.id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0",
                      nuevoEnvio.gruposSeleccionados.has(grupo.id)
                        ? "bg-indigo-50 dark:bg-indigo-500/10"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    )}
                  >
                    {nuevoEnvio.gruposSeleccionados.has(grupo.id) ? (
                      <CheckSquare size={18} className="text-indigo-500 flex-shrink-0" />
                    ) : (
                      <Square size={18} className="text-slate-300 flex-shrink-0" />
                    )}
                    <span className="text-sm text-slate-800 dark:text-white flex-1">{grupo.nombre}</span>
                    <span className="text-xs text-slate-400">{grupo.participantes_count} 👥</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-4">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">3</span>
                Programación
              </h2>
              <div className="space-y-3">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="programar"
                      checked={nuevoEnvio.programarPara === 'ahora'}
                      onChange={() => setNuevoEnvio({ ...nuevoEnvio, programarPara: 'ahora' })}
                      className="text-indigo-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Enviar ahora</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="programar"
                      checked={nuevoEnvio.programarPara === 'fecha'}
                      onChange={() => setNuevoEnvio({ ...nuevoEnvio, programarPara: 'fecha' })}
                      className="text-indigo-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Programar para</span>
                  </label>
                </div>

                {nuevoEnvio.programarPara === 'fecha' && (
                  <div className="flex gap-3">
                    <input
                      type="date"
                      value={nuevoEnvio.fechaProgramada}
                      onChange={(e) => setNuevoEnvio({ ...nuevoEnvio, fechaProgramada: e.target.value })}
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    />
                    <input
                      type="time"
                      value={nuevoEnvio.horaProgramada}
                      onChange={(e) => setNuevoEnvio({ ...nuevoEnvio, horaProgramada: e.target.value })}
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Distribuir en</label>
                  <select
                    value={nuevoEnvio.distribuirEnHoras}
                    onChange={(e) => setNuevoEnvio({ ...nuevoEnvio, distribuirEnHoras: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  >
                    <option value={24}>1 día</option>
                    <option value={48}>2 días</option>
                    <option value={72}>3 días</option>
                    <option value={168}>1 semana</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">{calcularTiempoEstimado()}</p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    ⚠️ Los mensajes se enviarán de forma gradual para evitar bloqueos de WhatsApp.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setNuevoEnvio({
                    nombre: '',
                    mensaje: '',
                    mediaUrl: '',
                    gruposSeleccionados: new Set(),
                    programarPara: 'ahora',
                    fechaProgramada: '',
                    horaProgramada: '',
                    distribuirEnHoras: 48,
                  });
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={programarEnvio}
                disabled={enviandoNuevo || !nuevoEnvio.mensaje.trim() || nuevoEnvio.gruposSeleccionados.size === 0}
                className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2"
              >
                {enviandoNuevo ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Programando...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Programar envío
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ==================== TAB: SECUENCIAS ==================== */}
        {activeTab === 'secuencias' && (
          <div>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar grupos..."
                  value={busquedaSecuencias}
                  onChange={(e) => setBusquedaSecuencias(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>
              <select
                value={categoriaSecuencias}
                onChange={(e) => setCategoriaSecuencias(e.target.value)}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                {CATEGORIAS.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              {gruposSecuenciasFiltrados.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
                  <Users size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-slate-500">No hay grupos</p>
                </div>
              ) : gruposSecuenciasFiltrados.map((grupo) => {
                const secuenciasGrupo = getSecuenciasGrupo(grupo.id);
                const expandido = gruposExpandidos.has(grupo.id);

                return (
                  <div
                    key={grupo.id}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                  >
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      onClick={() => toggleGrupoExpandido(grupo.id)}
                    >
                      <div className="flex items-center gap-3">
                        {expandido ? (
                          <ChevronDown size={18} className="text-slate-400" />
                        ) : (
                          <ChevronRight size={18} className="text-slate-400" />
                        )}
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white">
                          <Users size={16} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 dark:text-white">{grupo.nombre}</p>
                          <p className="text-xs text-slate-500">
                            {secuenciasGrupo.length === 0 ? 'Sin secuencias' : `${secuenciasGrupo.length} secuencia${secuenciasGrupo.length > 1 ? 's' : ''}`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirModalSecuencia(grupo);
                        }}
                        className="px-3 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg flex items-center gap-1"
                      >
                        <Plus size={16} />
                        Secuencia
                      </button>
                    </div>

                    {expandido && (
                      <div className="border-t border-slate-100 dark:border-slate-800">
                        {secuenciasGrupo.length === 0 ? (
                          <div className="px-4 py-6 text-center">
                            <p className="text-sm text-slate-400">No hay secuencias configuradas</p>
                            <button
                              onClick={() => abrirModalSecuencia(grupo)}
                              className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              + Crear primera secuencia
                            </button>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {secuenciasGrupo.map((secuencia) => (
                              <div key={secuencia.id} className="px-4 py-3 pl-14">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <Repeat size={14} className={secuencia.activa ? "text-green-500" : "text-slate-400"} />
                                      <span className="font-medium text-slate-800 dark:text-white">{secuencia.nombre}</span>
                                      {!secuencia.activa && (
                                        <span className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
                                          Pausada
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                      {secuencia.mensajes?.length || 0} mensaje{(secuencia.mensajes?.length || 0) !== 1 ? 's' : ''} programado{(secuencia.mensajes?.length || 0) !== 1 ? 's' : ''}
                                    </p>
                                    {secuencia.mensajes && secuencia.mensajes.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        {secuencia.mensajes.slice(0, 3).map((msg, idx) => (
                                          <div key={idx} className="flex items-center gap-2 text-xs text-slate-500">
                                            {msg.tipo_programacion === 'recurrente' ? (
                                              <Repeat size={12} className="text-indigo-400" />
                                            ) : (
                                              <Calendar size={12} className="text-amber-400" />
                                            )}
                                            <span className="truncate max-w-xs">{msg.mensaje.substring(0, 40)}...</span>
                                            <span className="text-slate-400">
                                              {msg.tipo_programacion === 'recurrente'
                                                ? `${formatDiasSemana(msg.recurrencia_dias_semana)} ${msg.hora_envio}`
                                                : msg.fecha_unica ? new Date(msg.fecha_unica).toLocaleDateString() : ''
                                              }
                                            </span>
                                          </div>
                                        ))}
                                        {(secuencia.mensajes?.length || 0) > 3 && (
                                          <p className="text-xs text-slate-400">
                                            +{(secuencia.mensajes?.length || 0) - 3} más...
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => toggleSecuenciaActiva(secuencia)}
                                      className={cn(
                                        "p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800",
                                        secuencia.activa ? "text-amber-500" : "text-green-500"
                                      )}
                                      title={secuencia.activa ? 'Pausar' : 'Activar'}
                                    >
                                      {secuencia.activa ? <Pause size={16} /> : <Play size={16} />}
                                    </button>
                                    <button
                                      onClick={() => abrirModalSecuencia(grupo, secuencia)}
                                      className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded"
                                      title="Editar"
                                    >
                                      <Pencil size={16} />
                                    </button>
                                    <button
                                      onClick={() => eliminarSecuencia(secuencia.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded"
                                      title="Eliminar"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== TAB: HISTORIAL ==================== */}
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
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No hay envíos programados</td>
                    </tr>
                  ) : envios.map((envio) => (
                    <tr key={envio.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-white">{envio.nombre || 'Sin nombre'}</p>
                        <p className="text-xs text-slate-500 truncate max-w-xs">{envio.mensaje.substring(0, 50)}...</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {envio.total_grupos}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${(envio.enviados / envio.total_grupos) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">
                            {envio.enviados}/{envio.total_grupos}
                          </span>
                        </div>
                        {envio.fallidos > 0 && (
                          <p className="text-xs text-red-500 mt-0.5">{envio.fallidos} fallidos</p>
                        )}
                      </td>
                      <td className="px-4 py-3">{getEstadoBadge(envio.estado)}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {envio.inicio_programado
                          ? new Date(envio.inicio_programado).toLocaleString('es-AR', {
                              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                            })
                          : '-'
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {(envio.estado === 'programado' || envio.estado === 'en_curso') && (
                            <button
                              onClick={() => pausarEnvio(envio.id)}
                              className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded"
                              title="Pausar"
                            >
                              <Pause size={16} />
                            </button>
                          )}
                          {envio.estado === 'pausado' && (
                            <button
                              onClick={() => reanudarEnvio(envio.id)}
                              className="p-1.5 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 rounded"
                              title="Reanudar"
                            >
                              <Play size={16} />
                            </button>
                          )}
                          {envio.estado !== 'completado' && (
                            <button
                              onClick={() => abrirEditar(envio)}
                              className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded"
                              title="Editar"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          <button
                            className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded"
                            title="Ver detalles"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => eliminarEnvio(envio.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
