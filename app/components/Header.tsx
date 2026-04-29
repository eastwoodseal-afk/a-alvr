"use client";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import SavedShotsDrawerOverlay from "./SavedShotsDrawerOverlay";
import ProfileOverlay from "./ProfileOverlay";
import ModalLogin from "./ModalLogin";
import ModalUsername from "./ModalUsername";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import UserShots from "./UserShots";

export default function Header() {
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showShotsOverlay, setShowShotsOverlay] = useState(false);
  const [showSavedShotsOverlay, setShowSavedShotsOverlay] = useState(false);
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  const [savedShotsInitialView, setSavedShotsInitialView] = useState<'all' | null>(null);
  
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, followingOnly, toggleFollowingFilter } = useAuth();

  // Helper para cerrar filtro y menú antes de cualquier acción
  const resetFilterAndMenu = () => {
    if (followingOnly) toggleFollowingFilter(); // Apaga el filtro si está encendido
    setShowMenu(false);
  };

  useEffect(() => {
    if (showShotsOverlay || showSavedShotsOverlay || showProfileOverlay) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showShotsOverlay, showSavedShotsOverlay, showProfileOverlay]);

  useEffect(() => {
    if (user && !user.username) setShowUsernameModal(true);
    else setShowUsernameModal(false);
  }, [user]);

  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      const menu = document.getElementById("user-menu-dropdown");
      if (menu && !menu.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  return (
    <>
      <header className="fixed top-0 left-0 w-full flex items-center justify-between py-4 px-6 bg-gray-900 shadow z-50">
        {/* --- LADO IZQUIERDO: LOGO --- */}
        <div className="flex flex-col gap-0">
          <div className="flex items-center gap-4">
            <button
              className="bg-yellow-500 rounded-full px-2 h-[28px] text-lg flex items-center gap-0"
              style={{ fontFamily: 'Times New Roman, Times, serif', fontWeight: 400 }}
              onClick={() => {
                window.dispatchEvent(new Event('close-modals'));
                const anythingOpen = showShotsOverlay || showSavedShotsOverlay || showMenu || showModal || showProfileOverlay;
                setShowShotsOverlay(false);
                setShowSavedShotsOverlay(false);
                setShowMenu(false);
                setShowModal(false);
                setShowProfileOverlay(false);
                if (!anythingOpen && pathname !== '/') {
                  router.push('/');
                }
              }}
            >
              <span className="text-black">A'AL</span><span className="text-gray-500">VR</span>
            </button>
            <span className="hidden sm:inline text-white font-normal text-xs sm:text-sm md:text-base lg:text-lg tracking-wide" style={{ fontFamily: 'Times New Roman, Times, serif', fontWeight: 400, letterSpacing: '0.04em' }}>
              ATENEO D' ARQUITECTURA LATINOAMERICANA
            </span>
          </div>
          <div className="flex justify-end">
            <span className="hidden sm:inline text-gray-500 font-semibold text-xs tracking-wide pr-1" style={{ fontFamily: 'Times New Roman, Times, serif', fontWeight: 400, letterSpacing: '0.04em' }}>
              VALOR Y REGISTRO
            </span>
          </div>
        </div>
        
        {/* --- LADO DERECHO --- */}
        <div className="flex items-center gap-4">
            
            {/* BLOQUE 1: FILTRO "MI GENTE" */}
            {user && (
              <div className="flex items-center">
                <button
                    onClick={toggleFollowingFilter}
                    className={`rounded-full h-[28px] w-[28px] flex items-center justify-center border transition-all duration-200 ${followingOnly ? 'bg-yellow-500 border-yellow-400 text-black' : 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'}`}
                    title={followingOnly ? "Ver todo (Explorar)" : "Ver mi gente (Siguiendo)"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM19.5 19.125a7.125 7.125 0 00-7.124-7.125 9.067 9.067 0 013.462 2.625c.616.798 1.052 1.714 1.277 2.699.09.39.147.788.166 1.19.005.103.008.207.008.311-.001.119-.002.238-.004.357l-.001.011a.75.75 0 01-.363.63 12.985 12.985 0 01-4.921 1.586c1.32.256 2.69.391 4.092.391 1.936 0 3.81-.333 5.55-.955a.75.75 0 00.39-.596l.001-.119v-.003z" />
                    </svg>
                </button>
              </div>
            )}

            {/* BLOQUE 2: USUARIO */}
            {loading ? (
              <div className="flex items-center justify-center h-[28px] w-[28px]">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-yellow-500"></div>
              </div>
            ) : user ? (
              <>
                <button
                  className="rounded-full h-[28px] w-[28px] flex items-center justify-center border border-gray-200 bg-yellow-500 focus:outline-none relative overflow-hidden"
                  onClick={() => setShowMenu(true)}
                  aria-label="Usuario"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-base font-bold text-white select-none pointer-events-none">
                      {(user.username || user.email || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>
                
                {showMenu && (
                  <div className="fixed top-4 right-4 z-50 flex items-start justify-end">
                    <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 w-64 p-6 relative flex flex-col" id="user-menu-dropdown">
                      <button className="absolute top-2 right-2 bg-gray-500 hover:bg-gray-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-lg font-bold shadow" onClick={() => setShowMenu(false)}>&times;</button>
                      
                      {/* Username -> Colección */}
                      <button
                        className="px-2 py-2 text-gray-200 text-sm border-b border-gray-700 mb-2 text-left w-full hover:text-yellow-400"
                        onClick={() => { 
                          resetFilterAndMenu();
                          setSavedShotsInitialView('all');
                          setShowSavedShotsOverlay(true); 
                        }}
                      >{user.username || user.email}</button>

                      {/* Mis Shots */}
                      <button
                        className={`w-full text-left px-2 py-2 text-gray-200 text-sm border-b border-gray-700 ${user?.role === 'subscriber' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'}`}
                        onClick={() => {
                          if (user?.role === 'subscriber') return;
                          resetFilterAndMenu();
                          setShowShotsOverlay(true);
                        }}
                        disabled={user?.role === 'subscriber'}
                      >
                        Mis Shots
                        {user?.role === 'subscriber' && ( <span className="block text-xs text-red-500 mt-1">Solo para Miembros</span> )}
                      </button>
                      
                      {/* Shots Guardados */}
                      <button
                        className="w-full text-left px-2 py-2 text-gray-200 hover:bg-gray-700 text-sm border-b border-gray-700"
                        onClick={() => { 
                          resetFilterAndMenu();
                          setSavedShotsInitialView(null);
                          setShowSavedShotsOverlay(true); 
                        }}
                      >Shots guardados</button>
                      
                      {/* Cerrar Sesión */}
                      <button
                        className="w-full text-left px-2 py-2 text-gray-200 hover:bg-gray-700 rounded-b-lg text-sm"
                        onClick={async () => {
                          resetFilterAndMenu();
                          setShowShotsOverlay(false);
                          setShowSavedShotsOverlay(false);
                          setShowModal(false);
                          await supabase.auth.signOut();
                        }}
                      >Cerrar sesión</button>

                      {/* Configuración */}
                      <button
                        className="w-full text-left px-2 py-2 text-gray-400 hover:text-yellow-400 text-sm mt-2 border-t border-gray-700 flex items-center gap-2"
                        onClick={() => { resetFilterAndMenu(); setShowProfileOverlay(true); }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Configuración
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <button className="bg-gray-700 text-gray-200 font-semibold rounded-full h-[28px] w-[28px] border border-gray-200 hover:bg-gray-800 transition flex items-center justify-center p-0" onClick={() => setShowModal(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-5 w-5 text-gray-200"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20.25a8.25 8.25 0 1115 0v.75A2.25 2.25 0 0117.25 23H6.75A2.25 2.25 0 014.5 21v-.75z" /></svg>
              </button>
            )}
        </div>
      </header>
      
      <ModalLogin open={showModal} onClose={() => setShowModal(false)} />
      <ModalUsername open={showUsernameModal} userId={user?.id ?? ""} onClose={() => setShowUsernameModal(false)} />
      
      {showProfileOverlay && <ProfileOverlay onClose={() => setShowProfileOverlay(false)} />}

      {showShotsOverlay && (
        <div className="fixed inset-0 top-[56px] z-20 flex flex-col items-center justify-start" style={{ minHeight: 'calc(100vh - 56px)', background: '#0a1833' }}>
          <div className="w-full rounded-b-2xl shadow-2xl p-2 pt-2 text-gray-200 flex flex-col items-center relative" style={{ minHeight: 'calc(100vh - 56px)', background: 'transparent' }}>
            <div className="w-full flex items-center px-4 py-3 sticky top-0 bg-[#0a1833] z-10" style={{ borderBottom: '1px solid #facc15' }}>
              <button className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center text-xl font-bold shadow mr-2" onClick={() => setShowShotsOverlay(false)} aria-label="Cerrar"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
              <h2 className="text-left text-base font-semibold">Mis Shots</h2>
            </div>
            <div className="w-full flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}><UserShots userId={user?.id ?? ""} /></div>
          </div>
        </div>
      )}
      
      {showSavedShotsOverlay && <SavedShotsDrawerOverlay userId={user?.id} onClose={() => setShowSavedShotsOverlay(false)} initialView={savedShotsInitialView} />}
    </>
  );
}