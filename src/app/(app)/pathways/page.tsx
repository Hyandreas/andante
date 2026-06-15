import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ReqDot } from "@/components/pathways/req-dot";
import { SubmitTakePanel } from "@/components/pathways/submit-take-panel";
import { Reveal } from "@/components/ui/motion/reveal";
import { ReadinessRing } from "@/components/ui/motion/readiness-ring";
import { EmptyState } from "@/components/ui/empty-state";
import { getPathwaysData } from "@/lib/app-data";
import { requireProEntitlement } from "@/lib/entitlement-server";

interface PageProps {
  searchParams: Promise<{ p?: string }>;
}

// Master-detail. Desktop renders both panes side-by-side. Mobile shows the
// list, then full-screen detail when ?p= is set.
export default async function PathwaysPage({ searchParams }: PageProps) {
  await requireProEntitlement();
  const sp = await searchParams;
  const pathways = await getPathwaysData();

  // Empty-state guard: with no pathways (real/empty account), bail before we
  // dereference `selected` — otherwise SSR throws on `selected.requirements`.
  if (pathways.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex" }}>
        <EmptyState
          title="No pathways yet"
          body="Pathways are audition tracks with cohort telemetry. They'll appear here once your studio or region adds one."
          icon={<Icon name="target" size={18} />}
          fill
        />
      </div>
    );
  }

  const selected = pathways.find((p) => p.id === sp.p) ?? pathways[0];
  const isMobileDrillIn = !!sp.p;

  const reqDone = selected.requirements.filter((r) => r.status === "done").length;
  const reqTotal = selected.requirements.length;
  const reqProgress = reqTotal > 0 ? reqDone / reqTotal : 0;

  return (
    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0,1fr)" }} className="lg:!grid-cols-[320px_1fr]">
      {/* List */}
      <div
        className={isMobileDrillIn ? "hidden lg:!block" : "lg:!block"}
        style={{ borderRight: "0.5px solid var(--color-border)", overflowY: "auto" }}
      >
        <div style={{ padding: "24px 24px 16px", borderBottom: "0.5px solid var(--color-border)" }}>
          <div className="t-section" style={{ fontSize: 20 }}>Pathways</div>
          <div className="t-meta" style={{ marginTop: 4 }}>
            {pathways.length} active · 7,670 musicians
          </div>
        </div>
        {pathways.map((p) => {
          const active = p.id === selected.id;
          return (
            <Link
              key={p.id}
              href={`/pathways?p=${p.id}`}
              className="press"
              style={{
                width: "100%", textAlign: "left",
                padding: "18px 24px",
                borderBottom: "0.5px solid var(--color-border)",
                background: active ? "var(--color-card-fill)" : "transparent",
                display: "flex", flexDirection: "column", gap: 8,
                borderLeft: active ? "2px solid var(--color-text-primary)" : "2px solid transparent",
                textDecoration: "none", color: "inherit",
              }}
            >
              <div className="row-between">
                <span className="t-micro">{p.region}</span>
                <span style={{ fontSize: 14 }}>{p.flag}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: -0.2, lineHeight: 1.25 }}>{p.name}</div>
              <div className="row-between">
                <span className="t-meta">{p.deadline}</span>
                {p.daysLeft != null && (
                  <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
                    {p.daysLeft}d
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Detail */}
      <div
        className={isMobileDrillIn ? "block" : "hidden lg:!block"}
        style={{ overflowY: "auto", padding: "32px 24px 48px" }}
      >
        <div className="lg:hidden" style={{ marginBottom: 12 }}>
          <Link href="/pathways" className="press" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 14, color: "var(--color-text-secondary)", textDecoration: "none",
          }}>
            <Icon name="arrow-left" size={16} /> Pathways
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span className="t-micro">{selected.region}</span>
          <span style={{ fontSize: 14 }}>{selected.flag}</span>
        </div>
        <div className="row-between" style={{ marginBottom: 6, alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: -1, lineHeight: 1.05 }}>{selected.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {selected.daysLeft != null && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 36, fontWeight: 500, letterSpacing: -1, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {selected.daysLeft}
                </div>
                <div className="t-micro">days · {selected.deadline.split("·")[0].trim()}</div>
              </div>
            )}
            <ReadinessRing value={reqProgress} size={84} stroke={4} sublabel="ready" />
          </div>
        </div>
        <div className="t-meta" style={{ marginBottom: 24 }}>
          {selected.enrolled.toLocaleString()} musicians on this pathway · ranked #{selected.yourRank} in cohort
        </div>

        <div style={{
          display: "grid", gap: 16,
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          padding: "20px 0",
          borderTop: "0.5px solid var(--color-border)",
          borderBottom: "0.5px solid var(--color-border)",
          marginBottom: 28,
        }} className="lg:!grid-cols-4">
          {[
            { label: "Cohort avg / week", value: `${selected.cohortAvg.weekHours}h`, you: "11h 24m" },
            { label: "Cohort avg streak", value: `${selected.cohortAvg.streak}d`, you: "23d" },
            { label: "Requirements ready", value: `${reqDone}/${reqTotal}`, you: `${Math.round(reqProgress * 100)}%` },
            { label: "Your percentile", value: `top ${Math.round((selected.yourRank / selected.cohortSize) * 100)}%`, you: `#${selected.yourRank} of ${selected.cohortSize.toLocaleString()}` },
          ].map((s) => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="t-micro">{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.4, fontVariantNumeric: "tabular-nums" }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>You · {s.you}</div>
            </div>
          ))}
        </div>

        <div className="row-between" style={{ marginBottom: 14 }}>
          <div className="t-section">Requirements</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 220 }}>
            <span className="t-micro">{reqDone}/{reqTotal} ready</span>
            <div style={{ flex: 1 }}><ProgressBar value={reqProgress} delay={200} /></div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 32 }}>
          {selected.requirements.map((r, i) => (
            <Reveal key={i} delay={i * 50} distance={6} duration={420}>
              <div style={{
                display: "grid", gap: 16,
                gridTemplateColumns: "auto 1fr auto",
                padding: "16px 0",
                borderBottom: "0.5px solid var(--color-border)",
                alignItems: "center",
              }} className="lg:!grid-cols-[auto_1fr_auto_auto]">
                <ReqDot status={r.status} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{r.label}</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>{r.piece}</div>
                </div>
                <div className="t-micro hidden lg:!block" style={{ minWidth: 64, textAlign: "right" }}>
                  {r.status === "done" ? "ready" : r.status === "active" ? "in progress" : "not started"}
                </div>
                <Link
                  href={r.status === "done" ? "/recordings" : `/session?pathway=${selected.id}&requirement=${r.id}`}
                  className="press"
                  style={{
                    fontSize: 12, color: "var(--color-text-secondary)",
                    padding: "6px 12px", border: "0.5px solid var(--color-border)", borderRadius: 6,
                    textDecoration: "none",
                  }}
                >
                  {r.status === "done" ? "Re-record" : "Open"}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        <div style={{
          padding: "20px 24px",
          borderLeft: "2px solid var(--color-text-primary)",
          background: "var(--color-card-fill)",
          marginBottom: 24,
          fontSize: 14, lineHeight: 1.5, color: "var(--color-text-primary)",
          fontStyle: "italic",
        }}>
          “{selected.insight}”
          <div className="t-micro" style={{ marginTop: 8, fontStyle: "normal" }}>
            From 18 months of cohort telemetry · Andante Insights
          </div>
        </div>

        <SubmitTakePanel requirements={selected.requirements} />

        <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
          <Link href={`/session?pathway=${selected.id}`} className="press" style={{
            padding: "12px 22px", borderRadius: 10,
            background: "var(--color-text-primary)", color: "var(--color-bg)",
            fontSize: 14, fontWeight: 500,
            display: "inline-flex", alignItems: "center", gap: 10,
            textDecoration: "none",
          }}>
            <Icon name="play" size={14} /> Start today&apos;s plan
          </Link>
          <button className="press" style={{
            padding: "12px 18px", borderRadius: 10,
            border: "0.5px solid var(--color-border)", fontSize: 14,
          }}>Submit a take</button>
          <button className="press hidden lg:!inline-flex" style={{
            padding: "12px 18px", borderRadius: 10,
            border: "0.5px solid var(--color-border)", fontSize: 14, marginLeft: "auto",
            alignItems: "center", gap: 8,
          }}>Join study circle <Kbd>⌘J</Kbd></button>
        </div>
      </div>
    </div>
  );
}
