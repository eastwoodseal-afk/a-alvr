"use client";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import MyShotsOverlay from "./MyShotsOverlay";
import SavedShotsOverlay from "./SavedShotsOverlay";
import AdminPanelOverlay from "./AdminPanelOverlay";
import UserMenuDropdown from "./UserMenuDropdown";
import ModalLogin from "./ModalLogin";
import AboutOverlay from "./AboutOverlay";
import NotificationBell from "./NotificationBell";
import FollowingOverlay from "./FollowingOverlay";
import ConfigurationOverlay from "./ConfigurationOverlay";

export default function Header({ skinUrl }: { skinUrl: string | null }) {
  const { session, user, loading } = useAuth(); 
  const router = useRouter();
  const pathname = usePathname();
  
  const [showMenu, setShowMenu] = useState(false);
  const [showMyShots, setShowMyShots] = useState(false);
  const [showSavedShots, setShowSavedShots] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAbout, setShowAbout] = useState(false); 
  const [bellOpen, setBellOpen] = useState(false); 
  const [showFollowing, setShowFollowing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  const [savedShotsInitialView, setSavedShotsInitialView] = useState<'all' | null>(null);

  const anythingOpen = showMyShots || showSavedShots || showAdmin || showAbout || showFollowing || showMenu || showLoginModal || showConfig;

  const closeAllOverlays = () => {
    setShowMyShots(false);
    setShowSavedShots(false);
    setShowAdmin(false);
    setShowAbout(false);
    setShowFollowing(false);
    setShowMenu(false);
    setBellOpen(false);
    setShowLoginModal(false);
    setShowConfig(false);
  };

  useEffect(() => {
    if (!session) {
      setShowMenu(false);
      setShowMyShots(false);
      setShowSavedShots(false);
      setShowAdmin(false);
      setShowConfig(false);
    }
  }, [session]);

  useEffect(() => {
    if (!showMenu) return;
    function handleClick(e: MouseEvent) {
      const menu = document.getElementById("user-menu-dropdown");
      const btn = document.getElementById("user-menu-btn");
      if (menu && !menu.contains(e.target as Node) && btn && !btn.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  useEffect(() => {
    if (!bellOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-bell-toggle]')) return;
      setBellOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [bellOpen]);

  const handleLogout = async () => {
    closeAllOverlays();
    await supabase.auth.signOut();
  };

  const handleMenuNavigate = (action: 'shots' | 'config' | 'saved' | 'collection') => {
    closeAllOverlays();
    if (action === 'shots') setShowMyShots(true);
    if (action === 'saved') { setSavedShotsInitialView(null); setShowSavedShots(true); }
    if (action === 'collection') { setSavedShotsInitialView('all'); setShowSavedShots(true); }
    if (action === 'config') setShowConfig(true);
  };

   // 🛠️ FUNCIÓN MANEJADORA DEL LOGO
  const handleLogoClick = () => {
    // 1. Si hay algo abierto, ciérralo
    if (anythingOpen) {
      closeAllOverlays();
      return;
    }
    
    // 2. Si ya estamos en /home, recarga completa (como F5)
    if (pathname === '/home') {
      window.location.reload(); 
    } else {
      // 3. Si estamos en otro lado (ej: carátula), ve a /home
      router.push('/home');
    }
  };

  return (
    <>
      <header className={`fixed top-0 left-0 w-full h-14 flex items-center justify-between px-6 shadow z-50 transition-colors duration-500 border-b border-gray-700/50 ${skinUrl ? 'bg-gray-900/40 backdrop-blur-md' : 'bg-gray-900'}`}>
                <div className="flex flex-col gap-0">
          <div className="flex items-center gap-4">
            {/* 🛠️ LOGO CON NUEVA LÓGICA */}
            <div 
              className="bg-yellow-500 rounded-full px-2 h-7 text-lg flex items-center gap-0 cursor-pointer select-none hover:opacity-90 transition" 
              style={{ fontFamily: 'Times New Roman, Times, serif', fontWeight: 400 }} 
              onClick={handleLogoClick}
            >
              <span className="text-black">A'AL</span><span className="text-gray-500">VR</span>
            </div>
            <span className="hidden sm:inline text-white font-normal text-xs sm:text-sm md:text-base lg:text-lg tracking-wide" style={{ fontFamily: 'Times New Roman, Times, serif', fontWeight: 400, letterSpacing: '0.04em' }}>ATENEO D' ARQUITECTURA LATINOAMERICANA</span>
          </div>
          <div className="flex justify-end"><span className="hidden sm:inline text-gray-500 font-semibold text-xs tracking-wide pr-1" style={{ fontFamily: 'Times New Roman, Times, serif', fontWeight: 400, letterSpacing: '0.04em' }}>VALOR Y REGISTRO</span></div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4">
            
          <button onClick={() => { closeAllOverlays(); setShowAbout(!showAbout); }} className={`rounded-full h-7 w-7 flex items-center justify-center transition-all duration-200 border ${showAbout ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-transparent text-gray-500 hover:bg-gray-700 hover:text-white border-gray-700'}`} title="Manifiesto">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
          </button>

          <div onClick={() => { if (anythingOpen) closeAllOverlays(); if (pathname !== '/home') router.push('/home'); }} className="rounded-full h-7 w-7 flex items-center justify-center transition-all duration-200 bg-gray-700 text-gray-200 hover:bg-yellow-500 hover:text-black border border-gray-700 hover:border-yellow-500 cursor-pointer" title="Inicio">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 4L3 20h18L12 4z" /></svg>
          </div>

          {session && (
            <button onClick={() => { closeAllOverlays(); setShowFollowing(!showFollowing); }} className={`rounded-full h-7 w-7 flex items-center justify-center border transition-all duration-200 ${showFollowing ? 'bg-yellow-500 border-yellow-400 text-black' : 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'}`} title="Relaciones">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM19.5 19.125a7.125 7.125 0 00-7.124-7.125 9.067 9.067 0 013.462 2.625c.616.798 1.052 1.714 1.277 2.699.09.39.147.788.166 1.19.005.103.008.207.008.311-.001.119-.002.238-.004.357l-.001.011a.75.75 0 01-.363.63 12.985 12.985 0 01-4.921 1.586c1.32.256 2.69.391 4.092.391 1.936 0 3.81-.333 5.55-.955a.75.75 0 00.39-.596l.001-.119v-.003z" /></svg>
            </button>
          )}

          {session && user && (user.actualRole === 'admin' || user.actualRole === 'superadmin') && (
            <button onClick={() => { closeAllOverlays(); setShowAdmin(!showAdmin); }} className={`rounded-full h-7 w-7 flex items-center justify-center border transition-all duration-200 ${showAdmin ? 'bg-yellow-500 border-yellow-400 text-black' : 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'}`} title="Panel de Administración">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
            </button>
          )}

          {session && (
            <div data-bell-toggle="true" role="button" tabIndex={0} onMouseDown={(e) => e.stopPropagation()} onClick={() => { closeAllOverlays(); setBellOpen(!bellOpen); }} className={`rounded-full h-7 w-7 flex items-center justify-center transition-all duration-200 border cursor-pointer ${bellOpen ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700'}`}>
              <NotificationBell open={bellOpen} onClose={() => setBellOpen(false)} />
            </div>
          )}

          {loading ? (
            <div className="rounded-full h-7 w-7 bg-gray-800 animate-pulse"></div>
          ) : !session ? (
            <button id="user-menu-btn" className="bg-gray-700 text-gray-200 font-semibold rounded-full h-7 w-7 border border-gray-200 hover:bg-gray-800 transition flex items-center justify-center p-0" onClick={() => setShowLoginModal(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-gray-200">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.375 3.375 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </button>
          ) : (
            <button id="user-menu-btn" className={`rounded-full h-7 w-7 flex items-center justify-center border focus:outline-none relative overflow-hidden transition-all duration-200 p-0 ring-2 ring-transparent hover:ring-purple-500 ${anythingOpen ? 'bg-red-500 hover:bg-red-600 border-red-400' : 'bg-yellow-500 border-gray-200'}`} onClick={() => { if (anythingOpen) closeAllOverlays(); else setShowMenu(!showMenu); }}>
              {anythingOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-white font-bold"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-base font-bold text-white select-none pointer-events-none">
                    {((user?.username || session.user.email || "?").charAt(0)).toUpperCase()}
                  </span>
                )
              )}
            </button>
          )}
        </div>
      </header>

      <ModalLogin open={showLoginModal} onClose={() => setShowLoginModal(false)} />
      {showAbout && <AboutOverlay onClose={() => setShowAbout(false)} />}
      {showFollowing && user && <FollowingOverlay userId={user.id} onClose={() => setShowFollowing(false)} />}
      
      {showMenu && session && user && (
        <UserMenuDropdown userEmail={user.username || user.email} userRole={user.role} onCloseMenu={() => setShowMenu(false)} onLogout={handleLogout} onNavigate={handleMenuNavigate} />
      )}

      {showMyShots && session && user && (
        <MyShotsOverlay userId={user.id} onClose={() => setShowMyShots(false)} />
      )}

      {showSavedShots && session && user && (
        <SavedShotsOverlay userId={user.id} onClose={() => setShowSavedShots(false)} initialView={savedShotsInitialView} />
      )}

      {showAdmin && session && user && (
        <AdminPanelOverlay userId={user.id} userRole={user.role} onClose={() => setShowAdmin(false)} />
      )}

      {showConfig && session && user && (
        <ConfigurationOverlay onClose={() => setShowConfig(false)} />
      )}
    </>
  );
}