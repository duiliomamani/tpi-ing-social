import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoiceShield Lab — Voice Cloning & Audio Analysis",
  description: "Laboratorio académico de clonación de voz autorizada, análisis acústico y evaluación de riesgo en comunicaciones.",
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
