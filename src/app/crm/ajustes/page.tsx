'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCRMStore } from '@/stores/crm-store';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationContext } from '@/providers/NotificationProvider';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { 
  User, Bell, MessageSquare, Shield, Database, ChevronRight, Clock, 
  Loader2, Phone, Eye, EyeOff, Check, ExternalLink, Menu, Plus, 
  ChevronUp, ChevronDown, Edit2, Trash2, Save, X
} from 'lucide-react';

const SECCIONES = [
  { id: 'perfil', nombre: 'Mi Perfil', icono: User, descripcion: 'Nombre y preferencias' },
  { id: 'notificaciones', nombre: 'Notificaciones', icono: Bell, descripcion: 'Sonidos y alertas' },
  { id: 'menu-router', nombre: 'Menú Router WSP4', icono: Menu, descripcion: 'Configurar menú interactivo' },
  { id: 'autorespuestas', nombre: 'Autorespuestas', icono: Clock, descripcion: 'Mensajes automáticos por horario' },
  { id: 'respuestas', nombre: 'Respuestas Rápidas', icono: MessageSquare, descripcion: 'Plantillas de mensajes' },
  { id: 'seguridad', nombre: 'Seguridad', icono: Shield, descripcion: 'Cambiar contraseña' },
  { id: 'datos', nombre: 'Datos y Exportación', icono: Database, descripcion: 'Estadísticas y reportes' },
];

const LINEAS_AUTORESPUESTA = [
  { id: 'ventas_api', nombre: 'Ventas API', descripcion: 'Leads de Meta Ads' },
  { id: 'wsp4', nombre: 'WSP4 Router', descripcion: 'Canal principal' },
];

interface ConfigAutorespuesta {
  id: string;
  linea: string;
  activo: boolean;
  cooldown_horas: number;
  no_enviar_si_agente_respondio_min: number;
  mensaje_franja_1: string;
  mensaje_franja_2: string;
  mensaje_franja_3: string;
  mensaje_franja_4: string;
  corte_activo: boolean;
  corte_timestamp: string | null;
  corte_usuario_nombre: string | null;
}

interface MenuConfig {
  id: string;
  nombre: string;
  header: string;
  body: string;
  footer: string;
  button_text: string;
  tipo_menu: string;
  activo: boolean;
  parent_menu_id?: string;
}

interface MenuOpcion {
  id: string;
  menu_config_id: string;
  orden: number;
  opcion_id: string;
  emoji: string;
  titulo: string;
  descripcion: string;
  tipo_accion: string;
  submenu_id?: string;
  area_destino?: string;
  subetiqueta?: string;
  mensaje_contexto?: string;
  activo: boolean;
}

export default function AjustesPage() {
  const router = useRouter();
  const { darkMode, toggleDarkMode, usuario, setUsuario } = useCRMStore();
  const { updatePassword } = useAuth();
  const { permissionStatus, requestPermission, isSupported } = useNotificationContext();
  const [seccionActiva, setSeccionActiva] = useState('perfil');

  // Estados para perfil
  const [nombrePerfil, setNombrePerfil] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [perfilGuardado, setPerfilGuardado] = useState(false);

  // Estados para seguridad
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordExito, setPasswordExito] = useState(false);

  // Estados para notificaciones
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopEnabled, setDesktopEnabled] = useState(false);
  const [metaAlertsEnabled, setMetaAlertsEnabled] = useState(true);

  // Estados para autorespuestas
  const [lineaSeleccionada, setLineaSeleccionada] = useState('ventas_api');
  const [configAuto, setConfigAuto] = useState<ConfigAutorespuesta | null>(null);
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [savingAuto, setSavingAuto] = useState(false);
  const [cortando, setCortando] = useState(false);

  // Estados para menú router
  const [menus, setMenus] = useState<MenuConfig[]>([]);
  const [opciones, setOpciones] = useState<MenuOpcion[]>([]);
  const [menuSeleccionado, setMenuSeleccionado] = useState<string>('');
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);
  const [editandoMenu, setEditandoMenu] = useState<MenuConfig | null>(null);
  const [editandoOpcion, setEditandoOpcion] = useState<MenuOpcion | null>(null);
  const [nuevaOpcion, setNuevaOpcion] = useState(false);

  // Cargar nombre del perfil
  useEffect(() => {
    if (usuario?.nombre) {
      setNombrePerfil(usuario.nombre);
    }
  }, [usuario]);

  // Cargar preferencias de localStorage
  useEffect(() => {
    const savedSound = localStorage.getItem('psi_notification_sound');
    const savedDesktop = localStorage.getItem('psi_notification_desktop');
    const savedMeta = localStorage.getItem('psi_notification_meta');

    if (savedSound !== null) setSoundEnabled(savedSound === 'true');
    if (savedDesktop !== null) setDesktopEnabled(savedDesktop === 'true');
    if (savedMeta !== null) setMetaAlertsEnabled(savedMeta === 'true');

    if (permissionStatus === 'granted') {
      setDesktopEnabled(true);
      localStorage.setItem('psi_notification_desktop', 'true');
    }
  }, [permissionStatus]);

  // Cargar configuración de autorespuestas cuando cambia la sección o línea
  useEffect(() => {
    if (seccionActiva === 'autorespuestas') {
      cargarConfigAutorespuestas(lineaSeleccionada);
    }
  }, [seccionActiva, lineaSeleccionada]);

  // Cargar menús cuando se selecciona la sección
  useEffect(() => {
    if (seccionActiva === 'menu-router') {
      cargarMenus();
    }
  }, [seccionActiva]);

  // Cargar opciones cuando cambia el menú seleccionado
  useEffect(() => {
    if (menuSeleccionado) {
      cargarOpciones(menuSeleccionado);
    }
  }, [menuSeleccionado]);

  // Redirigir a respuestas rápidas
  useEffect(() => {
    if (seccionActiva === 'respuestas') {
      router.push('/crm/respuestas');
    }
  }, [seccionActiva, router]);

  // Guardar perfil
  const guardarPerfil = async () => {
    if (!nombrePerfil.trim()) return;
    setGuardandoPerfil(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { nombre: nombrePerfil.trim() }
      });

      if (error) throw error;

      if (usuario) {
        setUsuario({ ...usuario, nombre: nombrePerfil.trim() });
      }

      setPerfilGuardado(true);
      setTimeout(() => setPerfilGuardado(false), 2000);
    } catch (error) {
      console.error('Error guardando perfil:', error);
      alert('Error al guardar el perfil');
    } finally {
      setGuardandoPerfil(false);
    }
  };

  // Cambiar contraseña
  const cambiarPassword = async () => {
    setPasswordError('');
    setPasswordExito(false);

    if (passwordNuevo.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (passwordNuevo !== passwordConfirmar) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    setGuardandoPassword(true);
    try {
      const { error } = await updatePassword(passwordNuevo);

      if (error) {
        setPasswordError(error);
        return;
      }

      setPasswordExito(true);
      setPasswordActual('');
      setPasswordNuevo('');
      setPasswordConfirmar('');
      setTimeout(() => setPasswordExito(false), 3000);
    } catch (error) {
      setPasswordError('Error al cambiar la contraseña');
    } finally {
      setGuardandoPassword(false);
    }
  };

  const cargarConfigAutorespuestas = async (linea: string) => {
    setLoadingAuto(true);
    setConfigAuto(null);
    try {
      const { data, error } = await supabase
        .from('config_autorespuestas')
        .select('*')
        .eq('linea', linea)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setConfigAuto(data);
    } catch (error) {
      console.error('Error cargando config:', error);
    } finally {
      setLoadingAuto(false);
    }
  };

  const guardarConfigAutorespuestas = async () => {
    if (!configAuto) return;
    setSavingAuto(true);
    try {
      const { error } = await supabase
        .from('config_autorespuestas')
        .update({
          activo: configAuto.activo,
          cooldown_horas: configAuto.cooldown_horas,
          no_enviar_si_agente_respondio_min: configAuto.no_enviar_si_agente_respondio_min,
          mensaje_franja_1: configAuto.mensaje_franja_1,
          mensaje_franja_2: configAuto.mensaje_franja_2,
          mensaje_franja_3: configAuto.mensaje_franja_3,
          mensaje_franja_4: configAuto.mensaje_franja_4,
          updated_at: new Date().toISOString(),
        })
        .eq('id', configAuto.id);

      if (error) throw error;
      alert('Configuración guardada');
    } catch (error) {
      console.error('Error guardando:', error);
      alert('Error al guardar');
    } finally {
      setSavingAuto(false);
    }
  };

  const toggleCorte = async () => {
    if (!configAuto) return;
    setCortando(true);
    try {
      const nuevoEstado = !configAuto.corte_activo;
      const { error } = await supabase
        .from('config_autorespuestas')
        .update({
          activo: nuevoEstado,
          corte_activo: nuevoEstado,
          corte_timestamp: nuevoEstado ? new Date().toISOString() : null,
          corte_usuario_id: usuario?.id || null,
          corte_usuario_nombre: usuario?.nombre || 'Sistema',
          updated_at: new Date().toISOString(),
        })
        .eq('id', configAuto.id);

      if (error) throw error;

      await supabase.from('autorespuestas_cortes_log').insert({
        linea: configAuto.linea,
        accion: nuevoEstado ? 'corte' : 'apertura',
        usuario_id: usuario?.id,
        usuario_nombre: usuario?.nombre || 'Sistema',
        automatico: false,
      });

      setConfigAuto({
        ...configAuto,
        activo: nuevoEstado,
        corte_activo: nuevoEstado,
        corte_timestamp: nuevoEstado ? new Date().toISOString() : null,
        corte_usuario_nombre: usuario?.nombre || 'Sistema',
      });
    } catch (error) {
      console.error('Error en corte:', error);
      alert('Error al cambiar estado');
    } finally {
      setCortando(false);
    }
  };

  // Funciones para menú router
  const cargarMenus = async () => {
    setLoadingMenus(true);
    try {
      const { data, error } = await supabase
        .from('router_menu_config')
        .select('*')
        .order('tipo_menu');

      if (error) throw error;
      setMenus(data || []);
      
      // Seleccionar el menú principal por defecto
      const menuPrincipal = data?.find(m => m.tipo_menu === 'principal');
      if (menuPrincipal && !menuSeleccionado) {
        setMenuSeleccionado(menuPrincipal.id);
      }
    } catch (error) {
      console.error('Error cargando menús:', error);
    } finally {
      setLoadingMenus(false);
    }
  };

  const cargarOpciones = async (menuId: string) => {
    try {
      const { data, error } = await supabase
        .from('router_menu_opciones')
        .select('*')
        .eq('menu_config_id', menuId)
        .order('orden');

      if (error) throw error;
      setOpciones(data || []);
    } catch (error) {
      console.error('Error cargando opciones:', error);
    }
  };

  const guardarMenu = async () => {
    if (!editandoMenu) return;
    setSavingMenu(true);
    try {
      const { error } = await supabase
        .from('router_menu_config')
        .update({
          header: editandoMenu.header,
          body: editandoMenu.body,
          footer: editandoMenu.footer,
          button_text: editandoMenu.button_text,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editandoMenu.id);

      if (error) throw error;
      await cargarMenus();
      setEditandoMenu(null);
      alert('Menú actualizado correctamente');
    } catch (error) {
      console.error('Error guardando menú:', error);
      alert('Error al guardar el menú');
    } finally {
      setSavingMenu(false);
    }
  };

  const guardarOpcion = async () => {
    if (!editandoOpcion) return;
    try {
      if (editandoOpcion.id === 'new') {
        // Nueva opción
        const { error } = await supabase
          .from('router_menu_opciones')
          .insert({
            menu_config_id: menuSeleccionado,
            orden: opciones.length + 1,
            opcion_id: editandoOpcion.opcion_id,
            emoji: editandoOpcion.emoji,
            titulo: editandoOpcion.titulo,
            descripcion: editandoOpcion.descripcion,
            tipo_accion: editandoOpcion.tipo_accion,
            area_destino: editandoOpcion.area_destino,
            subetiqueta: editandoOpcion.subetiqueta,
            mensaje_contexto: editandoOpcion.mensaje_contexto,
            activo: true,
          });
        if (error) throw error;
      } else {
        // Actualizar opción existente
        const { error } = await supabase
          .from('router_menu_opciones')
          .update({
            emoji: editandoOpcion.emoji,
            titulo: editandoOpcion.titulo,
            descripcion: editandoOpcion.descripcion,
            tipo_accion: editandoOpcion.tipo_accion,
            area_destino: editandoOpcion.area_destino,
            subetiqueta: editandoOpcion.subetiqueta,
            mensaje_contexto: editandoOpcion.mensaje_contexto,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editandoOpcion.id);
        if (error) throw error;
      }
      
      await cargarOpciones(menuSeleccionado);
      setEditandoOpcion(null);
      setNuevaOpcion(false);
      alert('Opción guardada correctamente');
    } catch (error) {
      console.error('Error guardando opción:', error);
      alert('Error al guardar la opción');
    }
  };

  const toggleOpcionActiva = async (opcion: MenuOpcion) => {
    try {
      const { error } = await supabase
        .from('router_menu_opciones')
        .update({ activo: !opcion.activo })
        .eq('id', opcion.id);

      if (error) throw error;
      await cargarOpciones(menuSeleccionado);
    } catch (error) {
      console.error('Error cambiando estado:', error);
    }
  };

  const moverOpcion = async (opcion: MenuOpcion, direccion: 'up' | 'down') => {
    const index = opciones.findIndex(o => o.id === opcion.id);
    if ((direccion === 'up' && index === 0) || (direccion === 'down' && index === opciones.length - 1)) {
      return;
    }

    const newIndex = direccion === 'up' ? index - 1 : index + 1;
    const opcionIntercambio = opciones[newIndex];

    try {
      await supabase
        .from('router_menu_opciones')
        .update({ orden: opcion.orden })
        .eq('id', opcionIntercambio.id);

      await supabase
        .from('router_menu_opciones')
        .update({ orden: opcionIntercambio.orden })
        .eq('id', opcion.id);

      await cargarOpciones(menuSeleccionado);
    } catch (error) {
      console.error('Error moviendo opción:', error);
    }
  };

  const eliminarOpcion = async (opcionId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta opción?')) return;
    
    try {
      const { error } = await supabase
        .from('router_menu_opciones')
        .delete()
        .eq('id', opcionId);

      if (error) throw error;
      await cargarOpciones(menuSeleccionado);
    } catch (error) {
      console.error('Error eliminando opción:', error);
      alert('Error al eliminar la opción');
    }
  };

  const getFranjaActual = (): { numero: number; nombre: string; color: string } => {
    const ahora = new Date();
    const hora = ahora.getHours();

    if (configAuto?.corte_activo) {
      return { numero: 4, nombre: 'Post Atención', color: 'orange' };
    }
    if (hora >= 22 || hora < 7) {
      return { numero: 1, nombre: 'Descanso', color: 'gray' };
    }
    if (hora >= 7 && hora < 9) {
      return { numero: 2, nombre: 'Preparación', color: 'yellow' };
    }
    return { numero: 3, nombre: 'Atención Activa', color: 'green' };
  };

  const handleSoundToggle = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('psi_notification_sound', String(newValue));
  };

  const handleDesktopToggle = async () => {
    if (!isSupported) {
      alert('Tu navegador no soporta notificaciones de escritorio');
      return;
    }
    if (!desktopEnabled) {
      if (permissionStatus === 'denied') {
        alert('Las notificaciones están bloqueadas. Habilitá los permisos en la configuración del navegador.');
        return;
      }
      const granted = await requestPermission();
      if (granted) {
        setDesktopEnabled(true);
        localStorage.setItem('psi_notification_desktop', 'true');
        new Notification('✅ Notificaciones activadas', {
          body: 'Ahora recibirás alertas cuando lleguen nuevos mensajes',
          icon: '/psi-logo.png'
        });
      }
    } else {
      setDesktopEnabled(false);
      localStorage.setItem('psi_notification_desktop', 'false');
    }
  };

  const handleMetaToggle = () => {
    const newValue = !metaAlertsEnabled;
    setMetaAlertsEnabled(newValue);
    localStorage.setItem('psi_notification_meta', String(newValue));
  };

  const franja = getFranjaActual();
  const lineaActual = LINEAS_AUTORESPUESTA.find(l => l.id === lineaSeleccionada);
  const menuActual = menus.find(m => m.id === menuSeleccionado);

  return (
    <div className="flex-1 flex bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar de secciones */}
      <div className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Ajustes</h1>
        <nav className="space-y-1">
          {SECCIONES.map((seccion) => (
            <button
              key={seccion.id}
              onClick={() => setSeccionActiva(seccion.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left',
                seccionActiva === seccion.id
                  ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <seccion.icono size={20} />
              <div className="flex-1">
                <p className="font-medium text-sm">{seccion.nombre}</p>
                <p className="text-xs opacity-70">{seccion.descripcion}</p>
              </div>
              {seccion.id === 'respuestas' ? (
                <ExternalLink size={16} className="opacity-50" />
              ) : (
                <ChevronRight size={16} className="opacity-50" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* PERFIL */}
        {seccionActiva === 'perfil' && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Mi Perfil</h2>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                  {nombrePerfil?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">{nombrePerfil || 'Usuario'}</p>
                  <p className="text-sm text-slate-500">{usuario?.email || 'Sin email'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={nombrePerfil}
                    onChange={(e) => setNombrePerfil(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={usuario?.email || ''}
                    disabled
                    className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 mt-1">El email no se puede cambiar</p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={guardarPerfil}
                    disabled={guardandoPerfil || nombrePerfil === usuario?.nombre}
                    className={cn(
                      'px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
                      perfilGuardado
                        ? 'bg-green-500 text-white'
                        : 'bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {guardandoPerfil && <Loader2 className="w-4 h-4 animate-spin" />}
                    {perfilGuardado && <Check className="w-4 h-4" />}
                    {perfilGuardado ? 'Guardado' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800 dark:text-white">Modo Oscuro</p>
                  <p className="text-sm text-slate-500">Cambiar apariencia del sistema</p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors relative',
                    darkMode ? 'bg-indigo-500' : 'bg-slate-300'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform',
                    darkMode ? 'translate-x-6' : 'translate-x-0.5'
                  )} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MENÚ ROUTER WSP4 */}
        {seccionActiva === 'menu-router' && (
          <div className="max-w-5xl">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Menú Router WSP4</h2>
            
            {loadingMenus ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : (
              <>
                {/* Selector de menú */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 mb-4">
                  <div className="flex items-center gap-2">
                    <Menu size={18} className="text-slate-500" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mr-4">Menú:</span>
                    <div className="flex gap-2 flex-wrap">
                      {menus.map((menu) => (
                        <button
                          key={menu.id}
                          onClick={() => setMenuSeleccionado(menu.id)}
                          className={cn(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                            menuSeleccionado === menu.id
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          )}
                        >
                          {menu.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {menuActual && (
                  <>
                    {/* Configuración del menú */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-slate-800 dark:text-white">Configuración del Menú</h3>
                        {editandoMenu?.id === menuActual.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={guardarMenu}
                              disabled={savingMenu}
                              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                            >
                              {savingMenu ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditandoMenu(null)}
                              className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditandoMenu(menuActual)}
                            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                          >
                            <Edit2 size={18} />
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Header (opcional)
                          </label>
                          <input
                            type="text"
                            value={editandoMenu?.id === menuActual.id ? editandoMenu.header : menuActual.header}
                            onChange={(e) => editandoMenu && setEditandoMenu({ ...editandoMenu, header: e.target.value })}
                            disabled={editandoMenu?.id !== menuActual.id}
                            className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white disabled:opacity-60"
                            placeholder="Ej: ¡Hola! 👋"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Cuerpo del mensaje
                          </label>
                          <textarea
                            rows={3}
                            value={editandoMenu?.id === menuActual.id ? editandoMenu.body : menuActual.body}
                            onChange={(e) => editandoMenu && setEditandoMenu({ ...editandoMenu, body: e.target.value })}
                            disabled={editandoMenu?.id !== menuActual.id}
                            className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white disabled:opacity-60 resize-none"
                            placeholder="Mensaje principal del menú"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Footer (opcional)
                            </label>
                            <input
                              type="text"
                              value={editandoMenu?.id === menuActual.id ? editandoMenu.footer : menuActual.footer}
                              onChange={(e) => editandoMenu && setEditandoMenu({ ...editandoMenu, footer: e.target.value })}
                              disabled={editandoMenu?.id !== menuActual.id}
                              className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white disabled:opacity-60"
                              placeholder="Ej: Elegí una opción"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Texto del botón
                            </label>
                            <input
                              type="text"
                              value={editandoMenu?.id === menuActual.id ? editandoMenu.button_text : menuActual.button_text}
                              onChange={(e) => editandoMenu && setEditandoMenu({ ...editandoMenu, button_text: e.target.value })}
                              disabled={editandoMenu?.id !== menuActual.id}
                              className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white disabled:opacity-60"
                              placeholder="Ej: Ver opciones"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Opciones del menú */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-slate-800 dark:text-white">Opciones del Menú</h3>
                        {!nuevaOpcion && (
                          <button
                            onClick={() => {
                              setNuevaOpcion(true);
                              setEditandoOpcion({
                                id: 'new',
                                menu_config_id: menuSeleccionado,
                                orden: opciones.length + 1,
                                opcion_id: '',
                                emoji: '',
                                titulo: '',
                                descripcion: '',
                                tipo_accion: 'derivar',
                                activo: true,
                              });
                            }}
                            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center gap-2"
                          >
                            <Plus size={16} />
                            Nueva Opción
                          </button>
                        )}
                      </div>

                      {/* Formulario de nueva opción */}
                      {nuevaOpcion && editandoOpcion?.id === 'new' && (
                        <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                ID de opción *
                              </label>
                              <input
                                type="text"
                                value={editandoOpcion.opcion_id}
                                onChange={(e) => setEditandoOpcion({ ...editandoOpcion, opcion_id: e.target.value })}
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                                placeholder="Ej: admin_nueva"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Tipo de acción *
                              </label>
                              <select
                                value={editandoOpcion.tipo_accion}
                                onChange={(e) => setEditandoOpcion({ ...editandoOpcion, tipo_accion: e.target.value })}
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                              >
                                <option value="derivar">Derivar</option>
                                <option value="submenu">Submenú</option>
                                <option value="volver">Volver</option>
                                <option value="cursos_dinamico">Cursos Dinámico</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Emoji
                              </label>
                              <input
                                type="text"
                                value={editandoOpcion.emoji}
                                onChange={(e) => setEditandoOpcion({ ...editandoOpcion, emoji: e.target.value })}
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                                placeholder="🎯"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Título *
                              </label>
                              <input
                                type="text"
                                value={editandoOpcion.titulo}
                                onChange={(e) => setEditandoOpcion({ ...editandoOpcion, titulo: e.target.value })}
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                                placeholder="Título de la opción"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Descripción
                              </label>
                              <input
                                type="text"
                                value={editandoOpcion.descripcion}
                                onChange={(e) => setEditandoOpcion({ ...editandoOpcion, descripcion: e.target.value })}
                                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                                placeholder="Descripción breve"
                              />
                            </div>
                          </div>

                          {editandoOpcion.tipo_accion === 'derivar' && (
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Área destino
                                </label>
                                <select
                                  value={editandoOpcion.area_destino || ''}
                                  onChange={(e) => setEditandoOpcion({ ...editandoOpcion, area_destino: e.target.value })}
                                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                                >
                                  <option value="">Seleccionar...</option>
                                  <option value="admin">Administración</option>
                                  <option value="alumnos">Alumnos</option>
                                  <option value="ventas">Ventas</option>
                                  <option value="comunidad">Comunidad</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Subetiqueta
                                </label>
                                <input
                                  type="text"
                                  value={editandoOpcion.subetiqueta || ''}
                                  onChange={(e) => setEditandoOpcion({ ...editandoOpcion, subetiqueta: e.target.value })}
                                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                                  placeholder="Ej: pagos"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Contexto
                                </label>
                                <input
                                  type="text"
                                  value={editandoOpcion.mensaje_contexto || ''}
                                  onChange={(e) => setEditandoOpcion({ ...editandoOpcion, mensaje_contexto: e.target.value })}
                                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                                  placeholder="Mensaje de contexto"
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setNuevaOpcion(false);
                                setEditandoOpcion(null);
                              }}
                              className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={guardarOpcion}
                              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                            >
                              <Save size={16} />
                              Guardar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Lista de opciones */}
                      <div className="space-y-2">
                        {opciones.map((opcion, index) => (
                          <div
                            key={opcion.id}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-lg',
                              opcion.activo 
                                ? 'bg-slate-50 dark:bg-slate-800' 
                                : 'bg-slate-100 dark:bg-slate-700 opacity-60'
                            )}
                          >
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => moverOpcion(opcion, 'up')}
                                disabled={index === 0}
                                className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                onClick={() => moverOpcion(opcion, 'down')}
                                disabled={index === opciones.length - 1}
                                className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                              >
                                <ChevronDown size={14} />
                              </button>
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{opcion.emoji}</span>
                                <span className="font-medium text-slate-800 dark:text-white">{opcion.titulo}</span>
                                <span className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-600 rounded">
                                  {opcion.tipo_accion}
                                </span>
                                {opcion.area_destino && (
                                  <span className="text-xs text-slate-500">→ {opcion.area_destino}</span>
                                )}
                              </div>
                              {opcion.descripcion && (
                                <p className="text-sm text-slate-500 mt-1">{opcion.descripcion}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleOpcionActiva(opcion)}
                                className={cn(
                                  'w-10 h-5 rounded-full relative transition-colors',
                                  opcion.activo ? 'bg-green-500' : 'bg-slate-300'
                                )}
                              >
                                <div className={cn(
                                  'w-4 h-4 rounded-full bg-white shadow absolute top-0.5 transition-transform',
                                  opcion.activo ? 'translate-x-5' : 'translate-x-0.5'
                                )} />
                              </button>

                              <button
                                onClick={() => setEditandoOpcion(opcion)}
                                className="p-1.5 text-slate-400 hover:text-slate-600"
                              >
                                <Edit2 size={16} />
                              </button>

                              <button
                                onClick={() => eliminarOpcion(opcion.id)}
                                className="p-1.5 text-red-400 hover:text-red-600"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}

                        {opciones.length === 0 && !nuevaOpcion && (
                          <p className="text-center py-8 text-slate-500">
                            No hay opciones configuradas para este menú
                          </p>
                        )}
                      </div>

                      {/* Modal de edición de opción */}
                      {editandoOpcion && editandoOpcion.id !== 'new' && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-2xl w-full mx-4">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                              Editar Opción
                            </h3>

                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Emoji
                                  </label>
                                  <input
                                    type="text"
                                    value={editandoOpcion.emoji}
                                    onChange={(e) => setEditandoOpcion({ ...editandoOpcion, emoji: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Título
                                  </label>
                                  <input
                                    type="text"
                                    value={editandoOpcion.titulo}
                                    onChange={(e) => setEditandoOpcion({ ...editandoOpcion, titulo: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Descripción
                                </label>
                                <input
                                  type="text"
                                  value={editandoOpcion.descripcion}
                                  onChange={(e) => setEditandoOpcion({ ...editandoOpcion, descripcion: e.target.value })}
                                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Tipo de acción
                                </label>
                                <select
                                  value={editandoOpcion.tipo_accion}
                                  onChange={(e) => setEditandoOpcion({ ...editandoOpcion, tipo_accion: e.target.value })}
                                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white"
                                >
                                  <option value="derivar">Derivar</option>
                                  <option value="submenu">Submenú</option>
                                  <option value="volver">Volver</option>
                                  <option value="cursos_dinamico">Cursos Dinámico</option>
                                </select>
                              </div>

                              {editandoOpcion.tipo_accion === 'derivar' && (
                                <>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Área destino
                                      </label>
                                      <select
                                        value={editandoOpcion.area_destino || ''}
                                        onChange={(e) => setEditandoOpcion({ ...editandoOpcion, area_destino: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white"
                                      >
                                        <option value="">Seleccionar...</option>
                                        <option value="admin">Administración</option>
                                        <option value="alumnos">Alumnos</option>
                                        <option value="ventas">Ventas</option>
                                        <option value="comunidad">Comunidad</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Subetiqueta
                                      </label>
                                      <input
                                        type="text"
                                        value={editandoOpcion.subetiqueta || ''}
                                        onChange={(e) => setEditandoOpcion({ ...editandoOpcion, subetiqueta: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                      Mensaje de contexto
                                    </label>
                                    <input
                                      type="text"
                                      value={editandoOpcion.mensaje_contexto || ''}
                                      onChange={(e) => setEditandoOpcion({ ...editandoOpcion, mensaje_contexto: e.target.value })}
                                      className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white"
                                    />
                                  </div>
                                </>
                              )}

                              <div className="flex justify-end gap-2 pt-4">
                                <button
                                  onClick={() => setEditandoOpcion(null)}
                                  className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={guardarOpcion}
                                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                                >
                                  <Save size={16} />
                                  Guardar
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* NOTIFICACIONES */}
        {seccionActiva === 'notificaciones' && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Notificaciones</h2>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-slate-700 dark:text-slate-300">Sonido de nuevos mensajes</span>
                  <p className="text-xs text-slate-500 mt-0.5">Reproducir sonido cuando llegue un mensaje</p>
                </div>
                <button
                  onClick={handleSoundToggle}
                  className={cn(
                    'w-12 h-6 rounded-full relative transition-colors',
                    soundEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform',
                    soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  )} />
                </button>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-slate-700 dark:text-slate-300">Notificaciones de escritorio</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {permissionStatus === 'denied' ? '⚠️ Bloqueadas en el navegador' : permissionStatus === 'granted' ? '✅ Permisos otorgados' : 'Alertas flotantes del sistema'}
                  </p>
                </div>
                <button
                  onClick={handleDesktopToggle}
                  className={cn(
                    'w-12 h-6 rounded-full relative transition-colors',
                    desktopEnabled && permissionStatus === 'granted' ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform',
                    desktopEnabled && permissionStatus === 'granted' ? 'translate-x-6' : 'translate-x-0.5'
                  )} />
                </button>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-slate-700 dark:text-slate-300">Alertas de leads META</span>
                  <p className="text-xs text-slate-500 mt-0.5">Notificar cuando lleguen leads de Meta Ads</p>
                </div>
                <button
                  onClick={handleMetaToggle}
                  className={cn(
                    'w-12 h-6 rounded-full relative transition-colors',
                    metaAlertsEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform',
                    metaAlertsEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  )} />
                </button>
              </div>
            </div>
            {permissionStatus === 'denied' && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Notificaciones bloqueadas:</strong> Para habilitarlas, hacé click en el ícono del candado 🔒 en la barra de direcciones.
                </p>
              </div>
            )}
          </div>
        )}

        {/* SEGURIDAD */}
        {seccionActiva === 'seguridad' && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Seguridad</h2>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
              <h3 className="font-medium text-slate-800 dark:text-white mb-4">Cambiar Contraseña</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={passwordNuevo}
                      onChange={(e) => setPasswordNuevo(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white pr-10"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    >
                      {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirmar contraseña</label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={passwordConfirmar}
                    onChange={(e) => setPasswordConfirmar(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white"
                    placeholder="Repetí la contraseña"
                  />
                </div>

                {passwordError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                  </div>
                )}

                {passwordExito && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm text-green-600 dark:text-green-400">✅ Contraseña actualizada correctamente</p>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={cambiarPassword}
                    disabled={guardandoPassword || !passwordNuevo || !passwordConfirmar}
                    className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {guardandoPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                    Cambiar Contraseña
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AUTORESPUESTAS */}
        {seccionActiva === 'autorespuestas' && (
          <div className="max-w-3xl">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Autorespuestas</h2>

            {/* Selector de línea */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Phone size={18} className="text-slate-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mr-4">Línea:</span>
                <div className="flex gap-2">
                  {LINEAS_AUTORESPUESTA.map((linea) => (
                    <button
                      key={linea.id}
                      onClick={() => setLineaSeleccionada(linea.id)}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        lineaSeleccionada === linea.id
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      )}
                    >
                      {linea.nombre}
                    </button>
                  ))}
                </div>
                {lineaActual && (
                  <span className="ml-auto text-xs text-slate-500">{lineaActual.descripcion}</span>
                )}
              </div>
            </div>

            {loadingAuto ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : configAuto ? (
              <>
                {/* Estado actual y botón de corte */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 mb-4">
                  <h3 className="font-medium text-slate-800 dark:text-white mb-4">Estado Actual</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-4 h-4 rounded-full',
                        franja.color === 'green' && 'bg-green-500',
                        franja.color === 'yellow' && 'bg-yellow-500',
                        franja.color === 'orange' && 'bg-orange-500',
                        franja.color === 'gray' && 'bg-gray-500'
                      )} />
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-white">
                          Franja {franja.numero}: {franja.nombre}
                        </p>
                        {configAuto.corte_activo && configAuto.corte_timestamp && (
                          <p className="text-xs text-slate-500">
                            Cortado por {configAuto.corte_usuario_nombre} a las {new Date(configAuto.corte_timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={toggleCorte}
                      disabled={cortando}
                      className={cn(
                        'px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2',
                        configAuto.corte_activo
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      )}
                    >
                      {cortando && <Loader2 className="w-4 h-4 animate-spin" />}
                      {configAuto.corte_activo ? '🟢 Reanudar Atención' : '🔴 Cortar Atención'}
                    </button>
                  </div>
                </div>

                {/* Configuración general */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 mb-4">
                  <h3 className="font-medium text-slate-800 dark:text-white mb-4">Configuración</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <span className="text-slate-700 dark:text-slate-300">Autorespuestas activas</span>
                        <p className="text-xs text-slate-500 mt-0.5">Enviar mensajes automáticos según horario</p>
                      </div>
                      <button
                        onClick={() => setConfigAuto({ ...configAuto, activo: !configAuto.activo })}
                        className={cn(
                          'w-12 h-6 rounded-full relative transition-colors',
                          configAuto.activo ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'
                        )}
                      >
                        <div className={cn(
                          'w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform',
                          configAuto.activo ? 'translate-x-6' : 'translate-x-0.5'
                        )} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <span className="text-slate-700 dark:text-slate-300">No repetir si ya se envió en las últimas</span>
                        <p className="text-xs text-slate-500 mt-0.5">Evita spam al mismo contacto</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={configAuto.cooldown_horas}
                          onChange={(e) => setConfigAuto({ ...configAuto, cooldown_horas: parseInt(e.target.value) || 2 })}
                          className="w-16 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-center text-slate-800 dark:text-white"
                        />
                        <span className="text-slate-500 text-sm">horas</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <span className="text-slate-700 dark:text-slate-300">No enviar si agente respondió en los últimos</span>
                        <p className="text-xs text-slate-500 mt-0.5">Conversación activa no recibe autorespuesta</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="5"
                          max="120"
                          value={configAuto.no_enviar_si_agente_respondio_min}
                          onChange={(e) => setConfigAuto({ ...configAuto, no_enviar_si_agente_respondio_min: parseInt(e.target.value) || 30 })}
                          className="w-16 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-center text-slate-800 dark:text-white"
                        />
                        <span className="text-slate-500 text-sm">minutos</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mensajes por franja */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 mb-4">
                  <h3 className="font-medium text-slate-800 dark:text-white mb-4">Mensajes por Franja</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        🌙 Franja 1: Descanso (22:00 - 07:00)
                      </label>
                      <textarea
                        rows={3}
                        value={configAuto.mensaje_franja_1 || ''}
                        onChange={(e) => setConfigAuto({ ...configAuto, mensaje_franja_1: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        ☀️ Franja 2: Preparación (07:00 - 09:00)
                      </label>
                      <textarea
                        rows={3}
                        value={configAuto.mensaje_franja_2 || ''}
                        onChange={(e) => setConfigAuto({ ...configAuto, mensaje_franja_2: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        💼 Franja 3: Atención Activa (09:00 - corte)
                      </label>
                      <textarea
                        rows={3}
                        value={configAuto.mensaje_franja_3 || ''}
                        onChange={(e) => setConfigAuto({ ...configAuto, mensaje_franja_3: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white resize-none"
                      />
                      <p className="text-xs text-slate-500 mt-1">Usá {'{dia_tarde}'} para insertar automáticamente "día" o "tarde"</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        🌆 Franja 4: Post Atención (corte - 22:00)
                      </label>
                      <textarea
                        rows={3}
                        value={configAuto.mensaje_franja_4 || ''}
                        onChange={(e) => setConfigAuto({ ...configAuto, mensaje_franja_4: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-slate-800 dark:text-white resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Botón guardar */}
                <div className="flex justify-end">
                  <button
                    onClick={guardarConfigAutorespuestas}
                    disabled={savingAuto}
                    className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                  >
                    {savingAuto && <Loader2 className="w-4 h-4 animate-spin" />}
                    Guardar Cambios
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <p className="text-slate-500">No hay configuración de autorespuestas para esta línea. Contactá al administrador.</p>
              </div>
            )}
          </div>
        )}

        {/* DATOS Y EXPORTACIÓN */}
        {seccionActiva === 'datos' && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Datos y Exportación</h2>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="text-center py-8">
                <Database size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-500 mb-4">Accedé a las estadísticas y reportes del sistema</p>
                <button
                  onClick={() => router.push('/crm/estadisticas')}
                  className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-colors inline-flex items-center gap-2"
                >
                  <ExternalLink size={18} />
                  Ir a Estadísticas
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
