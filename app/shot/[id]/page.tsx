import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';
import ShotShareClient from './ShotShareClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 🆕 WhatsApp lee esto para generar la tarjeta visual
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { data: shot } = await supabase.from('shots').select('title, author, image_url').eq('id', id).eq('is_approved', true).single();

  if (!shot) return { title: 'Shot no encontrado - A\'AL VR' };

  return {
    title: `${shot.author || 'Arquitecto'} - ${shot.title || 'Shot'} | A'AL VR`,
    description: `Descubre esta pieza de ${shot.author || 'arquitectura'} en el Ateneo d'Arquitectura Latinoamericana. Valor y Registro.`,
    openGraph: {
      title: `${shot.author || 'Arquitecto'} - ${shot.title || 'Shot'}`,
      description: `Ateneo d'Arquitectura Latinoamericana. Valor y Registro.`,
      images: [shot.image_url], // 🖼️ La foto que aparece en WhatsApp
    },
  };
}

export default async function ShotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Solo pasamos el ID, el cliente se encargará del redirect
  return <ShotShareClient shotId={id} />;
}