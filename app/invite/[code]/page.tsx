import { Metadata } from 'next';
import InviteClient from './InviteClient';

// 🆕 ESTO ES LO QUE HACE QUE WHATSAPP RECONOZCA EL LINK Y HAGA LA TARJETA VISUAL
export const metadata: Metadata = {
  title: "Invitación a Estudio - A'AL VR",
  description: "Te han invitado a ver un Estudio de Arquitectura en el Ateneo d'Arquitectura Latinoamericana. Haz clic para unirte.",
  openGraph: {
    title: "Invitación a Estudio - A'AL VR",
    description: "Un amigo te ha invitado a ver su Estudio de Arquitectura. Ingresa aquí.",
    type: "website",
  },
};

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  return <InviteClient params={params} />;
}