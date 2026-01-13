'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import {
  MessageSquare, Users, Clock, TrendingUp, TrendingDown,
  Phone, Megaphone, UserCheck, RefreshCw, Download, BarChart3,
  Send, Inbox, GitBranch, Target, Award, Calendar, FileSpreadsheet,
  ArrowUp, ArrowDown, Minus, ShieldAlert, FileText, ChevronDown,
  Timer, Trophy, CalendarRange
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================
// CONTROL DE ACCESO
// ============================================
const EMAILS_ADMIN = [
  'ninadulcich@gmail.com',
  'asociacionpsi.gestion@gmail.com',
  'marfer1@gmail.com',
];

// ============================================
// TIPOS
// ============================================
type TabType = 'wsp4' | 'ventas_api' | 'agentes';
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
  topAnuncios: { nombre: string; ad_id: string; leads: number }[];
  autorespuestasHoy: number;
  conversiones: number;
}

interface StatsAgente {
  id: string;
  nombre: string;
  mensajesEnviados: number;
  mensajesAnterior: number;
  conversacionesAtendidas: number;
  conversacionesAsignadas: number;
  conversacionesAnterior: number;
  porLinea: { linea: string; mensajes: number }[];
  tiempoRespuestaPromedio: number | null;
  conversiones: number;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function EstadisticasPage() {
  const { user, profile } = useAuth();
  const emailUsuario = user?.email || '';
  const esAdmin = profile?.rol === 'admin';
  const tieneAcceso = esAdmin || EMAILS_ADMIN.includes(emailUsuario);

  const [tab, setTab] = useState<TabType>('wsp4');
  const [periodoAgentes, setPeriodoAgentes] = useState<PeriodoType>('semana');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [statsWSP4, setStatsWSP4] = useState<StatsWSP4>({
    mensajesHoy: 0,
    mensajesSemana: 0,
    conversacionesActivas: 0,
    conversacionesHoy: 0,
    derivacionesHoy: [],
    autorespuestasHoy: 0
  });

  const [statsVentas, setStatsVentas] = useState<StatsVentas>({
    leadsHoy: 0,
    leadsSemana: 0,
    leadsMes: 0,
    topAnuncios: [],
    autorespuestasHoy: 0,
    conversiones: 0
  });

  const [statsAgentes, setStatsAgentes] = useState<StatsAgente[]>([]);

  // Hook de permisos y emails del grupo
  const { permisos, loading: permisosLoading } = usePermissions();
  const [emailsGrupo, setEmailsGrupo] = useState<string[]>([]);

  // ============================================
  // FECHAS
  // ============================================
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
  const inicioAyer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1).toISOString();
  const inicioSemana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 7).toISOString();
  const inicioSemanaAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 14).toISOString();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
  const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).toISOString();

  const getFechasPeriodo = (periodo: PeriodoType) => {
    switch (periodo) {
      case 'hoy':
        return { inicio: inicioHoy, fin: null, inicioAnterior: inicioAyer, finAnterior: inicioHoy };
      case 'semana':
        return { inicio: inicioSemana, fin: null, inicioAnterior: inicioSemanaAnterior, finAnterior: inicioSemana };
      case 'mes':
        return { inicio: inicioMes, fin: null, inicioAnterior: inicioMesAnterior, finAnterior: inicioMes };
      case 'personalizado':
        if (fechaDesde && fechaHasta) {
          const desde = new Date(fechaDesde);
          const hasta = new Date(fechaHasta);
          hasta.setHours(23, 59, 59, 999);
          const duracion = hasta.getTime() - desde.getTime();
          const inicioAnterior = new Date(desde.getTime() - duracion);
          return {
            inicio: desde.toISOString(),
            fin: hasta.toISOString(),
            inicioAnterior: inicioAnterior.toISOString(),
            finAnterior: desde.toISOString()
          };
        }
        return { inicio: null, fin: null, inicioAnterior: null, finAnterior: null };
      default:
        return { inicio: null, fin: null, inicioAnterior: null, finAnterior: null };
    }
  };

  // ============================================
  // CARGA DE DATOS
  // ============================================
  const cargarStatsWSP4 = async () => {
    try {
      const { count: msgHoy } = await supabase
        .from('mensajes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', inicioHoy);

      const { count: msgSemana } = await supabase
        .from('mensajes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', inicioSemana);

      const { count: convActivas } = await supabase
        .from('conversaciones')
        .select('*', { count: 'exact', head: true })
        .or('linea_origen.eq.wsp4,linea_origen.is.null')
        .in('estado', ['activa', 'abierta', 'en_menu']);

      const { count: convHoy } = await supabase
        .from('conversaciones')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', inicioHoy);

      const { data: derivaciones } = await supabase
        .from('conversaciones')
        .select('area')
        .gte('ts_ultima_derivacion', inicioHoy)
        .not('area', 'is', null);

      const derivacionesAgrupadas: Record<string, number> = {};
      derivaciones?.forEach(d => {
        if (d.area && d.area !== 'wsp4') {
          derivacionesAgrupadas[d.area] = (derivacionesAgrupadas[d.area] || 0) + 1;
        }
      });

      const derivacionesArray = Object.entries(derivacionesAgrupadas)
        .map(([area, cantidad]) => ({ area, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);

      const { count: autoHoy } = await supabase
        .from('autorespuestas_enviadas')
        .select('*', { count: 'exact', head: true })
        .eq('linea', 'wsp4')
        .gte('created_at', inicioHoy);

      setStatsWSP4({
        mensajesHoy: msgHoy || 0,
        mensajesSemana: msgSemana || 0,
        conversacionesActivas: convActivas || 0,
        conversacionesHoy: convHoy || 0,
        derivacionesHoy: derivacionesArray,
        autorespuestasHoy: autoHoy || 0
      });
    } catch (error) {
      console.error('Error cargando stats WSP4:', error);
    }
  };

  const cargarStatsVentas = async () => {
    try {
      // Usar menu_sesiones como fuente (igual que Automatizaciones)
      const { count: leadsHoy } = await supabase
        .from('menu_sesiones')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', inicioHoy);

      const { count: leadsSemana } = await supabase
        .from('menu_sesiones')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', inicioSemana);

      const { count: leadsMes } = await supabase
        .from('menu_sesiones')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', inicioMes);

      // Top anuncios: contar sesiones por anuncio
      const { data: anunciosConfig } = await supabase
        .from('config_cursos_ctwa')
        .select('id, nombre, ad_id, meta_headline, curso_id')
        .eq('activo', true);

      const topAnuncios: { nombre: string; ad_id: string; leads: number }[] = [];
      
      if (anunciosConfig) {
        for (const anuncio of anunciosConfig) {
          const { count } = await supabase
            .from('menu_sesiones')
            .select('*', { count: 'exact', head: true })
            .eq('curso_id', anuncio.curso_id)
            .eq('origen', 'ctwa');
          
          topAnuncios.push({
            nombre: anuncio.meta_headline || anuncio.nombre || 'Sin nombre',
            ad_id: anuncio.ad_id || '',
            leads: count || 0
          });
        }
        topAnuncios.sort((a, b) => b.leads - a.leads);
      }

      const { count: autoHoy } = await supabase
        .from('autorespuestas_enviadas')
        .select('*', { count: 'exact', head: true })
        .eq('linea', 'ventas_api')
        .gte('created_at', inicioHoy);

      const { count: conversiones } = await supabase
        .from('contactos')
        .select('*', { count: 'exact', head: true })
        .eq('resultado', 'INS');

      setStatsVentas({
        leadsHoy: leadsHoy || 0,
        leadsSemana: leadsSemana || 0,
        leadsMes: leadsMes || 0,
        topAnuncios: topAnuncios.slice(0, 5),
        autorespuestasHoy: autoHoy || 0,
        conversiones: conversiones || 0
      });
    } catch (error) {
      console.error('Error cargando stats Ventas:', error);
    }
  };

  const cargarStatsAgentes = async () => {
    try {
      const { inicio, fin, inicioAnterior, finAnterior } = getFechasPeriodo(periodoAgentes);

      let queryActual = supabase
        .from('mensajes')
        .select('remitente_id, remitente_nombre, conversacion_id, created_at')
        .eq('direccion', 'saliente')
        .eq('remitente_tipo', 'agente')
        .not('remitente_id', 'is', null);

      if (inicio) {
        queryActual = queryActual.gte('created_at', inicio);
      }
      if (fin) {
        queryActual = queryActual.lte('created_at', fin);
      }

      const { data: mensajesActual } = await queryActual;

      let mensajesAnterior: typeof mensajesActual = [];
      if (inicioAnterior && finAnterior) {
        const { data } = await supabase
          .from('mensajes')
          .select('remitente_id, remitente_nombre, conversacion_id, created_at')
          .eq('direccion', 'saliente')
          .eq('remitente_tipo', 'agente')
          .not('remitente_id', 'is', null)
          .gte('created_at', inicioAnterior)
          .lt('created_at', finAnterior);
        mensajesAnterior = data || [];
      }

      const convIds = [...new Set(mensajesActual?.map(m => m.conversacion_id) || [])];
      const { data: conversaciones } = await supabase
        .from('conversaciones')
        .select('id, linea_origen, contacto_id')
        .in('id', convIds.length > 0 ? convIds : ['none']);

      const convLineaMap: Record<string, string> = {};
      const convContactoMap: Record<string, string> = {};
      conversaciones?.forEach(c => {
        convLineaMap[c.id] = c.linea_origen || 'wsp4';
        if (c.contacto_id) convContactoMap[c.id] = c.contacto_id;
      });

      const contactoIds = [...new Set(Object.values(convContactoMap))];
      const { data: contactosGanados } = await supabase
        .from('contactos')
        .select('id')
        .in('id', contactoIds.length > 0 ? contactoIds : ['none'])
        .eq('resultado', 'INS');

      const contactosGanadosSet = new Set(contactosGanados?.map(c => c.id) || []);

      // NUEVO: Obtener conversaciones ASIGNADAS a cada agente
      const { data: convsAsignadas } = await supabase
        .from('conversaciones')
        .select('id, asignado_a')
        .not('asignado_a', 'is', null)
        .in('estado', ['activa', 'abierta', 'en_menu', 'derivada']);

      const convsAsignadasPorAgente: Record<string, number> = {};
      convsAsignadas?.forEach(c => {
        if (c.asignado_a) {
          convsAsignadasPorAgente[c.asignado_a] = (convsAsignadasPorAgente[c.asignado_a] || 0) + 1;
        }
      });

      let queryEntrantes = supabase
        .from('mensajes')
        .select('conversacion_id, created_at')
        .eq('direccion', 'entrante')
        .in('conversacion_id', convIds.length > 0 ? convIds : ['none'])
        .order('created_at', { ascending: true });

      const { data: mensajesEntrantes } = await queryEntrantes;

      const primerMensajeEntrante: Record<string, string> = {};
      mensajesEntrantes?.forEach(m => {
        if (!primerMensajeEntrante[m.conversacion_id]) {
          primerMensajeEntrante[m.conversacion_id] = m.created_at;
        }
      });

      if (!mensajesActual) {
        setStatsAgentes([]);
        return;
      }

      const agentesMap: Record<string, {
        nombre: string;
        mensajes: number;
        convs: Set<string>;
        porLinea: Record<string, number>;
        tiemposRespuesta: number[];
        conversiones: number;
        primerRespuestaPorConv: Record<string, string>;
      }> = {};

      mensajesActual.forEach(m => {
        if (m.remitente_id) {
          if (!agentesMap[m.remitente_id]) {
            agentesMap[m.remitente_id] = {
              nombre: m.remitente_nombre || 'Agente',
              mensajes: 0,
              convs: new Set(),
              porLinea: {},
              tiemposRespuesta: [],
              conversiones: 0,
              primerRespuestaPorConv: {}
            };
          }
          agentesMap[m.remitente_id].mensajes++;
          agentesMap[m.remitente_id].convs.add(m.conversacion_id);

          const linea = convLineaMap[m.conversacion_id] || 'otros';
          agentesMap[m.remitente_id].porLinea[linea] = (agentesMap[m.remitente_id].porLinea[linea] || 0) + 1;

          if (!agentesMap[m.remitente_id].primerRespuestaPorConv[m.conversacion_id]) {
            agentesMap[m.remitente_id].primerRespuestaPorConv[m.conversacion_id] = m.created_at;
          }
        }
      });

      Object.entries(agentesMap).forEach(([agenteId, data]) => {
        Object.entries(data.primerRespuestaPorConv).forEach(([convId, respuestaTime]) => {
          const entranteTime = primerMensajeEntrante[convId];
          if (entranteTime) {
            const diffMs = new Date(respuestaTime).getTime() - new Date(entranteTime).getTime();
            if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
              data.tiemposRespuesta.push(diffMs / 1000 / 60);
            }
          }
        });

        data.convs.forEach(convId => {
          const contactoId = convContactoMap[convId];
          if (contactoId && contactosGanadosSet.has(contactoId)) {
            data.conversiones++;
          }
        });
      });

      const anteriorMap: Record<string, { mensajes: number; convs: Set<string> }> = {};
      mensajesAnterior?.forEach(m => {
        if (m.remitente_id) {
          if (!anteriorMap[m.remitente_id]) {
            anteriorMap[m.remitente_id] = { mensajes: 0, convs: new Set() };
          }
          anteriorMap[m.remitente_id].mensajes++;
          anteriorMap[m.remitente_id].convs.add(m.conversacion_id);
        }
      });

      const agentesStats: StatsAgente[] = Object.entries(agentesMap).map(([id, data]) => {
        const tiempoPromedio = data.tiemposRespuesta.length > 0
          ? data.tiemposRespuesta.reduce((a, b) => a + b, 0) / data.tiemposRespuesta.length
          : null;

        return {
          id,
          nombre: data.nombre,
          mensajesEnviados: data.mensajes,
          mensajesAnterior: anteriorMap[id]?.mensajes || 0,
          conversacionesAtendidas: data.convs.size,
          conversacionesAsignadas: convsAsignadasPorAgente[id] || 0,
          conversacionesAnterior: anteriorMap[id]?.convs.size || 0,
          porLinea: Object.entries(data.porLinea)
            .map(([linea, mensajes]) => ({ linea, mensajes }))
            .sort((a, b) => b.mensajes - a.mensajes),
          tiempoRespuestaPromedio: tiempoPromedio,
          conversiones: data.conversiones
        };
      });

      agentesStats.sort((a, b) => b.mensajesEnviados - a.mensajesEnviados);
      // Filtrar según rol: admin ve todos, agente ve solo sus métricas
      const statsFiltradas = esAdmin ? agentesStats : agentesStats.filter(a => a.id === emailUsuario);
      setStatsAgentes(statsFiltradas);
    } catch (error) {
      console.error('Error cargando stats Agentes:', error);
    }
  };

  const cargarTodo = async () => {
    setLoading(true);
    await Promise.all([cargarStatsWSP4(), cargarStatsVentas(), cargarStatsAgentes()]);
    setLoading(false);
  };

  const refrescar = async () => {
    setRefreshing(true);
    await cargarTodo();
    setRefreshing(false);
  };

  useEffect(() => {
    if (tieneAcceso) {
      cargarTodo();
    } else {
      setLoading(false);
    }
  }, [tieneAcceso]);

  useEffect(() => {
    if (tieneAcceso && periodoAgentes !== 'personalizado') {
      cargarStatsAgentes();
    }
  }, [periodoAgentes]);

  const aplicarFechasPersonalizadas = () => {
    if (fechaDesde && fechaHasta) {
      setPeriodoAgentes('personalizado');
      setShowDatePicker(false);
      cargarStatsAgentes();
    }
  };

  // ============================================
  // EXPORTACIÓN
  // ============================================
  const exportarExcel = () => {
    setExportando(true);
    setShowExportMenu(false);
    try {
      const wb = XLSX.utils.book_new();

      const wsp4Data = [
        ['Estadísticas WSP4 Router', ''],
        ['Fecha de exportación', new Date().toLocaleString('es-AR')],
        [''],
        ['Métrica', 'Valor'],
        ['Mensajes Hoy', statsWSP4.mensajesHoy],
        ['Mensajes Semana', statsWSP4.mensajesSemana],
        ['Conversaciones Activas', statsWSP4.conversacionesActivas],
        ['Conversaciones Hoy', statsWSP4.conversacionesHoy],
        ['Autorespuestas Hoy', statsWSP4.autorespuestasHoy],
        [''],
        ['Derivaciones por Área', ''],
        ...statsWSP4.derivacionesHoy.map(d => [formatArea(d.area), d.cantidad])
      ];
      const wsWSP4 = XLSX.utils.aoa_to_sheet(wsp4Data);
      XLSX.utils.book_append_sheet(wb, wsWSP4, 'WSP4 Router');

      const ventasData = [
        ['Estadísticas Ventas API', ''],
        ['Fecha de exportación', new Date().toLocaleString('es-AR')],
        [''],
        ['Métrica', 'Valor'],
        ['Leads Hoy', statsVentas.leadsHoy],
        ['Leads Semana', statsVentas.leadsSemana],
        ['Leads Mes', statsVentas.leadsMes],
        ['Conversiones Totales', statsVentas.conversiones],
        ['Autorespuestas Hoy', statsVentas.autorespuestasHoy],
        [''],
        ['Top 5 Anuncios', 'Leads'],
        ...statsVentas.topAnuncios.map(a => [a.nombre, a.leads])
      ];
      const wsVentas = XLSX.utils.aoa_to_sheet(ventasData);
      XLSX.utils.book_append_sheet(wb, wsVentas, 'Ventas API');

      const periodoNombre = getPeriodoNombre();
      const agentesData = [
        ['Rendimiento por Agente', ''],
        ['Período', periodoNombre],
        ['Fecha de exportación', new Date().toLocaleString('es-AR')],
        [''],
        ['Agente', 'Mensajes', 'Conv. Atendidas', 'Conv. Asignadas', 'Promedio', 'T. Respuesta', 'Conversiones', 'Variación'],
        ...statsAgentes.map(a => [
          a.nombre,
          a.mensajesEnviados,
          a.conversacionesAtendidas,
          a.conversacionesAsignadas,
          a.conversacionesAtendidas > 0 ? (a.mensajesEnviados / a.conversacionesAtendidas).toFixed(1) : '0',
          a.tiempoRespuestaPromedio ? formatTiempo(a.tiempoRespuestaPromedio) : 'N/A',
          a.conversiones,
          a.mensajesAnterior > 0 ? `${(((a.mensajesEnviados - a.mensajesAnterior) / a.mensajesAnterior) * 100).toFixed(0)}%` : 'N/A'
        ])
      ];
      const wsAgentes = XLSX.utils.aoa_to_sheet(agentesData);
      XLSX.utils.book_append_sheet(wb, wsAgentes, 'Agentes');

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `estadisticas_psi_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exportando Excel:', error);
      alert('Error al exportar Excel');
    } finally {
      setExportando(false);
    }
  };

  const exportarCSV = () => {
    setExportando(true);
    setShowExportMenu(false);
    try {
      let csv = 'Estadísticas PSI Vision Hub\n';
      csv += `Fecha de exportación,${new Date().toLocaleString('es-AR')}\n\n`;

      csv += 'WSP4 ROUTER\n';
      csv += `Mensajes Hoy,${statsWSP4.mensajesHoy}\n`;
      csv += `Mensajes Semana,${statsWSP4.mensajesSemana}\n`;
      csv += `Conversaciones Activas,${statsWSP4.conversacionesActivas}\n`;
      csv += `Conversaciones Hoy,${statsWSP4.conversacionesHoy}\n`;
      csv += `Autorespuestas Hoy,${statsWSP4.autorespuestasHoy}\n\n`;

      csv += 'Derivaciones por Área\n';
      statsWSP4.derivacionesHoy.forEach(d => {
        csv += `${formatArea(d.area)},${d.cantidad}\n`;
      });
      csv += '\n';

      csv += 'VENTAS API\n';
      csv += `Leads Hoy,${statsVentas.leadsHoy}\n`;
      csv += `Leads Semana,${statsVentas.leadsSemana}\n`;
      csv += `Leads Mes,${statsVentas.leadsMes}\n`;
      csv += `Conversiones,${statsVentas.conversiones}\n`;
      csv += `Autorespuestas Hoy,${statsVentas.autorespuestasHoy}\n\n`;

      csv += 'RENDIMIENTO POR AGENTE\n';
      csv += 'Agente,Mensajes,Conv. Atendidas,Conv. Asignadas,Promedio,T. Respuesta,Conversiones,Variación\n';
      statsAgentes.forEach(a => {
        const variacion = a.mensajesAnterior > 0
          ? `${(((a.mensajesEnviados - a.mensajesAnterior) / a.mensajesAnterior) * 100).toFixed(0)}%`
          : 'N/A';
        const tiempo = a.tiempoRespuestaPromedio ? formatTiempo(a.tiempoRespuestaPromedio) : 'N/A';
        csv += `"${a.nombre}",${a.mensajesEnviados},${a.conversacionesAtendidas},${a.conversacionesAsignadas},${a.conversacionesAtendidas > 0 ? (a.mensajesEnviados / a.conversacionesAtendidas).toFixed(1) : '0'},${tiempo},${a.conversiones},${variacion}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, `estadisticas_psi_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      console.error('Error exportando CSV:', error);
      alert('Error al exportar CSV');
    } finally {
      setExportando(false);
    }
  };

  const exportarPDF = () => {
    setExportando(true);
    setShowExportMenu(false);
    try {
      const doc = new jsPDF();
      const fechaExport = new Date().toLocaleString('es-AR');

      doc.setFontSize(20);
      doc.setTextColor(79, 70, 229);
      doc.text('Estadísticas PSI Vision Hub', 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generado: ${fechaExport}`, 14, 28);

      let yPos = 40;

      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175);
      doc.text('WSP4 Router', 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Métrica', 'Valor']],
        body: [
          ['Mensajes Hoy', statsWSP4.mensajesHoy.toString()],
          ['Mensajes Semana', statsWSP4.mensajesSemana.toString()],
          ['Conversaciones Activas', statsWSP4.conversacionesActivas.toString()],
          ['Conversaciones Hoy', statsWSP4.conversacionesHoy.toString()],
          ['Autorespuestas Hoy', statsWSP4.autorespuestasHoy.toString()],
        ],
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      doc.setFontSize(14);
      doc.setTextColor(16, 185, 129);
      doc.text('Ventas API', 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Métrica', 'Valor']],
        body: [
          ['Leads Hoy', statsVentas.leadsHoy.toString()],
          ['Leads Semana', statsVentas.leadsSemana.toString()],
          ['Leads Mes', statsVentas.leadsMes.toString()],
          ['Conversiones Totales', statsVentas.conversiones.toString()],
        ],
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] },
        margin: { left: 14, right: 14 },
      });

      doc.addPage();

      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229);
      doc.text(`Rendimiento por Agente (${getPeriodoNombre()})`, 14, 20);

      if (statsAgentes.length > 0) {
        autoTable(doc, {
          startY: 28,
          head: [['#', 'Agente', 'Msgs', 'Atend.', 'Asign.', 'T.Resp', 'Conv.', 'Var.']],
          body: statsAgentes.map((a, i) => {
            const variacion = a.mensajesAnterior > 0
              ? `${(((a.mensajesEnviados - a.mensajesAnterior) / a.mensajesAnterior) * 100).toFixed(0)}%`
              : 'N/A';
            const tiempo = a.tiempoRespuestaPromedio ? formatTiempo(a.tiempoRespuestaPromedio) : 'N/A';
            return [
              (i + 1).toString(),
              a.nombre,
              a.mensajesEnviados.toString(),
              a.conversacionesAtendidas.toString(),
              a.conversacionesAsignadas.toString(),
              tiempo,
              a.conversiones.toString(),
              variacion
            ];
          }),
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229] },
          margin: { left: 14, right: 14 },
        });
      }

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`PSI Vision Hub - Página ${i} de ${pageCount}`, 14, doc.internal.pageSize.height - 10);
      }

      doc.save(`estadisticas_psi_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exportando PDF:', error);
      alert('Error al exportar PDF');
    } finally {
      setExportando(false);
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const formatArea = (area: string) => {
    const nombres: Record<string, string> = {
      ventas: 'Ventas',
      ventas_api: 'Ventas API',
      administracion: 'Administración',
      alumnos: 'Alumnos',
      comunidad: 'Comunidad',
      wsp4: 'WSP4'
    };
    return nombres[area] || area;
  };

  const formatLinea = (linea: string) => {
    const nombres: Record<string, string> = {
      wsp4: 'WSP4',
      ventas_api: 'Ventas API',
      ventas: 'Ventas',
      administracion: 'Admin',
      alumnos: 'Alumnos',
      comunidad: 'Comunidad'
    };
    return nombres[linea] || linea;
  };

  const formatTiempo = (minutos: number): string => {
    if (minutos < 1) return '< 1 min';
    if (minutos < 60) return `${Math.round(minutos)} min`;
    const horas = Math.floor(minutos / 60);
    const mins = Math.round(minutos % 60);
    return `${horas}h ${mins}m`;
  };

  const getPeriodoNombre = () => {
    if (periodoAgentes === 'personalizado' && fechaDesde && fechaHasta) {
      return `${fechaDesde} a ${fechaHasta}`;
    }
    const nombres: Record<string, string> = {
      hoy: 'Hoy',
      semana: 'Última Semana',
      mes: 'Este Mes',
      todo: 'Todo el tiempo'
    };
    return nombres[periodoAgentes] || '';
  };

  const getVariacion = (actual: number, anterior: number) => {
    if (anterior === 0) return { valor: 0, tipo: 'igual' as const };
    const variacion = ((actual - anterior) / anterior) * 100;
    return {
      valor: Math.abs(variacion),
      tipo: variacion > 0 ? 'subio' as const : variacion < 0 ? 'bajo' as const : 'igual' as const
    };
  };

  const getColorLinea = (linea: string) => {
    const colores: Record<string, string> = {
      wsp4: 'bg-blue-500',
      ventas_api: 'bg-emerald-500',
      ventas: 'bg-green-500',
      administracion: 'bg-purple-500',
      alumnos: 'bg-amber-500',
      comunidad: 'bg-pink-500'
    };
    return colores[linea] || 'bg-slate-400';
  };

  const TABS = [
    { id: 'wsp4' as TabType, nombre: 'WSP4 Router', icono: Phone },
    { id: 'ventas_api' as TabType, nombre: 'Ventas API', icono: Megaphone },
    { id: 'agentes' as TabType, nombre: 'Por Agente', icono: UserCheck },
  ];

  const PERIODOS = [
    { id: 'hoy' as PeriodoType, nombre: 'Hoy' },
    { id: 'semana' as PeriodoType, nombre: 'Semana' },
    { id: 'mes' as PeriodoType, nombre: 'Mes' },
    { id: 'todo' as PeriodoType, nombre: 'Todo' },
  ];

  // ============================================
  // VERIFICACIÓN DE ACCESO
  // ============================================
  if (!tieneAcceso) {
    return (
      <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Acceso Restringido</h2>
          <p className="text-slate-500 mb-4">
            No tenés permisos para ver las estadísticas del sistema.
          </p>
          <p className="text-sm text-slate-400">
            Usuario: {emailUsuario || 'No identificado'}
          </p>
        </div>
      </div>
    );
  }

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
            <p className="text-sm text-slate-500 mt-1">Métricas de rendimiento del sistema</p>
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
                  <button
                    onClick={exportarExcel}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-t-lg"
                  >
                    <FileSpreadsheet size={16} className="text-green-600" />
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={exportarCSV}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <FileSpreadsheet size={16} className="text-blue-600" />
                    CSV (.csv)
                  </button>
                  <button
                    onClick={exportarPDF}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-b-lg"
                  >
                    <FileText size={16} className="text-red-600" />
                    PDF (.pdf)
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
        <div className="bg-white dark:bg-slate-900 rounded-xl p-1 mb-6 inline-flex gap-1 border border-slate-200 dark:border-slate-800">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                tab === t.id
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <t.icono size={16} />
              {t.nombre}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ============ TAB: WSP4 ============ */}
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
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{
                                  width: `${Math.min(100, (d.cantidad / Math.max(...statsWSP4.derivacionesHoy.map(x => x.cantidad))) * 100)}%`
                                }}
                              />
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

            {/* ============ TAB: VENTAS API ============ */}
            {tab === 'ventas_api' && (
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
                    <p className="text-xs text-slate-400 mt-1">De Meta Ads</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-slate-500">Leads Semana</span>
                      <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
                        <TrendingUp size={18} className="text-blue-500" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{statsVentas.leadsSemana}</p>
                    <p className="text-xs text-slate-400 mt-1">Últimos 7 días</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-slate-500">Leads Mes</span>
                      <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-xl">
                        <BarChart3 size={18} className="text-purple-500" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{statsVentas.leadsMes}</p>
                    <p className="text-xs text-slate-400 mt-1">Este mes</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-slate-500">Conversiones</span>
                      <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-xl">
                        <Target size={18} className="text-green-500" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{statsVentas.conversiones}</p>
                    <p className="text-xs text-slate-400 mt-1">Total ganados</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-4">
                    <Award size={20} className="text-amber-500" />
                    <h3 className="font-semibold text-slate-800 dark:text-white">Top 5 Anuncios</h3>
                  </div>
                  {statsVentas.topAnuncios.length > 0 ? (
                    <div className="space-y-3">
                      {statsVentas.topAnuncios.map((anuncio, idx) => (
                        <div key={anuncio.ad_id || idx} className="flex items-center gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                            idx === 0 ? 'bg-amber-100 text-amber-600' :
                            idx === 1 ? 'bg-slate-200 text-slate-600' :
                            idx === 2 ? 'bg-orange-100 text-orange-600' :
                            'bg-slate-100 text-slate-500'
                          )}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{anuncio.nombre}</p>
                            <p className="text-xs text-slate-400 truncate">ID: {anuncio.ad_id?.slice(-8) || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-indigo-500">{anuncio.leads}</p>
                            <p className="text-xs text-slate-400">leads</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">No hay datos de anuncios</p>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white">Autorespuestas Hoy</h3>
                      <p className="text-sm text-slate-500 mt-1">Mensajes automáticos enviados por Ventas API</p>
                    </div>
                    <p className="text-3xl font-bold text-indigo-500">{statsVentas.autorespuestasHoy}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ============ TAB: POR AGENTE ============ */}
            {tab === 'agentes' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    <span className="text-sm text-slate-500">Período:</span>
                    {periodoAgentes === 'personalizado' && fechaDesde && fechaHasta && (
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        {fechaDesde} a {fechaHasta}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-800">
                      {PERIODOS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setPeriodoAgentes(p.id);
                            setShowDatePicker(false);
                          }}
                          className={cn(
                            'px-3 py-1.5 text-sm rounded-md transition-colors',
                            periodoAgentes === p.id
                              ? 'bg-indigo-500 text-white'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                          periodoAgentes === 'personalizado'
                            ? 'bg-indigo-500 text-white border-indigo-500'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                        )}
                      >
                        <CalendarRange size={14} />
                        Personalizado
                      </button>
                      {showDatePicker && (
                        <div className="absolute right-0 mt-2 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 w-72">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">Seleccionar rango</p>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Desde</label>
                              <input
                                type="date"
                                value={fechaDesde}
                                onChange={(e) => setFechaDesde(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white text-sm border-0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Hasta</label>
                              <input
                                type="date"
                                value={fechaHasta}
                                onChange={(e) => setFechaHasta(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white text-sm border-0"
                              />
                            </div>
                            <button
                              onClick={aplicarFechasPersonalizadas}
                              disabled={!fechaDesde || !fechaHasta}
                              className="w-full py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Aplicar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {statsAgentes.length > 0 ? (
                  <div className="grid gap-4">
                    {statsAgentes.map((agente, idx) => {
                      const varMensajes = getVariacion(agente.mensajesEnviados, agente.mensajesAnterior);

                      return (
                        <div key={agente.id} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white',
                                idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                                idx === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-600' :
                                idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                                'bg-gradient-to-br from-indigo-400 to-indigo-600'
                              )}>
                                {agente.nombre?.[0]?.toUpperCase() || 'A'}
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-800 dark:text-white text-lg">{agente.nombre}</h3>
                                <p className="text-xs text-slate-400">
                                  {idx === 0 ? '🥇 Top performer' : idx === 1 ? '🥈 Segundo lugar' : idx === 2 ? '🥉 Tercer lugar' : `#${idx + 1}`}
                                </p>
                              </div>
                            </div>
                            {periodoAgentes !== 'todo' && varMensajes.tipo !== 'igual' && (
                              <div className={cn(
                                'flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                                varMensajes.tipo === 'subio' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                                'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                              )}>
                                {varMensajes.tipo === 'subio' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                {varMensajes.valor.toFixed(0)}%
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                              <div className="flex items-center gap-2 text-slate-500 mb-1">
                                <Send size={14} />
                                <span className="text-xs">Mensajes</span>
                              </div>
                              <p className="text-xl font-bold text-slate-800 dark:text-white">{agente.mensajesEnviados}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                              <div className="flex items-center gap-2 text-slate-500 mb-1">
                                <MessageSquare size={14} />
                                <span className="text-xs">Atendidas</span>
                              </div>
                              <p className="text-xl font-bold text-slate-800 dark:text-white">{agente.conversacionesAtendidas}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                              <div className="flex items-center gap-2 text-slate-500 mb-1">
                                <Inbox size={14} />
                                <span className="text-xs">Asignadas</span>
                              </div>
                              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{agente.conversacionesAsignadas}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                              <div className="flex items-center gap-2 text-slate-500 mb-1">
                                <BarChart3 size={14} />
                                <span className="text-xs">Promedio</span>
                              </div>
                              <p className="text-xl font-bold text-slate-800 dark:text-white">
                                {agente.conversacionesAtendidas > 0
                                  ? (agente.mensajesEnviados / agente.conversacionesAtendidas).toFixed(1)
                                  : '0'}
                              </p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                              <div className="flex items-center gap-2 text-slate-500 mb-1">
                                <Timer size={14} />
                                <span className="text-xs">T. Resp.</span>
                              </div>
                              <p className="text-xl font-bold text-slate-800 dark:text-white">
                                {agente.tiempoRespuestaPromedio
                                  ? formatTiempo(agente.tiempoRespuestaPromedio)
                                  : 'N/A'}
                              </p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                              <div className="flex items-center gap-2 text-slate-500 mb-1">
                                <Trophy size={14} />
                                <span className="text-xs">Conv.</span>
                              </div>
                              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{agente.conversiones}</p>
                            </div>
                          </div>

                          {agente.porLinea.length > 0 && (
                            <div>
                              <p className="text-xs text-slate-500 mb-2">Actividad por línea</p>
                              <div className="flex gap-2 flex-wrap">
                                {agente.porLinea.map(l => (
                                  <div key={l.linea} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-1.5">
                                    <div className={cn('w-2 h-2 rounded-full', getColorLinea(l.linea))} />
                                    <span className="text-sm text-slate-600 dark:text-slate-300">{formatLinea(l.linea)}</span>
                                    <span className="text-sm font-semibold text-slate-800 dark:text-white">{l.mensajes}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200 dark:border-slate-800 text-center">
                    <UserCheck size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-slate-500">No hay datos de agentes en este período</p>
                    <p className="text-sm text-slate-400 mt-1">Los datos aparecerán cuando los agentes envíen mensajes</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
