"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import { hasPermission, UserRole } from "../../lib/roleUtils";
import UserSearch from "./UserSearch";
import RoleManager from "./RoleManager";
import AdminShotModal from "./AdminShotModal";
import CategoryManager from "./CategoryManager";
import AdminShotCard from "./AdminShotCard";
import ConfirmModal from "./ConfirmModal";
import AdminStats from "./AdminStats"; // IMPORTANTE: Asegúrate de haber creado este archivo

interface Props {
  onClose: () => void;
}

export default function AdminPanelOverlay({ onClose }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'shots' | 'members' | 'admins' | 'manage' | 'settings'>('shots');
  
  // --- ESTADOS SHOTS ---
  const [shots, setShots] = useState<any[]>([]);
  const [loadingShots, setLoadingShots] = useState(true);
  const [selectedShot, setSelectedShot] = useState<any | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // --- ESTADOS PARA LOTE Y FILTROS ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterUser, setFilterUser] = useState<string>("");
  const [filterKeyword, setFilterKeyword] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");

  // --- ESTADO PARA MODAL DE CONFIRMACIÓN ---
  const [confirmState, setConfirmState] = useState<{type: 'mass_reject' | 'mass_approve' | 'single_reject', id?: string} | null>(null);

  // --- ESTADOS CONFIGURACIÓN ---
  const [categoryFilterEnabled, setCategoryFilterEnabled] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    fetchPendingShots();
    fetchSettings();
  }, []);

  // --- FUNCIONES SHOTS ---
  const fetchPendingShots = async () => {
    setLoadingShots(true);
    try {
      const { data, error } = await supabase
        .from('shots')
        .select(`id, title, description, image_url, user_id, author, created_at, profiles!shots_user_id_fkey ( username )`)
        .eq('is_approved', false)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        const formatted = data.map((s: any) => ({ ...s, username: s.profiles?.username || "Desconocido" }));
        setShots(formatted);
      }
    } catch (err) { console.error(err); } 
    finally { setLoadingShots(false); }
  };

  // --- FILTROS EN FRONTEND ---
  const filteredShots = shots.filter(shot => {
    if (filterUser && !shot.username.toLowerCase().includes(filterUser.toLowerCase())) return false;
    if (filterKeyword) {
      const k = filterKeyword.toLowerCase();
      const inTitle = shot.title?.toLowerCase().includes(k);
      const inDesc = shot.description?.toLowerCase().includes(k);
      const inAuthor = shot.author?.toLowerCase().includes(k);
      if (!inTitle && !inDesc && !inAuthor) return false;
    }
    if (filterDate) {
      const shotDate = new Date(shot.created_at);
      const today = new Date();
      if (filterDate === 'today') {
        if (shotDate.toDateString() !== today.toDateString()) return false;
      }
      if (filterDate === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        if (shotDate < weekAgo) return false;
      }
    }
    return true;
  });

  // --- LÓGICA DE SELECCIÓN ---
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const selectAllVisible = () => setSelectedIds(filteredShots.map(s => s.id));
  const clearSelection = () => setSelectedIds([]);

  // --- ACCIONES EN LOTE (Lógica Real) ---
  const executeMassApprove = async () => {
    if (!confirmState || confirmState.type !== 'mass_approve') return;
    
    setLoadingShots(true);
    const { error } = await supabase.from('shots').update({ is_approved: true }).in('id', selectedIds);
    if (!error) {
      showSuccess(`${selectedIds.length} shots aprobados.`);
      setShots(prev => prev.filter(s => !selectedIds.includes(s.id)));
      clearSelection();
    } else alert("Error al aprobar en lote");
    setLoadingShots(false);
  };

  const executeMassReject = async () => {
    if (!confirmState || confirmState.type !== 'mass_reject') return;

    setLoadingShots(true);
    const { error } = await supabase.from('shots').delete().in('id', selectedIds);
    if (!error) {
      showSuccess(`${selectedIds.length} shots eliminados.`);
      setShots(prev => prev.filter(s => !selectedIds.includes(s.id)));
      clearSelection();
    } else alert("Error al rechazar en lote");
    setLoadingShots(false);
  };

  const executeSingleReject = async () => {
    if (!confirmState || confirmState.type !== 'single_reject' || !confirmState.id) return;
    
    const id = confirmState.id;
    await supabase.from('shots').delete().eq('id', id);
    setShots(prev => prev.filter(s => s.id !== id));
    setSelectedShot(null);
    showSuccess("Shot eliminado");
  };

  // --- ACCIONES INDIVIDUALES ---
  const handleApprove = async (shotId: string, categoryId?: number) => {
    const shot = shots.find(s => s.id === shotId);
    const updateData: any = { is_approved: true };
    if (categoryId) updateData.category_id = categoryId;

    const { error } = await supabase.from('shots').update(updateData).eq('id', shotId);
    if (error) { alert("Error al aprobar"); return; }

    if (shot) {
      await supabase.from('notifications').insert({
        user_id: shot.user_id, title: '¡Shot Aprobado!', message: `Tu shot "${shot.title}" ya es visible en el muro.`,
        type: 'shot_approved', read: false,
      });
    }
    setShots(prev => prev.filter(s => s.id !== shotId));
    setSelectedShot(null);
    showSuccess("Shot aprobado");
  };

  // --- CONFIGURACIÓN ---
  const fetchSettings = async () => {
    setLoadingSettings(true);
    const { data } = await supabase.from('app_settings').select('value_boolean').eq('key', 'enable_category_filter').single();
    if (data) setCategoryFilterEnabled(data.value_boolean || false);
    setLoadingSettings(false);
  };

  const toggleCategoryFilter = async () => {
    const newValue = !categoryFilterEnabled;
    setCategoryFilterEnabled(newValue);
    await supabase.from('app_settings').update({ value_boolean: newValue, updated_at: new Date().toISOString() }).eq('key', 'enable_category_filter');
    showSuccess(`Filtro ${newValue ? 'ACTIVADO' : 'DESACTIVADO'}`);
  };

  // --- PROMOCIONES ---
  const handlePromote = async (userId: string, newRole: UserRole): Promise<{ success: boolean }> => {
    if (!user) return { success: false };
    const { data: target } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (!target) return { success: false };
    await supabase.from('profiles').update({ role: newRole, promoted_by: user.id, promoted_at: new Date().toISOString() }).eq('id', userId);
    await supabase.from('role_promotions').insert({ user_id: userId, promoted_by: user.id, old_role: target.role, new_role: newRole });
    await supabase.from('notifications').insert({ user_id: userId, title: '🎉 ¡Nuevo Rol!', message: `Has sido promovido a ${newRole}.`, type: 'role_promotion', read: false });
    showSuccess(`Usuario promovido a ${newRole}`);
    return { success: true };
  };

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000); };

  const canManageUsers = user ? hasPermission(user.role, 'canManageUsers') : false;
  const isSuperAdmin = user?.role === 'superadmin';

  // --- RENDER ---
  return (
    <div className="fixed inset-0 z-[60] bg-gray-950 text-gray-100 flex flex-col overflow-hidden">
      
      <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900 p-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-yellow-400">Panel de Administración</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-bold">&times;</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        <div className="w-64 border-r border-gray-800 bg-gray-900 p-4 flex-shrink-0 hidden md:flex flex-col gap-2">
            <Tab label="Pendientes" count={shots.length} active={activeTab === 'shots'} onClick={() => setActiveTab('shots')} />
            {canManageUsers && <Tab label="Miembros" active={activeTab === 'members'} onClick={() => setActiveTab('members')} />}
            {isSuperAdmin && <Tab label="Admins" active={activeTab === 'admins'} onClick={() => setActiveTab('admins')} />}
            {isSuperAdmin && <Tab label="Gestionar" active={activeTab === 'manage'} onClick={() => setActiveTab('manage')} />}
            <Tab label="Configuración" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>

        <div className="flex-1 overflow-y-auto relative flex flex-col">
            
            {activeTab === 'shots' && (
                <>
                    {/* --- DASHBOARD DE ESTADÍSTICAS --- */}
                    <div className="p-4 border-b border-gray-800 bg-gray-900">
                        <AdminStats />
                    </div>

                    {/* BARRA DE HERRAMIENTAS (FILTROS) */}
                    <div className="sticky top-0 bg-gray-900/95 backdrop-blur z-10 p-4 border-b border-gray-800 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input type="text" placeholder="Filtrar por usuario..." value={filterUser} onChange={e => setFilterUser(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500" />
                        <input type="text" placeholder="Palabra clave..." value={filterKeyword} onChange={e => setFilterKeyword(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500" />
                        <select value={filterDate} onChange={e => setFilterDate(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500">
                            <option value="">Todas las fechas</option>
                            <option value="today">Hoy</option>
                            <option value="week">Última semana</option>
                        </select>
                        <div className="flex gap-2 items-center justify-end">
                            <span className="text-xs text-gray-500">{selectedIds.length} sel.</span>
                            <button onClick={selectAllVisible} className="text-xs text-blue-400 hover:underline">Todos</button>
                            <button onClick={clearSelection} className="text-xs text-red-400 hover:underline">Limpiar</button>
                        </div>
                    </div>

                    <div className="flex-1 p-4 pb-24 overflow-y-auto">
                        {loadingShots ? <div className="text-center py-8 text-gray-500">Cargando...</div> :
                         filteredShots.length === 0 ? <div className="text-center py-8 text-gray-600">No hay shots pendientes.</div> :
                         (<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredShots.map(shot => (
                                <AdminShotCard key={shot.id} shot={shot} isSelected={selectedIds.includes(shot.id)} onToggle={() => toggleSelection(shot.id)} onPreview={() => setSelectedShot(shot)} />
                            ))}
                         </div>)
                        }
                    </div>
                </>
            )}

            {activeTab === 'members' && canManageUsers && <div className="p-6"><UserSearch searchRole="subscriber" targetRole="member" title="Promover a Miembros" description="Busca suscriptores." onPromote={handlePromote} /></div>}
            {activeTab === 'admins' && isSuperAdmin && <div className="p-6"><UserSearch searchRole="member" targetRole="admin" title="Promover a Admins" description="Busca miembros." onPromote={handlePromote} /></div>}
            {activeTab === 'manage' && isSuperAdmin && user && <div className="p-6"><RoleManager currentUserId={user.id} /></div>}
            
            {activeTab === 'settings' && (
                <div className="p-6 space-y-8">
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-2xl">
                        <h3 className="text-lg font-bold text-yellow-400 mb-4">Configuración Global</h3>
                        <div className="flex items-center justify-between">
                            <div><h4 className="font-semibold text-white">Filtro por Categorías</h4><p className="text-xs text-gray-500 mt-1">Controla la visibilidad del filtro en el muro.</p></div>
                            <button onClick={toggleCategoryFilter} className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${categoryFilterEnabled ? 'bg-green-500' : 'bg-gray-600'}`}><span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${categoryFilterEnabled ? 'translate-x-7' : 'translate-x-0'}`}></span></button>
                        </div>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-2xl"><CategoryManager /></div>
                </div>
            )}
        </div>
      </div>

      {/* --- BARRA DE ACCIONES FLOTANTE --- */}
      {activeTab === 'shots' && selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t-2 border-yellow-500 p-4 flex justify-center items-center gap-6 shadow-2xl z-50">
            <span className="text-white font-bold">{selectedIds.length} seleccionados</span>
            <button onClick={() => setConfirmState({type: 'mass_approve'})} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition shadow-lg">Aprobar Todo</button>
            <button onClick={() => setConfirmState({type: 'mass_reject'})} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition shadow-lg">Rechazar Todo</button>
            <button onClick={clearSelection} className="text-gray-400 hover:text-white text-sm">Cancelar</button>
        </div>
      )}

      {/* MODAL DE DETALLE INDIVIDUAL */}
      {selectedShot && (
        <AdminShotModal 
          shot={selectedShot} 
          onClose={() => setSelectedShot(null)} 
          onApprove={handleApprove} 
          onReject={(id) => setConfirmState({type: 'single_reject', id})}
        />
      )}

      {/* MODAL DE CONFIRMACIÓN GLOBAL */}
      <ConfirmModal 
        open={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={() => {
            if (confirmState?.type === 'mass_approve') executeMassApprove();
            if (confirmState?.type === 'mass_reject') executeMassReject();
            if (confirmState?.type === 'single_reject') executeSingleReject();
        }}
        title={
            confirmState?.type === 'mass_approve' ? "Aprobar Masivamente" :
            confirmState?.type === 'mass_reject' ? "Rechazar Masivamente" : 
            "Eliminar Shot"
        }
        message={
            confirmState?.type === 'mass_approve' ? `¿Estás seguro de aprobar ${selectedIds.length} shots? Esto publicará todo el contenido seleccionado.` :
            confirmState?.type === 'mass_reject' ? `¿Estás seguro de rechazar ${selectedIds.length} shots? Esta acción es IRREVERSIBLE y eliminará las imágenes.` :
            "Esta acción eliminará el shot permanentemente."
        }
        confirmText={confirmState?.type === 'mass_approve' ? "Sí, aprobar" : "Sí, eliminar"}
        variant={confirmState?.type === 'mass_approve' ? 'primary' : 'danger'}
      />

      {successMsg && <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-2 rounded-full font-bold shadow-lg z-[70] animate-bounce">{successMsg}</div>}
    </div>
  );
}

function Tab({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${active ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
      {label} {count !== undefined && <span className="ml-2 bg-gray-700 px-2 py-0.5 rounded-full text-xs">{count}</span>}
    </button>
  );
}