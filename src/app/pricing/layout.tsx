import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Free, Pro, and Studio plans for classical musicians and teachers. NYSSMA and All-State prep, recordings, audition deadlines, and studio oversight. Start free.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Andante Pricing",
    description:
      "Free, Pro, and Studio plans for students preparing NYSSMA and All-State auditions, and teachers running a practice studio.",
    url: "/pricing",
  },
  twitter: {
    title: "Andante Pricing",
    description:
      "Free, Pro, and Studio plans for students preparing NYSSMA and All-State auditions, and teachers running a practice studio.",
  },
};

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}
