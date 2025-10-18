"use client";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { usePathname } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Movemos metadata fuera del componente de cliente
// export const metadata: Metadata = {
//   title: "PSI Plataforma Integral",
//   description:
//     "Landing de PSI: Vision Hub y CRM-COM. Centraliza marketing, ventas y gestión de clientes.",
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  
  // No mostrar Navbar y Footer en CRM
  const isCrmRoute = pathname?.startsWith('/crm');
  
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <title>PSI Plataforma Integral</title>
        <meta name="description" content="Landing de PSI: Vision Hub y CRM-COM. Centraliza marketing, ventas y gestión de clientes." />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ToastProvider>
          <AuthProvider>
            {!isCrmRoute && <Navbar />}
            {children}
            {!isCrmRoute && <Footer />}
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
