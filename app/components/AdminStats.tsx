"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

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
    
    // Fechas
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.setDate(now.getDate() - 7)).toISOString();

    // 1. Usuarios Hoy
    const { count: usersToday } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart);

    // 2. Shots esta semana
    const { count: shotsWeek } = await supabase
      .from('shots')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo);

    // 3. Pendientes
    const { count: pendingShots } = await supabase
      .from('shots')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', false);
      
    // 4. Total Usuarios
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    setStats({
      usersToday: usersToday || 0,
      shotsWeek: shotsWeek || 0,
      pendingShots: pendingShots || 0,
      totalUsers: totalUsers || 0,
    });
    setLoading(false);
  };

  if (loading) return <div className="text-gray-500 p-4">Cargando estadísticas...</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <StatCard title="Pendientes" value={stats.pendingShots} icon="⏳" color="yellow" />
      <StatCard title="Usuarios Hoy" value={stats.usersToday} icon="👤" color="blue" />
      <StatCard title="Shots (7 días)" value={stats.shotsWeek} icon="📸" color="green" />
      <StatCard title="Total Usuarios" value={stats.totalUsers} icon="👥" color="purple" />
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  const colors = {
    yellow: 'border-yellow-500 text-yellow-400',
    blue: 'border-blue-500 text-blue-400',
    green: 'border-green-500 text-green-400',
    purple: 'border-purple-500 text-purple-400',
  };
  
  return (
    <div className={`bg-gray-800 p-4 rounded-xl border-l-4 ${colors[color as keyof typeof colors]} shadow-lg`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{title}</span>
        <span className="text-xl opacity-50">{icon}</span>
      </div>
      <div className="text-3xl font-bold text-white">
        {value}
      </div>
    </div>
  );
}