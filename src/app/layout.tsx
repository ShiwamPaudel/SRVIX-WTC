import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { PWARegister } from "@/components/pwa-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SRVIX - WTC",
  description: "Scalable Service Management System Made for your Business - Automate the Service Workflow",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon-srvix.png",
    shortcut: "/favicon-srvix.png",
    apple: "/favicon-srvix.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SRVIX",
  },
};

export const viewport: Viewport = {
  themeColor: "#12384f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <PWARegister />
        <Toaster
          richColors
          closeButton
          position="top-right"
          toastOptions={{
            classNames: {
              toast: "srvix-toast",
              title: "srvix-toast-title",
              description: "srvix-toast-description",
            },
          }}
        />
      </body>
    </html>
  );
}
