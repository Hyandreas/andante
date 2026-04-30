import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { AmbientField } from "@/components/home/ambient-field";
import { SocialFeed } from "@/components/feed/social-feed";

interface PublicAuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

const proof = [
  "Practice with other musicians without opening a chat.",
  "Keep repertoire tied to dates and requirements.",
  "Open to the piece, timer, and goal that matter today.",
];

export function PublicAuthShell({ eyebrow, title, description, children }: PublicAuthShellProps) {
  return (
    <div className="marketing-page">
      <div className="grain" />
      <div className="marketing-shell" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <header className="marketing-nav">
          <Link href="/" className="marketing-brand">
            <Image src="/logo-black.png" alt="Andante" width={24} height={24} style={{ borderRadius: 7 }} className="logo-light" />
            <Image src="/logo-white.png" alt="Andante" width={24} height={24} style={{ borderRadius: 7 }} className="logo-dark" />
            <span>Andante</span>
          </Link>
          <Link href="/" className="marketing-nav-link" style={{ display: "inline-flex", alignItems: "center" }}>
            Back to homepage
          </Link>
        </header>

        <div
          style={{ display: "grid", gap: 24, flex: 1, alignItems: "stretch", padding: "18px 0 40px" }}
          className="xl:!grid-cols-[minmax(420px,0.8fr)_minmax(0,1fr)]"
        >
          <section className="marketing-auth-panel reveal-up">
            <div className="marketing-eyebrow">{eyebrow}</div>
            <div className="marketing-auth-title">
              {title}
            </div>
            <p style={{ margin: "16px 0 0", color: "var(--marketing-ink-soft)", fontSize: 17, lineHeight: 1.65 }}>
              {description}
            </p>
            <div style={{ marginTop: 26 }}>{children}</div>
          </section>

          <aside className="marketing-auth-stage reveal-up" style={{ animationDelay: "140ms" }}>
            <AmbientField count={24} />
            <div className="marketing-stage-glow marketing-stage-glow-a" />
            <div className="marketing-stage-glow marketing-stage-glow-b" />
            <div className="marketing-stage-grid" />

            <div className="marketing-auth-overlay">
              <div className="marketing-live-pill">
                <span />
                Focus rooms. Timers on. Chat off.
              </div>
              <div className="marketing-auth-stage-title">
                Practice logs built around repertoire, deadlines, and takes.
              </div>
              <div className="marketing-auth-metrics">
                <div className="marketing-stage-card">
                  <div className="marketing-card-kicker">This week</div>
                  <div className="marketing-number">11h 24m</div>
                  <div className="marketing-card-meta">with 4 active pieces and 1 upcoming deadline</div>
                </div>
                <div className="marketing-stage-card">
                  <div className="marketing-card-kicker">Readiness</div>
                  <div style={{ fontSize: 18, fontWeight: 500 }}>Curtis Pre-Screen</div>
                  <div className="marketing-meter" style={{ marginTop: 14 }}>
                    <span style={{ width: "62%" }} />
                  </div>
                  <div className="marketing-card-meta">62% prepared · 23 days left</div>
                </div>
              </div>
              <div className="marketing-stage-card marketing-stage-card-dark" style={{ marginTop: "auto" }}>
                <div className="marketing-stage-header">
                  <div>
                    <div className="marketing-card-kicker" style={{ color: "rgba(250, 244, 236, 0.58)" }}>
                      Recent practice
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 500 }}>Players working right now</div>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <SocialFeed compact />
                </div>
              </div>
              <div className="marketing-auth-proof">
                {proof.map((item) => (
                  <div key={item} className="marketing-proof-item marketing-proof-item-dark">
                    <span />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
