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
import AdminStats from "./AdminStats";

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

  // --- FUNCIONES SHOTS (Sin cambios lógicos) ---
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
      if (filterDate === 'today') { if (shotDate.toDateString() !== today.toDateString()) return false; }
      if (filterDate === 'week') { const weekAgo = new Date(); weekAgo.setDate(today.getDate() - 7); if (shotDate < weekAgo) return false; }
    }
    return true;
  });

  const toggleSelection = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const selectAllVisible = () => setSelectedIds(filteredShots.map(s => s.id));
  const clearSelection = () => setSelectedIds([]);

  const executeMassApprove = async () => {
    if (!confirmState || confirmState.type !== 'mass_approve') return;
    setLoadingShots(true);
    const { error } = await supabase.from('shots').update({ is_approved: true }).in('id', selectedIds);
    if (!error) { showSuccess(`${selectedIds.length} aprobados.`); setShots(prev => prev.filter(s => !selectedIds.includes(s.id))); clearSelection(); }
    else alert("Error");
    setLoadingShots(false);
  };

  const executeMassReject = async () => {
    if (!confirmState || confirmState.type !== 'mass_reject') return;
    setLoadingShots(true);
    const { error } = await supabase.from('shots').delete().in('id', selectedIds);
    if (!error) { showSuccess(`${selectedIds.length} eliminados.`); setShots(prev => prev.filter(s => !selectedIds.includes(s.id))); clearSelection(); }
    else alert("Error");
    setLoadingShots(false);
  };

  const executeSingleReject = async () => {
    if (!confirmState || confirmState.type !== 'single_reject' || !confirmState.id) return;
    const id = confirmState.id;
    await supabase.from('shots').delete().eq('id', id);
    setShots(prev => prev.filter(s => s.id !== id));
    setSelectedShot(null);
    showSuccess("Eliminado");
  };

  const handleApprove = async (shotId: string, categoryId?: number) => {
    const shot = shots.find(s => s.id === shotId);
    const updateData: any = { is_approved: true };
    if (categoryId) updateData.category_id = categoryId;
    const { error } = await supabase.from('shots').update(updateData).eq('id', shotId);
    if (error) { alert("Error"); return; }
    if (shot) { await supabase.from('notifications').insert({ user_id: shot.user_id, title: '¡Aprobado!', message: `Tu shot "${shot.title}" ya es visible.`, type: 'shot_approved', read: false }); }
    setShots(prev => prev.filter(s => s.id !== shotId));
    setSelectedShot(null);
    showSuccess("Aprobado");
  };

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
    showSuccess(`Filtro ${newValue ? 'ON' : 'OFF'}`);
  };

  const handlePromote = async (userId: string, newRole: UserRole): Promise<{ success: boolean }> => {
    if (!user) return { success: false };
    const { data: target } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (!target) return { success: false };
    await supabase.from('profiles').update({ role: newRole, promoted_by: user.id, promoted_at: new Date().toISOString() }).eq('id', userId);
    await supabase.from('role_promotions').insert({ user_id: userId, promoted_by: user.id, old_role: target.role, new_role: newRole });
    await supabase.from('notifications').insert({ user_id: userId, title: '🎉 ¡Nuevo Rol!', message: `Has sido promovido a ${newRole}.`, type: 'role_promotion', read: false });
    showSuccess(`Promovido`);
    return { success: true };
  };

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 2000); };

  const canManageUsers = user ? hasPermission(user.role, 'canManageUsers') : false;
  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <div className="fixed inset-0 z-[60] bg-gray-950 text-gray-100 flex flex-col overflow-hidden">
      
      {/* HEADER MINI */}
      <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900 py-2 px-3 md:py-4 md:px-6 flex justify-between items-center">
        <h2 className="text-sm md:text-xl font-bold text-yellow-400">Admin</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl font-bold">&times;</button>
      </div>

      {/* NAVEGACIÓN MÓVIL (MUY COMPACTA) */}
      <div className="flex md:hidden overflow-x-auto border-b border-gray-800 bg-gray-900/50 px-1 gap-1 sticky top-0 z-20">
        <MobileTab label="Pendientes" count={shots.length} active={activeTab === 'shots'} onClick={() => setActiveTab('shots')} />
        {canManageUsers && <MobileTab label="Miembros" active={activeTab === 'members'} onClick={() => setActiveTab('members')} />}
        {isSuperAdmin && <MobileTab label="Admins" active={activeTab === 'admins'} onClick={() => setActiveTab('admins')} />}
        {isSuperAdmin && <MobileTab label="Gestionar" active={activeTab === 'manage'} onClick={() => setActiveTab('manage')} />}
        <MobileTab label="Config" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR ESCRITORIO */}
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
                    {/* STATS: OCULTO EN MÓVIL */}
                    <div className="hidden md:block p-4 border-b border-gray-800 bg-gray-900">
                        <AdminStats />
                    </div>

                    {/* FILTROS: COMPACTOS */}
                    <div className="sticky top-0 bg-gray-900/95 backdrop-blur z-10 p-1.5 md:p-4 border-b border-gray-800 grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-3">
                        <input type="text" placeholder="Usuario..." value={filterUser} onChange={e => setFilterUser(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 md:px-3 md:py-2 text-[10px] md:text-sm focus:outline-none" />
                        <input type="text" placeholder="Palabra..." value={filterKeyword} onChange={e => setFilterKeyword(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 md:px-3 md:py-2 text-[10px] md:text-sm focus:outline-none" />
                        <select value={filterDate} onChange={e => setFilterDate(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 md:px-3 md:py-2 text-[10px] md:text-sm focus:outline-none">
                            <option value="">Fechas</option>
                            <option value="today">Hoy</option>
                            <option value="week">Semana</option>
                        </select>
                        <div className="flex gap-1 items-center justify-end text-[10px]">
                            <button onClick={selectAllVisible} className="text-blue-400">Todos</button>
                            <span className="text-gray-600">|</span>
                            <button onClick={clearSelection} className="text-red-400">Limpiar</button>
                        </div>
                    </div>

                    {/* GRID DE SHOTS: 1 COLUMNA EN MÓVIL */}
                    <div className="flex-1 p-1.5 md:p-4 pb-24 overflow-y-auto">
                        {loadingShots ? <div className="text-center py-8 text-gray-500 text-xs">Cargando...</div> :
                         filteredShots.length === 0 ? <div className="text-center py-8 text-gray-600 text-xs">Vacío</div> :
                         (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                            {filteredShots.map(shot => (
                                <AdminShotCard key={shot.id} shot={shot} isSelected={selectedIds.includes(shot.id)} onToggle={() => toggleSelection(shot.id)} onPreview={() => setSelectedShot(shot)} />
                            ))}
                         </div>)
                        }
                    </div>
                </>
            )}

            {/* OTRAS SECCIONES */}
            {activeTab === 'members' && canManageUsers && <div className="p-4 md:p-6"><UserSearch searchRole="subscriber" targetRole="member" title="Promover a Miembros" description="Busca suscriptores." onPromote={handlePromote} /></div>}
            {activeTab === 'admins' && isSuperAdmin && <div className="p-4 md:p-6"><UserSearch searchRole="member" targetRole="admin" title="Promover a Admins" description="Busca miembros." onPromote={handlePromote} /></div>}
            {activeTab === 'manage' && isSuperAdmin && user && <div className="p-4 md:p-6"><RoleManager currentUserId={user.id} /></div>}
            
            {activeTab === 'settings' && (
                <div className="p-4 md:p-6 space-y-6">
                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                        <h3 className="text-sm md:text-lg font-bold text-yellow-400 mb-4">Config</h3>
                        <div className="flex items-center justify-between">
                            <div><h4 className="font-semibold text-white text-xs md:text-sm">Filtro Categorías</h4></div>
                            <button onClick={toggleCategoryFilter} className={`relative w-10 md:w-14 h-5 md:h-7 rounded-full transition-colors ${categoryFilterEnabled ? 'bg-green-500' : 'bg-gray-600'}`}><span className={`absolute top-0.5 left-0.5 w-4 md:w-6 h-4 md:h-6 bg-white rounded-full shadow transition-transform ${categoryFilterEnabled ? 'translate-x-5 md:translate-x-7' : 'translate-x-0'}`}></span></button>
                        </div>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700"><CategoryManager /></div>
                </div>
            )}
        </div>
      </div>

      {/* BARRA FLOTANTE INFERIOR */}
      {activeTab === 'shots' && selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t-2 border-yellow-500 p-1.5 md:p-4 flex justify-center items-center gap-2 md:gap-6 shadow-2xl z-50">
            <span className="text-white font-bold text-xs">{selectedIds.length}</span>
            <button onClick={() => setConfirmState({type: 'mass_approve'})} className="px-4 py-1.5 bg-green-600 text-white font-bold rounded text-xs">Aprobar</button>
            <button onClick={() => setConfirmState({type: 'mass_reject'})} className="px-4 py-1.5 bg-red-600 text-white font-bold rounded text-xs">Rechazar</button>
        </div>
      )}

      {/* MODALES */}
      {selectedShot && (
        <AdminShotModal 
          shot={selectedShot} 
          onClose={() => setSelectedShot(null)} 
          onApprove={handleApprove} 
          onReject={(id) => setConfirmState({type: 'single_reject', id})}
        />
      )}

      <ConfirmModal 
        open={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={() => {
            if (confirmState?.type === 'mass_approve') executeMassApprove();
            if (confirmState?.type === 'mass_reject') executeMassReject();
            if (confirmState?.type === 'single_reject') executeSingleReject();
        }}
        title={confirmState?.type === 'mass_approve' ? "Aprobar" : "Eliminar"}
        message={confirmState?.type === 'mass_approve' ? `¿Aprobar ${selectedIds.length}?` : "¿Eliminar?"}
        confirmText="Sí"
        variant={confirmState?.type === 'mass_approve' ? 'primary' : 'danger'}
      />

      {successMsg && <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-1 rounded-full font-bold shadow-lg z-[70] text-xs">{successMsg}</div>}
    </div>
  );
}

// TABS COMPONENTS
function Tab({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${active ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
      {label} {count !== undefined && <span className="ml-2 bg-gray-700 px-2 py-0.5 rounded-full text-xs">{count}</span>}
    </button>
  );
}

function MobileTab({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex-shrink-0 px-2 py-1 rounded text-[10px] font-semibold transition ${active ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'}`}>
      {label} {count !== undefined && `(${count})`}
    </button>
  );
}