import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MarketingHomepage } from "@/components/marketing/marketing-homepage";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://andante.app").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Practice tracker for audition season",
  description:
    "Andante helps classical musicians preparing for NYSSMA, All-State, juries, and conservatory prescreens track practice time, repertoire, recordings, and deadlines—without turning practice into another feed.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Andante | Practice tracker for audition season",
    description:
      "Track practice time and repertoire for NYSSMA, All-State, and conservatory auditions. Recordings, deadlines, and teacher updates in one place.",
    url: "/",
  },
  twitter: {
    title: "Andante | Practice tracker for audition season",
    description:
      "Track practice time and repertoire for NYSSMA, All-State, and conservatory auditions. Recordings, deadlines, and teacher updates in one place.",
  },
};

export default async function Page() {
  if (isSupabaseConfigured()) {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/home");
    }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Andante",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description:
      "Practice tracking for NYSSMA, All-State, and conservatory auditions. Timers, repertoire logs, recordings, deadlines, practice rooms, and teacher updates.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingHomepage />
    </>
  );
}
