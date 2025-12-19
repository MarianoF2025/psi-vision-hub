import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Conversacion, Mensaje, InboxType, Profile } from '@/types/crm';

interface CRMState {
  darkMode: boolean;
  toggleDarkMode: () => void;
  sidebarExpandido: boolean;
  toggleSidebar: () => void;
  inboxActual: InboxType;
  setInboxActual: (inbox: InboxType) => void;
  conversacionActual: Conversacion | null;
  setConversacionActual: (conv: Conversacion | null) => void;
  panelInfoAbierto: boolean;
  togglePanelInfo: () => void;
  setPanelInfoAbierto: (open: boolean) => void;
  contadores: Record<InboxType, number>;
  setContador: (inbox: InboxType, count: number) => void;
  usuario: Profile | null;
  setUsuario: (user: Profile | null) => void;
  filtroConversaciones: 'todas' | 'sin_asignar' | 'mias';
  setFiltroConversaciones: (filtro: 'todas' | 'sin_asignar' | 'mias') => void;
  busquedaConversaciones: string;
  setBusquedaConversaciones: (texto: string) => void;
  mensajeEnRespuesta: Mensaje | null;
  setMensajeEnRespuesta: (msg: Mensaje | null) => void;
}

export const useCRMStore = create<CRMState>()(
  persist(
    (set) => ({
      darkMode: true,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      sidebarExpandido: false,
      toggleSidebar: () => set((state) => ({ sidebarExpandido: !state.sidebarExpandido })),
      inboxActual: 'wsp4',
      setInboxActual: (inbox) => set({ inboxActual: inbox, conversacionActual: null }),
      conversacionActual: null,
      setConversacionActual: (conv) => set({ conversacionActual: conv }),
      panelInfoAbierto: false,
      togglePanelInfo: () => set((state) => ({ panelInfoAbierto: !state.panelInfoAbierto })),
      setPanelInfoAbierto: (open) => set({ panelInfoAbierto: open }),
      contadores: { wsp4: 0, ventas: 0, ventas_api: 0, alumnos: 0, admin: 0, comunidad: 0 },
      setContador: (inbox, count) => set((state) => ({
        contadores: { ...state.contadores, [inbox]: count }
      })),
      usuario: null,
      setUsuario: (user) => set({ usuario: user }),
      filtroConversaciones: 'todas',
      setFiltroConversaciones: (filtro) => set({ filtroConversaciones: filtro }),
      busquedaConversaciones: '',
      setBusquedaConversaciones: (texto) => set({ busquedaConversaciones: texto }),
      mensajeEnRespuesta: null,
      setMensajeEnRespuesta: (msg) => set({ mensajeEnRespuesta: msg }),
    }),
    {
      name: 'crm-storage',
      partialize: (state) => ({ darkMode: state.darkMode, inboxActual: state.inboxActual, sidebarExpandido: state.sidebarExpandido }),
    }
  )
);
