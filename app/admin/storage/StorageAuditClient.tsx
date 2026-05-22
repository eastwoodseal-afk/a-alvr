"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface Orphan { path: string; url: string; size?: number; }
interface ShotItem { 
  id: string; image_url: string; title?: string; author?: string; 
  username?: string; created_at?: string; likes_count?: number; 
  views_count?: number; saved_count?: number; is_rejected?: boolean | null; 
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
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [auditError, setAuditError] = useState('');
  const [deletingPath, setDeletingPath] = useState<string | null>(null);

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
      setDebugInfo(data.debug || null);
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
      else alert("Error al eliminar.");
    } catch { alert("Error de red."); } 
    finally { setDeletingPath(null); }
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
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-3">
        <div>
          <h1 className="text-xl font-bold text-red-400">🔧 Cuarentena</h1>
          <p className="text-[10px] text-gray-600">Basura y anomalías</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/')} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-[10px] font-bold rounded transition">Volver</button>
          <button onClick={runAudit} disabled={loading} className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-[10px] font-bold rounded transition disabled:opacity-50">{loading ? "..." : "Escanear"}</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <StatCard label="Bucket" value={totalBucketFiles} color="blue" />
        <StatCard label="Huérfanos" value={orphans.length} color="red" />
        <StatCard label="Rechazados" value={rejectedShots.length} color="orange" />
        <StatCard label="Ghost" value={ghostShots.length} color="purple" />
      </div>

      {debugInfo && (
        <div className="mb-4 bg-gray-900 p-2 rounded border border-gray-800 text-[8px] font-mono text-gray-600">
          <p className="text-gray-500 font-bold">Debug:</p>
          <p>BD: {JSON.stringify(debugInfo.sampleDbPaths)}</p>
          <p>Bucket: {JSON.stringify(debugInfo.sampleBucketPaths)}</p>
        </div>
      )}

      {auditError && <div className="bg-red-900/30 text-red-400 p-2 rounded text-[10px] mb-4 border border-red-800">{auditError}</div>}

      {/* HUÉRFANOS */}
      <Section title="🔴 Huérfanos (Solo en Bucket)" count={orphans.length}>
        {orphans.map(o => (
          <div key={o.path} className="flex items-center gap-2 bg-gray-900 p-1.5 rounded border border-red-900/40 group">
            <img src={o.url} className="w-10 h-10 object-cover rounded flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[8px] text-gray-400 truncate">{o.path}</p>
              <p className="text-[7px] text-gray-600">{o.size ? `${(o.size/1024).toFixed(0)}KB` : ''}</p>
            </div>
            <button onClick={() => handleDeleteOrphan(o.path)} disabled={deletingPath === o.path} className="bg-red-600 hover:bg-red-500 text-white rounded px-1.5 py-0.5 text-[8px] font-bold opacity-0 group-hover:opacity-100 transition">{deletingPath === o.path ? '...' : 'DEL'}</button>
          </div>
        ))}
      </Section>

      {/* RECHAZADOS */}
      <Section title="🟠 Rechazados (is_rejected = true)" count={rejectedShots.length}>
        {rejectedShots.map(s => <ShotRow key={s.id} shot={s} />)}
      </Section>

      {/* GHOST SHOTS */}
      <Section title="👻 Ghost (En BD, Sin Archivo)" count={ghostShots.length}>
        {ghostShots.map(s => <ShotRow key={s.id} shot={s} isGhost />)}
      </Section>

    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: any = { blue: 'text-blue-400', orange: 'text-orange-400', red: 'text-red-400', purple: 'text-purple-400' };
  return <div className="bg-gray-900 p-2 rounded border border-gray-800 text-center"><div className={`text-lg font-bold ${colors[color]}`}>{value}</div><div className="text-[8px] text-gray-600 uppercase">{label}</div></div>;
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="text-[10px] font-bold text-gray-500 mb-1 border-b border-gray-800 pb-1">{title} ({count})</h2>
      {count === 0 ? <div className="text-gray-700 text-[8px] italic py-1">Limpio.</div> : <div className="space-y-1">{children}</div>}
    </div>
  );
}

function ShotRow({ shot, isGhost }: { shot: ShotItem; isGhost?: boolean }) {
  return (
    <div className="flex items-center gap-2 bg-gray-900 p-1.5 rounded border border-gray-800">
      {isGhost ? (
        <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center text-gray-700 text-[8px] flex-shrink-0">404</div>
      ) : (
        <img src={shot.image_url} className="w-10 h-10 object-cover rounded flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0 text-[8px] space-y-0.5">
        <div className="flex items-center gap-1">
          <span className="text-white font-bold truncate">{shot.title || "Sin título"}</span>
          <span className="text-gray-600">por</span>
          <span className="text-yellow-400 truncate">{shot.author || "?"}</span>
        </div>
        <div className="flex gap-2 text-gray-500">
          <span>@{shot.username}</span>
          <span>❤️{shot.likes_count}</span>
          <span>👁️{shot.views_count}</span>
          <span>💾{shot.saved_count}</span>
        </div>
      </div>
      <div className="flex flex-col items-end flex-shrink-0 text-[7px]">
        <div className="text-red-400 font-bold">rejected: {String(shot.is_rejected)}</div>
        <div className="text-gray-700">ID: {String(shot.id).slice(0,6)}...</div>
      </div>
    </div>
  );
}