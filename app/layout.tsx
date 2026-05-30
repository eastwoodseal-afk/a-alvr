import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../lib/AuthContext";
import { FacetProvider } from "../lib/FacetContext"; // 🆕 IMPORT
import Header from "../components/Header";
import Footer from "../components/Footer";
import ModalUsername from "../components/ModalUsername";
import { createClient } from '@supabase/supabase-js';


export const metadata: Metadata = {
  title: "A'AL VR",
  description: "Ateneo d'Arquitectura Latinoamericana - Valor y Registro",
};
export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let skinUrl: string | null = null;
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data } = await supabase.from('app_settings').select('value_text').eq('key', 'skin_url').single();
    skinUrl = data?.value_text || null;
  } catch (e) { console.error("Error fetching skin", e); }

  return (
    <html lang="es">
      <body className="bg-gray-950 text-white flex flex-col min-h-screen">
        <AuthProvider>
          <FacetProvider> {/* 🆕 ENVOLVEMOS LA APP */}
            
            {/* CAPA 0: EL VITRAL */}
            {skinUrl && (
              <div 
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${skinUrl})` }}
              />
            )}
            
            {/* CAPA 1: ESTRUCTURA */}
            <Header skinUrl={skinUrl} />
            
            <main className={`relative z-10 flex-1 w-full overflow-y-auto pt-14 pb-16 ${skinUrl ? 'bg-gray-950/35' : ''}`}>
              {children}
            </main>
            
            <Footer skinUrl={skinUrl} />
            <ModalUsername />
          
          </FacetProvider>
        </AuthProvider>
      </body>
    </html>
  );
}