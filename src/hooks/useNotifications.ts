/**
 * useNotifications.ts
 * Hook para manejar notificaciones del navegador y favicon dinámico
 */

import { useEffect, useState, useCallback, useRef } from 'react';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  onClick?: () => void;
}

interface UseNotificationsReturn {
  permissionStatus: NotificationPermission | 'unsupported';
  unreadCount: number;
  isSupported: boolean;
  requestPermission: () => Promise<boolean>;
  showNotification: (options: NotificationOptions) => void;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  clearUnread: () => void;
  playSound: () => void;
}

const DEFAULT_ICON = '/psi-logo.png';
const NOTIFICATION_SOUND_URL = '/sounds/notification.mp3';
const ORIGINAL_TITLE = 'PSI Vision Hub - CRM';

class FaviconManager {
  private originalFavicon: string = '/favicon.ico';
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private faviconLink: HTMLLinkElement | null = null;
  private originalImage: HTMLImageElement | null = null;
  private isReady: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private async init() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 32;
    this.canvas.height = 32;
    this.ctx = this.canvas.getContext('2d');

    this.faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!this.faviconLink) {
      this.faviconLink = document.createElement('link');
      this.faviconLink.rel = 'icon';
      document.head.appendChild(this.faviconLink);
    }
    
    this.originalFavicon = this.faviconLink.href || '/favicon.ico';

    this.originalImage = new Image();
    this.originalImage.crossOrigin = 'anonymous';
    this.originalImage.onload = () => {
      this.isReady = true;
    };
    this.originalImage.src = this.originalFavicon;
  }

  updateBadge(count: number, color: 'red' | 'blue' | 'green' = 'red') {
    if (!this.ctx || !this.canvas || !this.faviconLink || !this.isReady) return;

    this.ctx.clearRect(0, 0, 32, 32);

    if (this.originalImage) {
      this.ctx.drawImage(this.originalImage, 0, 0, 32, 32);
    }

    if (count > 0) {
      const colors = {
        red: '#ef4444',
        blue: '#3b82f6',
        green: '#22c55e'
      };

      this.ctx.beginPath();
      this.ctx.arc(24, 8, 8, 0, 2 * Math.PI);
      this.ctx.fillStyle = colors[color];
      this.ctx.fill();

      this.ctx.strokeStyle = 'white';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      if (count < 10) {
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(count.toString(), 24, 8);
      } else {
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 8px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('9+', 24, 8);
      }
    }

    this.faviconLink.href = this.canvas.toDataURL('image/png');
  }

  restore() {
    if (this.faviconLink) {
      this.faviconLink.href = this.originalFavicon;
    }
  }

  showDot(color: 'red' | 'blue' | 'green' = 'blue') {
    if (!this.ctx || !this.canvas || !this.faviconLink || !this.isReady) return;

    this.ctx.clearRect(0, 0, 32, 32);

    if (this.originalImage) {
      this.ctx.drawImage(this.originalImage, 0, 0, 32, 32);
    }

    const colors = {
      red: '#ef4444',
      blue: '#3b82f6',
      green: '#22c55e'
    };

    this.ctx.beginPath();
    this.ctx.arc(26, 6, 5, 0, 2 * Math.PI);
    this.ctx.fillStyle = colors[color];
    this.ctx.fill();

    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    this.faviconLink.href = this.canvas.toDataURL('image/png');
  }
}

export function useNotifications(): UseNotificationsReturn {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [unreadCount, setUnreadCountState] = useState<number>(0);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  
  const faviconManager = useRef<FaviconManager | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const originalTitle = useRef<string>(ORIGINAL_TITLE);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermissionStatus(Notification.permission);
    } else {
      setPermissionStatus('unsupported');
    }

    faviconManager.current = new FaviconManager();
    originalTitle.current = document.title || ORIGINAL_TITLE;

    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;

    return () => {
      faviconManager.current?.restore();
      document.title = originalTitle.current;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${originalTitle.current}`;
      faviconManager.current?.updateBadge(unreadCount, 'red');
    } else {
      document.title = originalTitle.current;
      faviconManager.current?.restore();
    }
  }, [unreadCount]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error solicitando permiso de notificaciones:', error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback((options: NotificationOptions) => {
    if (!isSupported || permissionStatus !== 'granted') {
      console.warn('Notificaciones no disponibles o sin permiso');
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || DEFAULT_ICON,
        tag: options.tag,
        requireInteraction: false,
        silent: false,
        data: options.data
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        options.onClick?.();
      };

      setTimeout(() => notification.close(), 5000);

    } catch (error) {
      console.error('Error mostrando notificación:', error);
    }
  }, [isSupported, permissionStatus]);

  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.warn('No se pudo reproducir sonido:', err);
      });
    }
  }, []);

  const setUnreadCount = useCallback((count: number) => {
    setUnreadCountState(Math.max(0, count));
  }, []);

  const incrementUnread = useCallback(() => {
    setUnreadCountState(prev => prev + 1);
  }, []);

  const clearUnread = useCallback(() => {
    setUnreadCountState(0);
  }, []);

  return {
    permissionStatus,
    unreadCount,
    isSupported,
    requestPermission,
    showNotification,
    setUnreadCount,
    incrementUnread,
    clearUnread,
    playSound
  };
}

export default useNotifications;
