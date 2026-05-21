"use client";
import React, { useState } from "react";
import AdminPendingShots from "./AdminPendingShots";
import AdminUserManager from "./AdminUserManager";
import AdminCategoryManager from "./AdminCategoryManager";
import AdminTagManager from "./AdminTagManager"; // 🆕 IMPORT
import AdminStats from "./AdminStats";
import AdminSettings from "./AdminSettings";

interface Props {
  userId: string;
  userRole: string;
  onClose: () => void;
}

export default function AdminPanelOverlay({ userId, userRole, onClose }: Props) {
  // 🆕 Añadido 'tags' a los tipos de pestaña
  const [activeTab, setActiveTab] = useState<'shots' | 'users' | 'categories' | 'tags' | 'settings'>('shots');
  const isSuperAdmin = userRole === 'superadmin';

  return (
    <div className="fixed top-14 left-0 right-0 bottom-0 z-[60] bg-gray-950 flex flex-col md:flex-row overflow-hidden">
      
      {/* SIDEBAR IZQUIERDO */}
      <aside className="w-full md:w-48 bg-gray-900/95 backdrop-blur-sm border-r border-gray-700 flex-shrink-0 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="px-3 py-3 border-b border-gray-700">
          <h3 className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">Curaduría</h3>
        </div>

        <div className="flex md:flex-col gap-1 p-2 overflow-x-auto md:overflow-x-hidden">
          <TabButton active={activeTab === 'shots'} onClick={() => setActiveTab('shots')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>} label="Pendientes" />
          
          {isSuperAdmin && (
            <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.684-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>} label="Usuarios" />
          )}

          <TabButton active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>} label="Categorías" />

          {/* 🆕 PESTAÑA DE TAGS */}
          <TabButton active={activeTab === 'tags'} onClick={() => setActiveTab('tags')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>} label="Etiquetas" />

          <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} label="Config" />
        </div>
      </aside>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
        <div className="p-3 flex-1">
          {activeTab === 'shots' && (
            <>
              <AdminStats />
              <AdminPendingShots />
            </>
          )}
          {activeTab === 'users' && isSuperAdmin && <AdminUserManager currentUserId={userId} />}
          {activeTab === 'categories' && <AdminCategoryManager />}
          {activeTab === 'tags' && <AdminTagManager />} {/* 🆕 RENDERIZADO */}
          {activeTab === 'settings' && <AdminSettings />}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`w-full py-1.5 px-2 rounded font-semibold text-left text-xs transition flex items-center gap-2 whitespace-nowrap ${active ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}