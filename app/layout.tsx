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
      <body className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black">
        <AuthProvider>
          <Header />
          <main className="flex-1 w-full overflow-y-auto p-0" style={{ paddingBottom: '80px' }}>
            {children}
          </main>
          <Footer />
        </AuthProvider>
        {/* Footer fijo */}
        <style>{`
          footer {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 50;
          }
        `}</style>
      </body>
    </html>
  );
}
