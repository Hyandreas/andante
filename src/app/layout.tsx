import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import Script from "next/script";
import { ServiceWorkerRegister } from "@/components/app/sw-register";
import { ThemeProvider } from "@/lib/theme";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://andante.app";
const siteDescription =
  "Practice tracker for classical musicians preparing NYSSMA, All-State, and conservatory auditions. Log sessions, track repertoire, record takes, and hit every deadline.";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Andante",
  title: {
    default: "Andante | Practice tracker for audition season",
    template: "%s | Andante",
  },
  description: siteDescription,
  keywords: [
    "practice tracker",
    "NYSSMA prep",
    "All-State audition",
    "conservatory prescreen",
    "audition preparation",
    "classical musicians",
    "audition prep app",
    "music practice app",
    "practice log for musicians",
    "music competition prep",
    "teacher practice log",
    "recording feedback",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/logo-black.png",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Andante",
    title: "Andante | Practice tracker for audition season",
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "Andante | Practice tracker for audition season",
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Andante",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();",
          }}
        />
      </head>
      <body>
        <ServiceWorkerRegister />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
