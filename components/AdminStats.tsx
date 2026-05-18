"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminStats() {
  const [stats, setStats] = useState({
    usersToday: 0,
    shotsWeek: 0,
    pendingShots: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.setDate(now.getDate() - 7)).toISOString();

    const { count: usersToday } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart);
    const { count: shotsWeek } = await supabase.from('shots').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo);
    const { count: pendingShots } = await supabase.from('shots').select('*', { count: 'exact', head: true }).eq('is_approved', false).neq('is_rejected', true);
    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

    setStats({
      usersToday: usersToday || 0,
      shotsWeek: shotsWeek || 0,
      pendingShots: pendingShots || 0,
      totalUsers: totalUsers || 0,
    });
    setLoading(false);
  };

  if (loading) return <div className="h-6 flex items-center text-gray-600 text-[10px] animate-pulse mb-3">Cargando...</div>;

  return (
    // Fila única de alto fijo (h-6 = 24px), texto de 11px
    <div className="flex items-center gap-4 text-[11px] text-gray-400 mb-3 h-6 flex-shrink-0 border-b border-gray-800 pb-1">
      <div className="flex items-center gap-1"><span className="text-yellow-400 font-bold text-xs">{stats.pendingShots}</span> Pendientes</div>
      <div className="flex items-center gap-1"><span className="text-blue-400 font-bold text-xs">{stats.usersToday}</span> Hoy</div>
      <div className="flex items-center gap-1"><span className="text-green-400 font-bold text-xs">{stats.shotsWeek}</span> Semana</div>
      <div className="flex items-center gap-1"><span className="text-purple-400 font-bold text-xs">{stats.totalUsers}</span> Total</div>
    </div>
  );
}