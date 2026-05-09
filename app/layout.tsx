import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { AuthProvider } from "../lib/AuthContext";

export const metadata: Metadata = {
  title: "A'AL",
  description: "App Next.js + Tailwind + Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Linux+Libertine:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      {/* Body oscuro y flexible */}
      <body className="bg-black text-white flex flex-col min-h-screen">
        <AuthProvider>
          <Header />
          {/* 
            main: 
            - flex-1: Ocupa el espacio disponible.
            - pt-14: Respeta la altura del Header.
            - pb-16: Respeta la altura del Footer.
            - overflow-y-auto: El scroll ocurre AQUI, no en el body.
          */}
          <main className="flex-1 w-full overflow-y-auto pt-14 pb-16">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}