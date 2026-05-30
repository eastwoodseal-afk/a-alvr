"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface Orphan { path: string; url: string; size?: number; }
interface ShotItem { 
  id: string; image_url: string; title?: string; author?: string; 
  username?: string; created_at?: string; likes_count?: number; 
  views_count?: number; saved_count?: number; is_rejected?: boolean | null; 
  is_approved?: boolean | null;
}

export default function StorageAuditClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [session, setSession] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [orphans, setOrphans] = useState<Orphan[]>([]);
  const [rejectedShots, setRejectedShots] = useState<ShotItem[]>([]);
  const [ghostShots, setGhostShots] = useState<ShotItem[]>([]);
  const [totalBucketFiles, setTotalBucketFiles] = useState(0);
  const [auditError, setAuditError] = useState('');
  
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [deletingShotId, setDeletingShotId] = useState<string | null>(null);
  const [adoptingShotId, setAdoptingShotId] = useState<string | null>(null);
  
  const [abandonedShots, setAbandonedShots] = useState<ShotItem[]>([]);
  const [ghostPending, setGhostPending] = useState<ShotItem[]>([]);
  const [externalUrls, setExternalUrls] = useState<ShotItem[]>([]);
  const [allGhostShots, setAllGhostShots] = useState<ShotItem[]>([]);

  // 🆕 ESTADOS PARA INSPECTOR DE USUARIO
  const [activeTab, setActiveTab] = useState<'audit' | 'inspector'>('audit');
  const [searchUsername, setSearchUsername] = useState("");
  const [foundUserShots, setFoundUserShots] = useState<ShotItem[]>([]);
  const [searchingUser, setSearchingUser] = useState(false);
  const [searchUserError, setSearchUserError] = useState("");

  useEffect(() => { checkExistingSession(); }, []);

  const checkExistingSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) { await validateRole(session); } 
    else { setAuthLoading(false); }
  };

  const validateRole = async (sess: any) => {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', sess.user.id).single();
    setIsSuperAdmin(profile?.role === 'superadmin');
    setSession(sess);
    setAuthLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(''); setAuthLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoginError(error.message); setAuthLoading(false); }
    else if (data.session) { await validateRole(data.session); }
  };

  const runAudit = async () => {
    if (!session) return;
    setLoading(true); setAuditError('');
    try {
      const res = await fetch('/api/storage-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: session.access_token })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en auditoría');
      setOrphans(data.orphans || []);
      setRejectedShots(data.rejectedShots || []);
      setGhostShots(data.ghostShots || []);
      setTotalBucketFiles(data.totalBucketFiles || 0);
      setAbandonedShots(data.abandonedShots || []);
      setGhostPending(data.ghostPending || []);
      setExternalUrls(data.externalUrls || []);
      setAllGhostShots(data.allGhostShots || []);
    } catch (err: any) { setAuditError(err.message); } 
    finally { setLoading(false); }
  };

  const handleDeleteOrphan = async (path: string) => {
    if (!session) return;
    setDeletingPath(path);
    try {
      const res = await fetch('/api/storage-audit', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: session.access_token, path })
      });
      if (res.ok) setOrphans(prev => prev.filter(o => o.path !== path));
      else alert("Error al eliminar archivo.");
    } catch { alert("Error de red."); } 
    finally { setDeletingPath(null); }
  };

  const handleDeleteShot = async (shotId: string) => {
    if (!session) return;
    setDeletingShotId(shotId);
    try {
      const res = await fetch('/api/storage-audit', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: session.access_token, shotId })
      });
      if (res.ok) {
        setAbandonedShots(prev => prev.filter(s => s.id !== shotId));
        setRejectedShots(prev => prev.filter(s => s.id !== shotId));
        setGhostPending(prev => prev.filter(s => s.id !== shotId));
        setExternalUrls(prev => prev.filter(s => s.id !== shotId));
        setAllGhostShots(prev => prev.filter(s => s.id !== shotId));
        setFoundUserShots(prev => prev.filter(s => s.id !== shotId)); // 🆕 Limpiar inspector también
      } else {
        const data = await res.json();
        alert(data.error || "Error al eliminar el shot.");
      }
    } catch { alert("Error de red."); } 
    finally { setDeletingShotId(null); }
  };

  const handleAdoptShot = async (shotId: string) => {
    if (!session) return;
    setAdoptingShotId(shotId);
    try {
      const res = await fetch('/api/storage-audit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: session.access_token, shotId })
      });
      if (res.ok) {
        setGhostPending(prev => prev.filter(s => s.id !== shotId));
        setAbandonedShots(prev => prev.filter(s => s.id !== shotId));
        setExternalUrls(prev => prev.filter(s => s.id !== shotId));
        setRejectedShots(prev => prev.filter(s => s.id !== shotId));
        setAllGhostShots(prev => prev.filter(s => s.id !== shotId));
        setFoundUserShots(prev => prev.filter(s => s.id !== shotId)); // 🆕 Limpiar inspector también
      } else {
        const data = await res.json();
        alert(data.error || "Error al adoptar el shot.");
      }
    } catch { alert("Error de red."); } 
    finally { setAdoptingShotId(null); }
  };

  // 🆕 FUNCIÓN: BUSCAR SHOTS DE USUARIO
  const handleSearchUser = async () => {
    if (!searchUsername.trim()) return;
    setSearchingUser(true);
    setSearchUserError("");
    setFoundUserShots([]);

    try {
      // 1. Buscar ID del perfil
      const { data: profile, error: profError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', searchUsername.trim())
        .single();

      if (profError || !profile) {
        setSearchUserError("Usuario no encontrado.");
        setSearchingUser(false);
        return;
      }

      // 2. Buscar Shots
      const { data: shots, error: shotsError } = await supabase
        .from('shots')
        .select('id, image_url, title, author, likes_count, views_count, is_approved, is_rejected')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (shotsError) throw shotsError;

      if (shots) {
        setFoundUserShots(shots.map(s => ({ ...s, id: String(s.id), username: searchUsername })));
      }
      
    } catch (err) {
      setSearchUserError("Error al buscar datos.");
    } finally {
      setSearchingUser(false);
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-500 text-sm animate-pulse">Verificando...</div>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white p-4">
        <div className="w-full max-w-sm bg-gray-900 p-6 rounded-xl border border-red-900/50 shadow-2xl">
          <h2 className="text-xl font-bold text-red-400 mb-2 text-center">🔧 Acceso Restringido</h2>
          <p className="text-xs text-gray-500 text-center mb-6">Solo Superadmins.</p>
          <form onSubmit={handleLogin} className="space-y-3">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none" required />
            <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none" required />
            {loginError && <div className="text-red-400 text-[10px] text-center">{loginError}</div>}
            <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded text-sm transition">Ingresar</button>
          </form>
          <button onClick={() => router.push('/')} className="w-full mt-4 text-xs text-gray-600 hover:text-white transition">Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-[1800px] mx-auto">
      <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-3">
        <div>
          <h1 className="text-xl font-bold text-red-400">🔧 Cuarentena</h1>
          <p className="text-[10px] text-gray-600">Basura, anomalías e inspección del sistema</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/')} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-[10px] font-bold rounded transition">Volver</button>
        </div>
      </div>

      {/* 🆕 SISTEMA DE PESTAÑAS */}
      <div className="flex gap-2 mb-6 border-b border-gray-700">
        <button 
          onClick={() => setActiveTab('audit')} 
          className={`px-4 py-2 text-xs font-bold transition border-b-2 ${activeTab === 'audit' ? 'border-yellow-500 text-yellow-400' : 'border-transparent text-gray-500 hover:text-white'}`}
        >
          Auditoría Técnica
        </button>
        <button 
          onClick={() => setActiveTab('inspector')} 
          className={`px-4 py-2 text-xs font-bold transition border-b-2 ${activeTab === 'inspector' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-white'}`}
        >
          🔍 Inspector de Usuario
        </button>
      </div>

      {/* TAB 1: AUDITORÍA TÉCNICA (El contenido original) */}
      {activeTab === 'audit' && (
        <>
          <div className="flex justify-end mb-4">
             <button onClick={runAudit} disabled={loading} className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-[10px] font-bold rounded transition disabled:opacity-50">{loading ? "..." : "Escanear Sistema"}</button>
          </div>

          <div className="grid grid-cols-8 gap-2 mb-6">
            <StatCard label="Bucket" value={totalBucketFiles} color="blue" />
            <StatCard label="Huérfanos" value={orphans.length} color="red" />
            <StatCard label="Rechazados" value={rejectedShots.length} color="orange" />
            <StatCard label="Abandonados" value={abandonedShots.length} color="purple" />
            <StatCard label="Ghost" value={ghostShots.length} color="gray" />
            <StatCard label="Ghost Pend." value={ghostPending.length} color="yellow" />
            <StatCard label="URLs Ext." value={externalUrls.length} color="pink" />
            <StatCard label="Total Fantasma" value={allGhostShots.length} color="indigo" />
          </div>

          {auditError && <div className="bg-red-900/30 text-red-400 p-2 rounded text-[10px] mb-4 border border-red-800">{auditError}</div>}

          <Section title="👻 Ghost + No Aprobados (El Limbo)" count={ghostPending.length}>
            <p className="text-[9px] text-yellow-500 mb-2 italic">Shots del Fantasma que nunca fueron aprobados ni rechazados. Invisibles en la app.</p>
            <div className="columns-4 md:columns-6 lg:columns-8 gap-2 w-full">
              {ghostPending.map(s => <AuditShotCard key={s.id} shot={s} onDelete={handleDeleteShot} onAdopt={handleAdoptShot} isDeleting={deletingShotId === s.id} isAdopting={adoptingShotId === s.id} />)}
            </div>
          </Section>

          <Section title="🔗 URLs Externas (Fósiles)" count={externalUrls.length}>
            <p className="text-[9px] text-pink-500 mb-2 italic">Shots que dependen de servidores externos. Si el servidor externo cae, la imagen desaparece del Ateneo.</p>
            <div className="columns-4 md:columns-6 lg:columns-8 gap-2 w-full">
              {externalUrls.map(s => <AuditShotCard key={s.id} shot={s} onDelete={handleDeleteShot} onAdopt={handleAdoptShot} isDeleting={deletingShotId === s.id} isAdopting={adoptingShotId === s.id} />)}
            </div>
          </Section>

          <Section title="🔴 Huérfanos (Solo en Bucket)" count={orphans.length}>
            <div className="columns-4 md:columns-6 lg:columns-8 gap-2 w-full">
              {orphans.map(o => (
                <div key={o.path} className="relative mb-2 break-inside-avoid rounded-lg overflow-hidden border border-red-900/40 group bg-gray-900">
                  <img src={o.url} className="w-full h-auto object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button onClick={() => handleDeleteOrphan(o.path)} disabled={deletingPath === o.path} className="bg-red-600 hover:bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg shadow-lg transition disabled:opacity-50">
                      {deletingPath === o.path ? '...' : '🗑️'}
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                    <p className="text-[9px] text-gray-400 truncate">{o.path.split('/').pop()}</p>
                    <p className="text-[8px] text-gray-500">{o.size ? `${(o.size/1024).toFixed(0)}KB` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="🟠 Rechazados (is_rejected = true)" count={rejectedShots.length}>
            <div className="columns-4 md:columns-6 lg:columns-8 gap-2 w-full">
              {rejectedShots.map(s => <AuditShotCard key={s.id} shot={s} onDelete={handleDeleteShot} isDeleting={deletingShotId === s.id} />)}
            </div>
          </Section>

          <Section title="💀 Abandonados (Ghost + Rechazado + No Aprobado)" count={abandonedShots.length}>
            <div className="columns-4 md:columns-6 lg:columns-8 gap-2 w-full">
              {abandonedShots.map(s => <AuditShotCard key={s.id} shot={s} onDelete={handleDeleteShot} isDeleting={deletingShotId === s.id} />)}
            </div>
          </Section>

          <Section title="📉 Ghost (En BD, Sin Archivo Físico)" count={ghostShots.length}>
            <div className="columns-4 md:columns-6 lg:columns-8 gap-2 w-full">
              {ghostShots.map(s => <AuditShotCard key={s.id} shot={s} isGhost />)}
            </div>
          </Section>

          <Section title="👤 Todos los Shots del Fantasma (Cotejo)" count={allGhostShots.length}>
            <p className="text-[9px] text-indigo-500 mb-2 italic">Vista completa de todo lo que pertenece al Usuario Fantasma en la base de datos, sin importar su estado.</p>
            <div className="columns-4 md:columns-6 lg:columns-8 gap-2 w-full">
              {allGhostShots.map(s => {
                let statusColor = "border-gray-600";
                let statusText = "Aprobado";
                if (s.is_rejected) { statusColor = "border-red-500"; statusText = "Rechazado"; }
                else if (!s.is_approved) { statusColor = "border-yellow-500"; statusText = "Pendiente"; }
                
                return (
                  <div key={s.id} className={`relative mb-2 break-inside-avoid rounded-lg overflow-hidden border ${statusColor} group bg-gray-900`}>
                    <img src={s.image_url} className="w-full h-auto object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button onClick={() => handleAdoptShot(s.id)} disabled={adoptingShotId === s.id} className="bg-blue-600 hover:bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg shadow-lg transition disabled:opacity-50" title="Adoptar">
                        {adoptingShotId === s.id ? '...' : '🤝'}
                      </button>
                      <button onClick={() => handleDeleteShot(s.id)} disabled={deletingShotId === s.id} className="bg-red-600 hover:bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg shadow-lg transition disabled:opacity-50" title="Eliminar">
                        {deletingShotId === s.id ? '...' : '🗑️'}
                      </button>
                    </div>
                    <div className="absolute top-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-[8px] font-bold text-white">{statusText}</div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 pointer-events-none">
                      <div className="text-[11px] text-white font-bold truncate">{s.title || "Sin título"}</div>
                      <div className="text-[10px] text-yellow-400 truncate">{s.author || "?"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </>
      )}

      {/* 🆕 TAB 2: INSPECTOR DE USUARIO */}
      {activeTab === 'inspector' && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-400 mb-4">🔍 Inspector de Usuario</h3>
          <p className="text-xs text-gray-500 mb-6">Ingresa un nombre de usuario para ver todas las URLs de sus shots (sin filtrar por estado).</p>

          <div className="flex gap-2 mb-6">
            <input 
              type="text" 
              placeholder="Nombre de usuario (ej: arquitecto_ejemplo)" 
              value={searchUsername} 
              onChange={(e) => setSearchUsername(e.target.value)} 
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
            />
            <button 
              onClick={handleSearchUser} 
              disabled={searchingUser} 
              className="px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm disabled:opacity-50 transition"
            >
              {searchingUser ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {searchUserError && <div className="text-red-400 text-sm mb-4">{searchUserError}</div>}

          {foundUserShots.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-gray-300 border-b border-gray-700 pb-2">Resultados para: <span className="text-white">@{searchUsername}</span> ({foundUserShots.length} shots)</h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-400">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="p-2">Imagen</th>
                      <th className="p-2">Título</th>
                      <th className="p-2">Estado</th>
                      <th className="p-2">URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foundUserShots.map(shot => (
                      <tr key={shot.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition">
                        <td className="p-2">
                          <img src={shot.image_url} className="w-16 h-16 object-cover rounded" alt="Thumb" />
        </td>
                        <td className="p-2 align-top">{shot.title || "Sin título"}</td>
                        <td className="p-2 align-top">
                           <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${shot.is_approved ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                             {shot.is_approved ? 'Aprobado' : 'No Aprobado'}
                           </span>
                        </td>
                        <td className="p-2 align-top">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-gray-600 truncate max-w-xs">{shot.image_url}</span>
                            <a 
                              href={shot.image_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-[10px] font-bold flex-shrink-0 transition"
                              title="Abrir en nueva pestaña"
                            >
                              Abrir ↗
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: any = { blue: 'text-blue-400', orange: 'text-orange-400', red: 'text-red-400', purple: 'text-purple-400', gray: 'text-gray-400', yellow: 'text-yellow-400', pink: 'text-pink-400', indigo: 'text-indigo-400' };
  return <div className="bg-gray-900 p-2 rounded border border-gray-800 text-center"><div className={`text-lg font-bold ${colors[color]}`}>{value}</div><div className="text-[8px] text-gray-600 uppercase">{label}</div></div>;
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-bold text-gray-400 mb-2 border-b border-gray-800 pb-2">{title} ({count})</h2>
      {count === 0 ? <div className="text-gray-700 text-[9px] italic py-1">Limpio.</div> : children}
    </div>
  );
}

function AuditShotCard({ shot, isGhost, onDelete, onAdopt, isDeleting, isAdopting }: { shot: ShotItem; isGhost?: boolean; onDelete?: (id: string) => void; onAdopt?: (id: string) => void; isDeleting?: boolean; isAdopting?: boolean }) {
  return (
    <div className="relative mb-2 break-inside-avoid rounded-lg overflow-hidden border border-gray-800 group bg-gray-900">
      {isGhost ? (
        <div className="w-full aspect-square bg-gray-800 flex items-center justify-center text-gray-700 text-xs font-bold">404</div>
      ) : (
        <img src={shot.image_url} className="w-full h-auto object-cover" />
      )}
      
      {(onDelete || onAdopt) && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          {onAdopt && (
            <button onClick={() => onAdopt(shot.id)} disabled={isAdopting} className="bg-blue-600 hover:bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg shadow-lg transition disabled:opacity-50" title="Adoptar (Transferir a mi cuenta)">
              {isAdopting ? '...' : '🤝'}
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(shot.id)} disabled={isDeleting} className="bg-red-600 hover:bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg shadow-lg transition disabled:opacity-50" title="Eliminar Registro">
              {isDeleting ? '...' : '🗑️'}
            </button>
          )}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 pointer-events-none">
        <div className="text-[11px] text-white font-bold truncate">{shot.title || "Sin título"}</div>
        <div className="text-[10px] text-yellow-400 truncate">{shot.author || "?"}</div>
        <div className="flex gap-2 text-[9px] text-gray-400 mt-0.5">
          <span>@{shot.username}</span>
          <span>❤️{shot.likes_count}</span>
          <span>👁️{shot.views_count}</span>
        </div>
      </div>
    </div>
  );
}