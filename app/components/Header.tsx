"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SavedShotsDrawerOverlay from "./SavedShotsDrawerOverlay";
import ModalLogin from "./ModalLogin";
import ModalUsername from "./ModalUsername";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import UserShots from "./UserShots";
import SavedShots from "./SavedShots";

export default function Header() {
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [profileUsername, setProfileUsername] = useState("");
  const [showShotsOverlay, setShowShotsOverlay] = useState(false);
  const [showSavedShotsOverlay, setShowSavedShotsOverlay] = useState(false);
  // Bloquear scroll del body cuando overlays están abiertos
  useEffect(() => {
    if (showShotsOverlay || showSavedShotsOverlay) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showShotsOverlay, showSavedShotsOverlay]);
  const router = useRouter();
  const { user, loading } = useAuth();

  // Mostrar modal de username si el usuario está logueado y no tiene username
  useEffect(() => {
    if (user && !user.username) {
      setShowUsernameModal(true);
    } else {
      setShowUsernameModal(false);
    }
  }, [user]);
  useEffect(() => {
    if (user === null && !loading) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchProfile() {
      if (user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        if (data?.username) setProfileUsername(data.username);
      } else {
        setProfileUsername("");
      }
    }
    fetchProfile();
  }, []);

  useEffect(() => {
    async function fetchProfile() {
      if (user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        if (data?.username) setProfileUsername(data.username);
      } else {
        setProfileUsername("");
      }
    }
    fetchProfile();
  }, [user]);

  // Cerrar menú al hacer click fuera
  React.useEffect(() => {
    if (!showMenu) return;
    function handleClick(e: MouseEvent) {
      const menu = document.getElementById("user-menu-dropdown");
      if (menu && !menu.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  return (
    <>
      <header className="fixed top-0 left-0 w-full flex items-center justify-between py-4 px-6 bg-gray-900 shadow z-50">
        <div className="flex flex-col gap-0">
          <div className="flex items-center gap-4">
            <button
              className="bg-yellow-500 rounded-full px-2 h-[28px] text-lg flex items-center gap-0"
              style={{ fontFamily: 'Times New Roman, Times, serif', fontWeight: 400 }}
              onClick={() => {
                if (showShotsOverlay || showSavedShotsOverlay || showMenu || showModal) {
                  setShowShotsOverlay(false);
                  setShowSavedShotsOverlay(false);
                  setShowMenu(false);
                  setShowModal(false);
                } else {
                  window.location.href = "/";
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
        {loading ? (
          <div className="flex items-center justify-center h-[28px] w-[28px]">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-yellow-500"></div>
          </div>
        ) : user ? (
          <>
            <button
              className="rounded-full h-[28px] w-[28px] flex items-center justify-center border border-gray-200 bg-yellow-500 focus:outline-none relative"
              onClick={() => setShowMenu(true)}
              aria-label="Usuario"
            >
              <span className="text-base font-bold text-white select-none pointer-events-none">
                {(profileUsername || user.email || "?").charAt(0).toUpperCase()}
              </span>
            </button>
            {showMenu && (
              <div className="fixed top-4 right-4 z-50 flex items-start justify-end">
                <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 w-64 p-6 relative flex flex-col">
                  <button
                    className="absolute top-2 right-2 bg-gray-500 hover:bg-gray-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-lg font-bold shadow"
                    onClick={() => setShowMenu(false)}
                    aria-label="Cerrar"
                  >
                    &times;
                  </button>
                  <button
                    className="px-2 py-2 text-gray-200 text-sm border-b border-gray-700 mb-2 text-left w-full hover:text-yellow-400"
                    onClick={() => { setShowMenu(false); window.location.href = "/profile"; }}
                  >{profileUsername || user.email}</button>
                  <button
                    className={`w-full text-left px-2 py-2 text-gray-200 text-sm border-b border-gray-700 ${user?.role === 'subscriber' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'}`}
                    onClick={() => {
                      if (user?.role === 'subscriber') return;
                      setShowSavedShotsOverlay(false);
                      setShowShotsOverlay(true);
                      setShowMenu(false);
                    }}
                    disabled={user?.role === 'subscriber'}
                  >
                    Mis Shots
                    {user?.role === 'subscriber' && (
                      <span className="block text-xs text-red-500 mt-1">Solo para Miembros</span>
                    )}
                  </button>
                  <button
                    className="w-full text-left px-2 py-2 text-gray-200 hover:bg-gray-700 text-sm border-b border-gray-700"
                    onClick={() => { setShowSavedShotsOverlay(true); setShowMenu(false); }}
                  >Shots guardados</button>
                  <button
                    className="w-full text-left px-2 py-2 text-gray-200 hover:bg-gray-700 rounded-b-lg text-sm"
                    onClick={async () => {
                      setShowMenu(false);
                      setShowShotsOverlay(false);
                      setShowSavedShotsOverlay(false);
                      setShowModal(false);
                      await supabase.auth.signOut();
                      
                    }}
                  >Cerrar sesión</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <button className="bg-gray-700 text-gray-200 font-semibold rounded-full h-[28px] w-[28px] border border-gray-200 hover:bg-gray-800 transition flex items-center justify-center p-0" onClick={() => setShowModal(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-5 w-5 text-gray-200">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20.25a8.25 8.25 0 1115 0v.75A2.25 2.25 0 0117.25 23H6.75A2.25 2.25 0 014.5 21v-.75z" />
            </svg>
          </button>
        )}
      </header>
      <ModalLogin open={showModal} onClose={() => setShowModal(false)} />
      {/* Modal de username forzado global */}
      <ModalUsername open={showUsernameModal} userId={user?.id ?? ""} onClose={() => setShowUsernameModal(false)} />
      {showShotsOverlay && (
        <div className="fixed inset-0 top-[56px] z-20 flex flex-col items-center justify-start" style={{ minHeight: 'calc(100vh - 56px)', background: '#0a1833' }}>
          <div className="w-full rounded-b-2xl shadow-2xl p-2 pt-2 text-gray-200 flex flex-col items-center relative" style={{ minHeight: 'calc(100vh - 56px)', background: 'transparent' }}>
            <div className="w-full flex items-center justify-between px-4 py-3 sticky top-0 bg-[#0a1833] z-10" style={{ borderBottom: '1px solid #facc15' }}>
              <h2 className="text-left text-base font-semibold">Mis Shots</h2>
              <button
                className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center text-xl font-bold shadow ml-2"
                onClick={() => setShowShotsOverlay(false)}
                aria-label="Cerrar"
              >
                &times;
              </button>
            </div>
            <div className="w-full flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
              {/* Shots del usuario */}
              <UserShots userId={user?.id ?? ""} />
            </div>
          </div>
        </div>
      )}
      {showSavedShotsOverlay && (
        <SavedShotsDrawerOverlay userId={user?.id} onClose={() => setShowSavedShotsOverlay(false)} />
      )}
    </>
  );
}