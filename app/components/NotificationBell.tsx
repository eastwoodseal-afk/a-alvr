"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

// NUEVO: Recibimos open y onClose para controlar desde el padre
interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NotificationBell({ open, onClose }: Props) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const channel = supabase.channel('realtime-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user?.id}` }, (payload) => {
        const newNotif = payload.new as Notification;
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchNotifications = async () => {
    if(!user) return;
    setLoading(true);
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
    setLoading(false);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.abs(now.getTime() - date.getTime());
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Ahora";
    if (minutes < 60) return `Hace ${minutes}m`;
    if (minutes < 1440) return `Hace ${Math.floor(minutes / 60)}h`;
    return `Hace ${Math.floor(minutes / 1440)}d`;
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* ICONO (El botón ahora está en el Header) */}
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.184 24.184 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>

      {/* BADGE ROJO (Solo si hay no leídas) */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center border border-gray-900">
          {unreadCount > 9 ? '+9' : unreadCount}
        </span>
      )}

      {/* DROPDOWN */}
      {open && (
        <div 
          className="absolute right-0 top-10 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-800">
            <span className="text-sm font-bold text-white">Notificaciones</span>
            <button onClick={markAllAsRead} className="text-xs text-yellow-500 hover:underline">Marcar leídas</button>
          </div>
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {loading ? <div className="p-4 text-center text-gray-500 text-sm">Cargando...</div> : notifications.length === 0 ? <div className="p-8 text-center text-gray-600 text-sm">No tienes notificaciones.</div> : (
              notifications.map(notif => (
                <div key={notif.id} className={`p-3 border-b border-gray-800 hover:bg-gray-800 transition cursor-pointer ${!notif.read ? 'bg-gray-800/50' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div className={`text-sm font-semibold ${!notif.read ? 'text-white' : 'text-gray-400'}`}>{notif.title}</div>
                    <span className="text-[10px] text-gray-600 ml-2 whitespace-nowrap">{formatTime(notif.created_at)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}