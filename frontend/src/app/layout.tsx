import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoiceShield Lab — Vishing & Synthetic Audio Defense",
  description: "Laboratorio Académico de Ingeniería Social asistida por IA: Clonación de Voz y Detección de Llamadas Fraudulentas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased selection:bg-cyan-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
