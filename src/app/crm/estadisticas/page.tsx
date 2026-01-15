'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import {
  MessageSquare, Users, Clock, TrendingUp,
  Phone, Megaphone, RefreshCw, Download, BarChart3,
  Send, Inbox, GitBranch, Target, Award, FileSpreadsheet,
  ShieldAlert, ChevronDown,
  Timer, Trophy, CalendarRange, GraduationCap, Building2, UsersRound,
  HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// ============================================
// CONTROL DE ACCESO
// ============================================
const EMAILS_ADMIN = [
  'ninadulcich@gmail.com',
  'asociacionpsi.gestion@gmail.com',
  'marfer1@gmail.com',
];

// ============================================
// MAPEO DE OPCIONES DE MENÚ A NOMBRES LEGIBLES
// ============================================
const MENU_OPTION_LABELS: Record<string, string> = {
  // Administración
  'admin_pagos': 'Pagos y medios de pago',
  'admin_cuota': 'Consulta de cuota',
  'admin_facturas': 'Facturas y comprobantes',
  'admin_certificados': 'Certificados',
  'admin_otra': 'Otra consulta',
  // Alumnos
  'alumnos_campus': 'Acceso al Campus',
  'alumnos_clases': 'Clases y cronograma',
  'alumnos_recursos': 'Recursos y materiales',
  'alumnos_certificados': 'Certificados académicos',
  'alumnos_duda': 'Duda académica',
  'alumnos_otra': 'Otra consulta',
  // Comunidad
  'comunidad_calendario': 'Calendario de vivos',
  'comunidad_eventos': 'Próximos eventos',
  'comunidad_grabaciones': 'Grabaciones',
  'comunidad_otra': 'Otra consulta',
};

// ============================================
// TIPOS
// ============================================
type TabType = 'wsp4' | 'ventas' | 'administracion' | 'alumnos' | 'comunidad';
type PeriodoType = 'hoy' | 'semana' | 'mes' | 'todo' | 'personalizado';

interface StatsWSP4 {
  mensajesHoy: number;
  mensajesSemana: number;
  conversacionesActivas: number;
  conversacionesHoy: number;
  derivacionesHoy: { area: string; cantidad: number }[];
  autorespuestasHoy: number;
}

interface StatsVentas {
  leadsHoy: number;
  leadsSemana: number;
  leadsMes: number;
  leadsCTWA: number;
  leadsDirectos: number;
  tasaConversion: number;
  totalConversiones: number;
  topCursos: { nombre: string; leads: number }[];
  topAnuncios: { nombre: string; ad_id: string; leads: number }[];
  leadsPorEstado: { estado: string; cantidad: number }[];
  agentes: StatsAgente[];
}

interface StatsArea {
  conversacionesAtendidas: number;
  conversacionesHoy: number;
  mensajesTotales: number;
  mensajesHoy: number;
  tiempoRespuestaPromedio: number | null;
  topConsultas: { opcion: string; label: string; cantidad: number }[];
  agentes: StatsAgente[];
}

interface StatsAgente {
  id: string;
  nombre: string;
  mensajesEnviados: number;
  mensajesAnterior: number;
  conversacionesAtendidas: number;
  conversacionesAsignadas: number;
  tiempoRespuestaPromedio: number | null;
  conversiones: number;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function EstadisticasPage() {
  const { user, profile } = useAuth();
  const { permisos, cargando: permisosLoading } = usePermissions();

  const emailUsuario = user?.email || '';
  const esAdmin = profile?.rol === 'admin' || EMAILS_ADMIN.includes(emailUsuario);

  const misInboxes = permisos?.inboxes || [];
  const tieneAccesoVentas = esAdmin || misInboxes.includes('ventas') || misInboxes.includes('ventas_api');
  const tieneAccesoAdmin = esAdmin || misInboxes.includes('admin') || misInboxes.includes('administracion');
  const tieneAccesoAlumnos = esAdmin || misInboxes.includes('alumnos');
  const tieneAccesoComunidad = esAdmin || misInboxes.includes('comunidad');
  const tieneAcceso = esAdmin || misInboxes.length > 0;

  // Calcular tabs disponibles
  const TABS = useMemo(() => {
    const tabs: { id: TabType; nombre: string; icono: any }[] = [];
    if (esAdmin) tabs.push({ id: 'wsp4', nombre: 'WSP4 Router', icono: Phone });
    if (tieneAccesoVentas) tabs.push({ id: 'ventas', nombre: 'Ventas', icono: Megaphone });
    if (tieneAccesoAdmin) tabs.push({ id: 'administracion', nombre: 'Administración', icono: Building2 });
    if (tieneAccesoAlumnos) tabs.push({ id: 'alumnos', nombre: 'Alumnos', icono: GraduationCap });
    if (tieneAccesoComunidad) tabs.push({ id: 'comunidad', nombre: 'Comunidad', icono: UsersRound });
    return tabs;
  }, [esAdmin, tieneAccesoVentas, tieneAccesoAdmin, tieneAccesoAlumnos, tieneAccesoComunidad]);

  // Tab inicial: primer tab disponible
  const tabInicial = useMemo(() => {
    if (TABS.length > 0) return TABS[0].id;
    return 'ventas' as TabType;
  }, [TABS]);

  const [tab, setTab] = useState<TabType | null>(null);
  const [periodo, setPeriodo] = useState<PeriodoType>('semana');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [statsWSP4, setStatsWSP4] = useState<StatsWSP4>({
    mensajesHoy: 0, mensajesSemana: 0, conversacionesActivas: 0,
    conversacionesHoy: 0, derivacionesHoy: [], autorespuestasHoy: 0
  });

  const [statsVentas, setStatsVentas] = useState<StatsVentas>({
    leadsHoy: 0, leadsSemana: 0, leadsMes: 0, leadsCTWA: 0, leadsDirectos: 0,
    tasaConversion: 0, totalConversiones: 0, topCursos: [], topAnuncios: [],
    leadsPorEstado: [], agentes: []
  });

  const [statsAdmin, setStatsAdmin] = useState<StatsArea>({
    conversacionesAtendidas: 0, conversacionesHoy: 0, mensajesTotales: 0,
    mensajesHoy: 0, tiempoRespuestaPromedio: null, topConsultas: [], agentes: []
  });

  const [statsAlumnos, setStatsAlumnos] = useState<StatsArea>({
    conversacionesAtendidas: 0, conversacionesHoy: 0, mensajesTotales: 0,
    mensajesHoy: 0, tiempoRespuestaPromedio: null, topConsultas: [], agentes: []
  });

  const [statsComunidad, setStatsComunidad] = useState<StatsArea>({
    conversacionesAtendidas: 0, conversacionesHoy: 0, mensajesTotales: 0,
    mensajesHoy: 0, tiempoRespuestaPromedio: null, topConsultas: [], agentes: []
  });

  // ============================================
  // FECHAS
  // ============================================
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
  const inicioSemana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 7).toISOString();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();

  const getFechasPeriodo = (p: PeriodoType) => {
    switch (p) {
      case 'hoy': return { inicio: inicioHoy, fin: null };
      case 'semana': return { inicio: inicioSemana, fin: null };
      case 'mes': return { inicio: inicioMes, fin: null };
      case 'personalizado':
        if (fechaDesde && fechaHasta) {
          const hasta = new Date(fechaHasta);
          hasta.setHours(23, 59, 59, 999);
          return { inicio: new Date(fechaDesde).toISOString(), fin: hasta.toISOString() };
        }
        return { inicio: null, fin: null };
      default: return { inicio: null, fin: null };
    }
  };

  // ============================================
  // CARGA DE DATOS - WSP4
  // ============================================
  const cargarStatsWSP4 = async () => {
    try {
      const { count: msgHoy } = await supabase
        .from('mensajes').select('*', { count: 'exact', head: true })
        .gte('created_at', inicioHoy);

      const { count: msgSemana } = await supabase
        .from('mensajes').select('*', { count: 'exact', head: true })
        .gte('created_at', inicioSemana);

      const { count: convActivas } = await supabase
        .from('conversaciones').select('*', { count: 'exact', head: true })
        .or('linea_origen.eq.wsp4,linea_origen.is.null')
        .in('estado', ['activa', 'abierta', 'en_menu']);

      const { count: convHoy } = await supabase
        .from('conversaciones').select('*', { count: 'exact', head: true })
        .gte('created_at', inicioHoy);

      const { data: derivaciones } = await supabase
        .from('derivaciones').select('area_destino')
        .gte('created_at', inicioHoy);

      const derivacionesAgrupadas: Record<string, number> = {};
      derivaciones?.forEach(d => {
        if (d.area_destino) {
          derivacionesAgrupadas[d.area_destino] = (derivacionesAgrupadas[d.area_destino] || 0) + 1;
        }
      });

      const { count: autoHoy } = await supabase
        .from('autorespuestas_enviadas').select('*', { count: 'exact', head: true })
        .gte('enviado_at', inicioHoy);

      setStatsWSP4({
        mensajesHoy: msgHoy || 0,
        mensajesSemana: msgSemana || 0,
        conversacionesActivas: convActivas || 0,
        conversacionesHoy: convHoy || 0,
        derivacionesHoy: Object.entries(derivacionesAgrupadas)
          .map(([area, cantidad]) => ({ area, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad),
        autorespuestasHoy: autoHoy || 0
      });
    } catch (error) {
      console.error('Error cargando stats WSP4:', error);
    }
  };

  // ============================================
  // CARGA DE DATOS - VENTAS
  // ============================================
  const cargarStatsVentas = async () => {
    try {
      const { inicio, fin } = getFechasPeriodo(periodo);

      const [{ count: leadsHoy }, { count: leadsSemana }, { count: leadsMes }] = await Promise.all([
        supabase.from('menu_sesiones').select('*', { count: 'exact', head: true }).gte('created_at', inicioHoy),
        supabase.from('menu_sesiones').select('*', { count: 'exact', head: true }).gte('created_at', inicioSemana),
        supabase.from('menu_sesiones').select('*', { count: 'exact', head: true }).gte('created_at', inicioMes)
      ]);

      const { data: sesiones } = await supabase.from('menu_sesiones').select('ctwa_clid, origen');
      const leadsCTWA = sesiones?.filter(s => s.ctwa_clid).length || 0;
      const leadsDirectos = sesiones?.filter(s => !s.ctwa_clid).length || 0;

      const { count: totalConversiones } = await supabase
        .from('contactos').select('*', { count: 'exact', head: true })
        .eq('resultado', 'INS');

      const totalLeads = (sesiones?.length || 0);
      const tasaConversion = totalLeads > 0 ? ((totalConversiones || 0) / totalLeads) * 100 : 0;

      let queryInteracciones = supabase
        .from('menu_interacciones').select('curso_nombre')
        .not('curso_nombre', 'is', null);
      if (inicio) queryInteracciones = queryInteracciones.gte('created_at', inicio);
      if (fin) queryInteracciones = queryInteracciones.lte('created_at', fin);

      const { data: interacciones } = await queryInteracciones;

      const cursosCount: Record<string, number> = {};
      interacciones?.forEach(i => {
        if (i.curso_nombre) {
          cursosCount[i.curso_nombre] = (cursosCount[i.curso_nombre] || 0) + 1;
        }
      });

      const topCursos = Object.entries(cursosCount)
        .map(([nombre, leads]) => ({ nombre, leads }))
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 5);

      const { data: anuncios } = await supabase
        .from('config_ctwa_anuncios').select('nombre, ad_id, ejecuciones')
        .eq('activo', true)
        .order('ejecuciones', { ascending: false })
        .limit(5);

      const topAnuncios = anuncios?.map(a => ({
        nombre: a.nombre || 'Sin nombre',
        ad_id: a.ad_id || '',
        leads: a.ejecuciones || 0
      })) || [];

      const { data: contactosEstado } = await supabase
        .from('contactos').select('estado_lead')
        .not('estado_lead', 'is', null);

      const estadosCount: Record<string, number> = {};
      contactosEstado?.forEach(c => {
        if (c.estado_lead) {
          estadosCount[c.estado_lead] = (estadosCount[c.estado_lead] || 0) + 1;
        }
      });

      const leadsPorEstado = Object.entries(estadosCount)
        .map(([estado, cantidad]) => ({ estado, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);

      const agentesVentas = await cargarAgentesArea(['ventas', 'ventas_api'], inicio, fin);

      setStatsVentas({
        leadsHoy: leadsHoy || 0,
        leadsSemana: leadsSemana || 0,
        leadsMes: leadsMes || 0,
        leadsCTWA,
        leadsDirectos,
        tasaConversion,
        totalConversiones: totalConversiones || 0,
        topCursos,
        topAnuncios,
        leadsPorEstado,
        agentes: agentesVentas
      });
    } catch (error) {
      console.error('Error cargando stats Ventas:', error);
    }
  };

  // ============================================
  // CARGA DE DATOS - ÁREA GENÉRICA
  // ============================================
  const cargarStatsArea = async (areaDestino: string): Promise<StatsArea> => {
    try {
      const { inicio, fin } = getFechasPeriodo(periodo);
      const areasDB = areaDestino === 'administracion' ? ['admin', 'administracion'] : [areaDestino];

      let queryConv = supabase.from('conversaciones').select('*', { count: 'exact', head: true })
        .in('area', areasDB);
      if (inicio) queryConv = queryConv.gte('created_at', inicio);
      if (fin) queryConv = queryConv.lte('created_at', fin);
      const { count: convAtendidas } = await queryConv;

      const { count: convHoy } = await supabase
        .from('conversaciones').select('*', { count: 'exact', head: true })
        .in('area', areasDB)
        .gte('created_at', inicioHoy);

      let queryConvIds = supabase.from('conversaciones').select('id').in('area', areasDB);
      if (inicio) queryConvIds = queryConvIds.gte('created_at', inicio);
      if (fin) queryConvIds = queryConvIds.lte('created_at', fin);
      const { data: convsArea } = await queryConvIds;
      const convIds = convsArea?.map(c => c.id) || [];

      let mensajesTotales = 0;
      let mensajesHoy = 0;
      if (convIds.length > 0) {
        const { count: msgTotal } = await supabase
          .from('mensajes').select('*', { count: 'exact', head: true })
          .in('conversacion_id', convIds);
        mensajesTotales = msgTotal || 0;

        const { count: msgHoy } = await supabase
          .from('mensajes').select('*', { count: 'exact', head: true })
          .in('conversacion_id', convIds)
          .gte('created_at', inicioHoy);
        mensajesHoy = msgHoy || 0;
      }

      let queryDeriv = supabase.from('derivaciones').select('menu_option_selected')
        .in('area_destino', areasDB)
        .not('menu_option_selected', 'is', null);
      if (inicio) queryDeriv = queryDeriv.gte('created_at', inicio);
      if (fin) queryDeriv = queryDeriv.lte('created_at', fin);

      const { data: derivaciones } = await queryDeriv;
      const opcionesCount: Record<string, number> = {};
      derivaciones?.forEach(d => {
        if (d.menu_option_selected) {
          opcionesCount[d.menu_option_selected] = (opcionesCount[d.menu_option_selected] || 0) + 1;
        }
      });

      const topConsultas = Object.entries(opcionesCount)
        .map(([opcion, cantidad]) => ({
          opcion,
          label: MENU_OPTION_LABELS[opcion] || opcion.replace(/_/g, ' '),
          cantidad
        }))
        .filter(t => t.opcion !== 'volver')
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

      const { data: tickets } = await supabase
        .from('tickets').select('ts_primera_respuesta, created_at')
        .in('area', areasDB)
        .not('ts_primera_respuesta', 'is', null);

      let tiempoTotal = 0;
      let ticketsConTiempo = 0;
      tickets?.forEach(t => {
        if (t.ts_primera_respuesta && t.created_at) {
          const diff = new Date(t.ts_primera_respuesta).getTime() - new Date(t.created_at).getTime();
          if (diff > 0) {
            tiempoTotal += diff / 1000 / 60;
            ticketsConTiempo++;
          }
        }
      });

      const tiempoRespuestaPromedio = ticketsConTiempo > 0 ? tiempoTotal / ticketsConTiempo : null;
      const agentes = await cargarAgentesArea(areasDB, inicio, fin);

      return {
        conversacionesAtendidas: convAtendidas || 0,
        conversacionesHoy: convHoy || 0,
        mensajesTotales,
        mensajesHoy,
        tiempoRespuestaPromedio,
        topConsultas,
        agentes
      };
    } catch (error) {
      console.error(`Error cargando stats ${areaDestino}:`, error);
      return {
        conversacionesAtendidas: 0, conversacionesHoy: 0, mensajesTotales: 0,
        mensajesHoy: 0, tiempoRespuestaPromedio: null, topConsultas: [], agentes: []
      };
    }
  };

  // ============================================
  // CARGA DE AGENTES POR ÁREA
  // ============================================
  const cargarAgentesArea = async (areas: string[], inicio: string | null, fin: string | null): Promise<StatsAgente[]> => {
    try {
      let queryConvs = supabase.from('conversaciones').select('id').in('area', areas);
      if (inicio) queryConvs = queryConvs.gte('created_at', inicio);
      if (fin) queryConvs = queryConvs.lte('created_at', fin);
      const { data: convs } = await queryConvs;
      const convIds = convs?.map(c => c.id) || [];

      if (convIds.length === 0) return [];

      const { data: mensajes } = await supabase.from('mensajes')
        .select('remitente_id, remitente_nombre, conversacion_id')
        .eq('direccion', 'saliente')
        .eq('remitente_tipo', 'agente')
        .not('remitente_id', 'is', null)
        .in('conversacion_id', convIds);

      if (!mensajes) return [];

      const agentesMap: Record<string, { nombre: string; mensajes: number; convs: Set<string> }> = {};
      mensajes.forEach(m => {
        if (m.remitente_id) {
          if (!agentesMap[m.remitente_id]) {
            agentesMap[m.remitente_id] = { nombre: m.remitente_nombre || 'Agente', mensajes: 0, convs: new Set() };
          }
          agentesMap[m.remitente_id].mensajes++;
          agentesMap[m.remitente_id].convs.add(m.conversacion_id);
        }
      });

      const { data: convsAsignadas } = await supabase
        .from('conversaciones').select('asignado_a')
        .in('area', areas)
        .not('asignado_a', 'is', null)
        .in('estado', ['activa', 'abierta', 'en_menu', 'derivada']);

      const asignadasPorAgente: Record<string, number> = {};
      convsAsignadas?.forEach(c => {
        if (c.asignado_a) {
          asignadasPorAgente[c.asignado_a] = (asignadasPorAgente[c.asignado_a] || 0) + 1;
        }
      });

      const convContactoMap: Record<string, string> = {};
      if (areas.includes('ventas') || areas.includes('ventas_api')) {
        const { data: convsContacto } = await supabase
          .from('conversaciones').select('id, contacto_id')
          .in('id', convIds)
          .not('contacto_id', 'is', null);
        convsContacto?.forEach(c => {
          if (c.contacto_id) convContactoMap[c.id] = c.contacto_id;
        });
      }

      const contactoIds = [...new Set(Object.values(convContactoMap))];
      let contactosGanadosSet = new Set<string>();
      if (contactoIds.length > 0) {
        const { data: contactosGanados } = await supabase
          .from('contactos').select('id')
          .in('id', contactoIds)
          .eq('resultado', 'INS');
        contactosGanadosSet = new Set(contactosGanados?.map(c => c.id) || []);
      }

      return Object.entries(agentesMap)
        .map(([id, data]) => {
          let conversiones = 0;
          if (areas.includes('ventas') || areas.includes('ventas_api')) {
            data.convs.forEach(convId => {
              const contactoId = convContactoMap[convId];
              if (contactoId && contactosGanadosSet.has(contactoId)) {
                conversiones++;
              }
            });
          }
          return {
            id,
            nombre: data.nombre,
            mensajesEnviados: data.mensajes,
            mensajesAnterior: 0,
            conversacionesAtendidas: data.convs.size,
            conversacionesAsignadas: asignadasPorAgente[id] || 0,
            tiempoRespuestaPromedio: null,
            conversiones
          };
        })
        .sort((a, b) => b.mensajesEnviados - a.mensajesEnviados);
    } catch (error) {
      console.error('Error cargando agentes:', error);
      return [];
    }
  };

  // ============================================
  // CARGA GENERAL
  // ============================================
  const cargarTodo = async () => {
    setLoading(true);
    const promises = [];
    
    if (esAdmin) promises.push(cargarStatsWSP4());
    if (tieneAccesoVentas) promises.push(cargarStatsVentas());
    if (tieneAccesoAdmin) promises.push(cargarStatsArea('administracion').then(setStatsAdmin));
    if (tieneAccesoAlumnos) promises.push(cargarStatsArea('alumnos').then(setStatsAlumnos));
    if (tieneAccesoComunidad) promises.push(cargarStatsArea('comunidad').then(setStatsComunidad));
    
    await Promise.all(promises);
    setLoading(false);
  };

  const refrescar = async () => {
    setRefreshing(true);
    await cargarTodo();
    setRefreshing(false);
  };

  // ============================================
  // EFFECTS
  // ============================================
  // Setear tab inicial cuando se cargan los permisos
  useEffect(() => {
    if (!permisosLoading && TABS.length > 0 && tab === null) {
      setTab(TABS[0].id);
    }
  }, [permisosLoading, TABS, tab]);

  // Cargar datos cuando cambia el tab o permisos
  useEffect(() => {
    if (tieneAcceso && !permisosLoading && tab !== null) {
      cargarTodo();
    } else if (!permisosLoading && !tieneAcceso) {
      setLoading(false);
    }
  }, [tieneAcceso, permisosLoading, tab]);

  // Recargar cuando cambia el período
  useEffect(() => {
    if (tieneAcceso && !permisosLoading && tab !== null && periodo !== 'personalizado') {
      cargarTodo();
    }
  }, [periodo]);

  const aplicarFechasPersonalizadas = () => {
    if (fechaDesde && fechaHasta) {
      setPeriodo('personalizado');
      setShowDatePicker(false);
      cargarTodo();
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const formatArea = (area: string) => {
    const nombres: Record<string, string> = {
      ventas: 'Ventas', ventas_api: 'Ventas API', administracion: 'Administración',
      admin: 'Administración', alumnos: 'Alumnos', comunidad: 'Comunidad', wsp4: 'WSP4'
    };
    return nombres[area] || area;
  };

  const formatTiempo = (minutos: number): string => {
    if (minutos < 1) return '< 1 min';
    if (minutos < 60) return `${Math.round(minutos)} min`;
    const horas = Math.floor(minutos / 60);
    const mins = Math.round(minutos % 60);
    return `${horas}h ${mins}m`;
  };

  const formatEstado = (estado: string) => {
    const nombres: Record<string, string> = {
      nuevo: 'Nuevo', contactado: 'Contactado', interesado: 'Interesado',
      negociando: 'Negociando', ganado: 'Ganado', perdido: 'Perdido', no_responde: 'No responde'
    };
    return nombres[estado] || estado;
  };

  const getColorEstado = (estado: string) => {
    const colores: Record<string, string> = {
      nuevo: 'bg-blue-500', contactado: 'bg-yellow-500', interesado: 'bg-green-400',
      negociando: 'bg-orange-500', ganado: 'bg-green-600', perdido: 'bg-red-500', no_responde: 'bg-gray-500'
    };
    return colores[estado] || 'bg-slate-400';
  };

  const PERIODOS = [
    { id: 'hoy' as PeriodoType, nombre: 'Hoy' },
    { id: 'semana' as PeriodoType, nombre: 'Semana' },
    { id: 'mes' as PeriodoType, nombre: 'Mes' },
    { id: 'todo' as PeriodoType, nombre: 'Todo' },
  ];

  // ============================================
  // EXPORTACIÓN
  // ============================================
  const exportarExcel = () => {
    setExportando(true);
    setShowExportMenu(false);
    try {
      const wb = XLSX.utils.book_new();
      if (tab === 'ventas') {
        const data = [
          ['Estadísticas Ventas', ''],
          ['Leads Hoy', statsVentas.leadsHoy],
          ['Leads Semana', statsVentas.leadsSemana],
          ['Leads Mes', statsVentas.leadsMes],
          ['CTWA', statsVentas.leadsCTWA],
          ['Directos', statsVentas.leadsDirectos],
          ['Conversiones', statsVentas.totalConversiones],
          ['Tasa Conversión', `${statsVentas.tasaConversion.toFixed(1)}%`],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Ventas');
      } else if (tab === 'administracion') {
        const data = [
          ['Estadísticas Administración', ''],
          ['Conversaciones', statsAdmin.conversacionesAtendidas],
          ['Mensajes', statsAdmin.mensajesTotales],
          ['T. Respuesta', statsAdmin.tiempoRespuestaPromedio ? formatTiempo(statsAdmin.tiempoRespuestaPromedio) : 'N/A'],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Administración');
      } else if (tab === 'alumnos') {
        const data = [
          ['Estadísticas Alumnos', ''],
          ['Conversaciones', statsAlumnos.conversacionesAtendidas],
          ['Mensajes', statsAlumnos.mensajesTotales],
          ['T. Respuesta', statsAlumnos.tiempoRespuestaPromedio ? formatTiempo(statsAlumnos.tiempoRespuestaPromedio) : 'N/A'],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Alumnos');
      } else if (tab === 'comunidad') {
        const data = [
          ['Estadísticas Comunidad', ''],
          ['Conversaciones', statsComunidad.conversacionesAtendidas],
          ['Mensajes', statsComunidad.mensajesTotales],
          ['T. Respuesta', statsComunidad.tiempoRespuestaPromedio ? formatTiempo(statsComunidad.tiempoRespuestaPromedio) : 'N/A'],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Comunidad');
      }
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `estadisticas_${tab}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exportando:', error);
    } finally {
      setExportando(false);
    }
  };

  // ============================================
  // VERIFICACIÓN DE ACCESO
  // ============================================
  if (permisosLoading || tab === null) {
    return (
      <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tieneAcceso) {
    return (
      <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Acceso Restringido</h2>
          <p className="text-slate-500 mb-4">No tenés permisos para ver las estadísticas.</p>
          <p className="text-sm text-slate-400">Usuario: {emailUsuario}</p>
        </div>
      </div>
    );
  }

  // ============================================
  // COMPONENTE: CARD DE ÁREA
  // ============================================
  const renderAreaTab = (stats: StatsArea, colorPrimario: string, colorBg: string) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Conversaciones</span>
            <div className={cn('p-2 rounded-xl', colorBg)}>
              <MessageSquare size={18} className={colorPrimario} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.conversacionesAtendidas}</p>
          <p className="text-xs text-slate-400 mt-1">{stats.conversacionesHoy} hoy</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Mensajes</span>
            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
              <Send size={18} className="text-blue-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.mensajesTotales}</p>
          <p className="text-xs text-slate-400 mt-1">{stats.mensajesHoy} hoy</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">T. Respuesta</span>
            <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-xl">
              <Timer size={18} className="text-amber-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">
            {stats.tiempoRespuestaPromedio ? formatTiempo(stats.tiempoRespuestaPromedio) : 'N/A'}
          </p>
          <p className="text-xs text-slate-400 mt-1">promedio</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Agentes Activos</span>
            <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-xl">
              <Users size={18} className="text-green-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.agentes.length}</p>
          <p className="text-xs text-slate-400 mt-1">con actividad</p>
        </div>
      </div>

      {/* Top Consultas */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle size={20} className={colorPrimario} />
          <h3 className="font-semibold text-slate-800 dark:text-white">Top Consultas</h3>
        </div>
        {stats.topConsultas.length > 0 ? (
          <div className="space-y-3">
            {stats.topConsultas.map((t, idx) => (
              <div key={t.opcion} className="flex items-center gap-3">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                  idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500')}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{t.label}</p>
                  <p className="text-xs text-slate-400">{t.opcion}</p>
                </div>
                <div className="text-right">
                  <p className={cn('text-lg font-bold', colorPrimario)}>{t.cantidad}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No hay datos de consultas en este período</p>
        )}
      </div>

      {/* Ranking Agentes */}
      {stats.agentes.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={20} className="text-amber-500" />
            <h3 className="font-semibold text-slate-800 dark:text-white">Ranking Agentes</h3>
          </div>
          <div className="space-y-4">
            {stats.agentes.map((agente, idx) => (
              <div key={agente.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white',
                  idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                  idx === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-600' :
                  'bg-gradient-to-br from-indigo-400 to-indigo-600')}>
                  {agente.nombre?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800 dark:text-white">{agente.nombre}</p>
                  <p className="text-xs text-slate-400">
                    {idx === 0 ? '🥇 Top' : idx === 1 ? '🥈 Segundo' : `#${idx + 1}`}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{agente.mensajesEnviados}</p>
                    <p className="text-xs text-slate-400">Msgs</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{agente.conversacionesAtendidas}</p>
                    <p className="text-xs text-slate-400">Atend.</p>
                  </div>
                  <div>
                    <p className={cn('text-lg font-bold', colorPrimario)}>{agente.conversacionesAsignadas}</p>
                    <p className="text-xs text-slate-400">Asign.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER PRINCIPAL
  // ============================================
  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 overflow-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Estadísticas</h1>
            <p className="text-sm text-slate-500 mt-1">Métricas de rendimiento por área</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={exportando}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                <Download size={16} className={exportando ? 'animate-bounce' : ''} />
                <span className="text-sm">Exportar</span>
                <ChevronDown size={14} />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10">
                  <button onClick={exportarExcel} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                    <FileSpreadsheet size={16} className="text-green-600" />
                    Excel (.xlsx)
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={refrescar}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <RefreshCw size={16} className={cn('text-slate-500', refreshing && 'animate-spin')} />
              <span className="text-sm text-slate-600 dark:text-slate-300">Actualizar</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-1 inline-flex gap-1 border border-slate-200 dark:border-slate-800 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  tab === t.id ? 'bg-indigo-500 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <t.icono size={16} />
                {t.nombre}
              </button>
            ))}
          </div>

          {/* Filtro de período */}
          {tab !== 'wsp4' && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-800">
                {PERIODOS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setPeriodo(p.id); setShowDatePicker(false); }}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-md transition-colors',
                      periodo === p.id ? 'bg-indigo-500 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    {p.nombre}
                  </button>
                ))}
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors border',
                    periodo === 'personalizado' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                  )}
                >
                  <CalendarRange size={14} />
                  Rango
                </button>
                {showDatePicker && (
                  <div className="absolute right-0 mt-2 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 w-72">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Desde</label>
                        <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white text-sm border-0" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Hasta</label>
                        <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white text-sm border-0" />
                      </div>
                      <button onClick={aplicarFechasPersonalizadas} disabled={!fechaDesde || !fechaHasta}
                        className="w-full py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 disabled:opacity-50">
                        Aplicar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* TAB: WSP4 */}
            {tab === 'wsp4' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-slate-500">Mensajes Hoy</span>
                      <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
                        <MessageSquare size={18} className="text-blue-500" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{statsWSP4.mensajesHoy}</p>
                    <p className="text-xs text-slate-400 mt-1">{statsWSP4.mensajesSemana} esta semana</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-slate-500">Conv. Activas</span>
                      <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-xl">
                        <Inbox size={18} className="text-green-500" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{statsWSP4.conversacionesActivas}</p>
                    <p className="text-xs text-slate-400 mt-1">{statsWSP4.conversacionesHoy} nuevas hoy</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-slate-500">Derivaciones Hoy</span>
                      <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-xl">
                        <GitBranch size={18} className="text-purple-500" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">
                      {statsWSP4.derivacionesHoy.reduce((sum, d) => sum + d.cantidad, 0)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">A otras áreas</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-slate-500">Autorespuestas</span>
                      <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-xl">
                        <Clock size={18} className="text-amber-500" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{statsWSP4.autorespuestasHoy}</p>
                    <p className="text-xs text-slate-400 mt-1">Enviadas hoy</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Derivaciones por Área (Hoy)</h3>
                  {statsWSP4.derivacionesHoy.length > 0 ? (
                    <div className="space-y-3">
                      {statsWSP4.derivacionesHoy.map((d) => (
                        <div key={d.area} className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-slate-600 dark:text-slate-300">{formatArea(d.area)}</span>
                              <span className="text-sm font-medium text-slate-800 dark:text-white">{d.cantidad}</span>
                            </div>
                            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${Math.min(100, (d.cantidad / Math.max(...statsWSP4.derivacionesHoy.map(x => x.cantidad))) * 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">No hay derivaciones hoy</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB: VENTAS */}
            {tab === 'ventas' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-slate-500">Leads Hoy</span>
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl">
                        <Users size={18} className="text-emerald-500" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{statsVentas.leadsHoy}</p>
                    <p className="text-xs text-slate-400 mt-1">{statsVentas.leadsSemana} esta semana</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-slate-500">Leads Mes</span>
                      <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
                        <TrendingUp size={18} className="text-blue-500" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{statsVentas.leadsMes}</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-slate-500">Conversiones</span>
                      <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-xl">
                        <Target size={18} className="text-green-500" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{statsVentas.totalConversiones}</p>
                    <p className="text-xs text-slate-400 mt-1">{statsVentas.tasaConversion.toFixed(1)}% tasa</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-slate-500">CTWA vs Directo</span>
                      <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-xl">
                        <BarChart3 size={18} className="text-purple-500" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{statsVentas.leadsCTWA} / {statsVentas.leadsDirectos}</p>
                    <p className="text-xs text-slate-400 mt-1">Anuncios / Orgánico</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-4">
                      <GraduationCap size={20} className="text-indigo-500" />
                      <h3 className="font-semibold text-slate-800 dark:text-white">Top Cursos Consultados</h3>
                    </div>
                    {statsVentas.topCursos.length > 0 ? (
                      <div className="space-y-3">
                        {statsVentas.topCursos.map((curso, idx) => (
                          <div key={curso.nombre} className="flex items-center gap-3">
                            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                              idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500')}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{curso.nombre}</p>
                            </div>
                            <p className="text-lg font-bold text-indigo-500">{curso.leads}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm">No hay datos</p>
                    )}
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-4">
                      <Award size={20} className="text-amber-500" />
                      <h3 className="font-semibold text-slate-800 dark:text-white">Top Anuncios CTWA</h3>
                    </div>
                    {statsVentas.topAnuncios.length > 0 ? (
                      <div className="space-y-3">
                        {statsVentas.topAnuncios.map((anuncio, idx) => (
                          <div key={anuncio.ad_id || idx} className="flex items-center gap-3">
                            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                              idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500')}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{anuncio.nombre}</p>
                              <p className="text-xs text-slate-400 truncate">ID: {anuncio.ad_id?.slice(-8) || 'N/A'}</p>
                            </div>
                            <p className="text-lg font-bold text-indigo-500">{anuncio.leads}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm">No hay datos</p>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Leads por Estado</h3>
                  {statsVentas.leadsPorEstado.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {statsVentas.leadsPorEstado.map(e => (
                        <div key={e.estado} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2">
                          <div className={cn('w-3 h-3 rounded-full', getColorEstado(e.estado))} />
                          <span className="text-sm text-slate-600 dark:text-slate-300">{formatEstado(e.estado)}</span>
                          <span className="text-sm font-bold text-slate-800 dark:text-white">{e.cantidad}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">No hay datos</p>
                  )}
                </div>

                {statsVentas.agentes.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy size={20} className="text-amber-500" />
                      <h3 className="font-semibold text-slate-800 dark:text-white">Ranking Agentes Ventas</h3>
                    </div>
                    <div className="space-y-4">
                      {statsVentas.agentes.map((agente, idx) => (
                        <div key={agente.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white',
                            idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                            idx === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-600' :
                            'bg-gradient-to-br from-indigo-400 to-indigo-600')}>
                            {agente.nombre?.[0]?.toUpperCase() || 'A'}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-800 dark:text-white">{agente.nombre}</p>
                            <p className="text-xs text-slate-400">
                              {idx === 0 ? '🥇 Top' : idx === 1 ? '🥈 Segundo' : `#${idx + 1}`}
                            </p>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                              <p className="text-lg font-bold text-slate-800 dark:text-white">{agente.mensajesEnviados}</p>
                              <p className="text-xs text-slate-400">Msgs</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-slate-800 dark:text-white">{agente.conversacionesAtendidas}</p>
                              <p className="text-xs text-slate-400">Atend.</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-indigo-600">{agente.conversacionesAsignadas}</p>
                              <p className="text-xs text-slate-400">Asign.</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-emerald-600">{agente.conversiones}</p>
                              <p className="text-xs text-slate-400">Conv.</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: ADMINISTRACION */}
            {tab === 'administracion' && renderAreaTab(statsAdmin, 'text-purple-500', 'bg-purple-100 dark:bg-purple-500/20')}

            {/* TAB: ALUMNOS */}
            {tab === 'alumnos' && renderAreaTab(statsAlumnos, 'text-green-500', 'bg-green-100 dark:bg-green-500/20')}

            {/* TAB: COMUNIDAD */}
            {tab === 'comunidad' && renderAreaTab(statsComunidad, 'text-pink-500', 'bg-pink-100 dark:bg-pink-500/20')}
          </>
        )}
      </div>
    </div>
  );
}
