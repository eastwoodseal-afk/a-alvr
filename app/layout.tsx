import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../lib/AuthContext";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ModalUsername from "../components/ModalUsername";

export const metadata: Metadata = {
  title: "A'AL VR",
  description: "Ateneo d'Arquitectura Latinoamericana - Valor y Registro",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-gray-950 text-white">
        <AuthProvider>
          <Header />
          <main className="flex-1 w-full overflow-y-auto pt-14 pb-16">
            {children}
          </main>
          <Footer />
          <ModalUsername />
        </AuthProvider>
      </body>
    </html>
  );
}