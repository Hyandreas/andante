"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { STUDENTS, type Student } from "@/lib/sample-data";
import { demoFixturesEnabled, isSupabaseConfigured } from "@/lib/env";

// The hardcoded roster is demo-only. Real teachers start with an empty studio
// and grow it through invites.
const STUDIO_STUDENTS: Student[] = demoFixturesEnabled() ? STUDENTS : [];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function StudioClient() {
  const totalHrs = STUDIO_STUDENTS.reduce((sum, student) => sum + student.weekHours, 0);
  const [detail, setDetail] = useState<Student | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  const closeInvite = () => {
    setInviteOpen(false);
    setEmail("");
    setInviteError(null);
    setSentTo(null);
  };

  const sendInvite = () => {
    const value = email.trim();
    if (!value) return;
    if (!EMAIL_RE.test(value)) {
      setInviteError("Enter a valid email address.");
      return;
    }
    setInviteError(null);
    setSentTo(value);
    setEmail("");
  };

  return (
    <>
      <div className="row-between" style={{ marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="t-section" style={{ fontSize: 24 }}>Studio</div>
          <div className="t-meta" style={{ marginTop: 4 }}>
            {STUDIO_STUDENTS.length} students · {totalHrs.toFixed(1)}h logged this week
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/digest-preview" className="press" style={{
            padding: "10px 16px", borderRadius: 10,
            border: "0.5px solid var(--color-border)", fontSize: 13,
            textDecoration: "none", color: "inherit",
          }}>Preview parent digest →</Link>
          <button
            className="press"
            onClick={() => setInviteOpen(true)}
            style={{
              padding: "10px 18px", borderRadius: 10,
              background: "var(--color-text-primary)", color: "var(--color-bg)",
              fontSize: 13, fontWeight: 500,
              display: "inline-flex", alignItems: "center", gap: 8,
            }}
          >
            <Icon name="user-plus" size={14} /> Invite student
          </button>
        </div>
      </div>

      {STUDIO_STUDENTS.length === 0 && (
        <EmptyState
          title="Your studio is empty"
          body="Invite your students by email. Once they join, you'll see their weekly hours, streaks, and audition countdowns here."
          icon={<Icon name="user-plus" size={18} />}
          fill
          action={
            <button
              className="press"
              onClick={() => setInviteOpen(true)}
              style={{
                padding: "12px 22px", borderRadius: 10,
                background: "var(--color-text-primary)", color: "var(--color-bg)",
                fontSize: 14, fontWeight: 500,
                display: "inline-flex", alignItems: "center", gap: 8,
              }}
            >
              <Icon name="user-plus" size={14} /> Invite your first student
            </button>
          }
        />
      )}

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(0,1fr)" }} className="md:!grid-cols-2 lg:!grid-cols-3">
        {STUDIO_STUDENTS.map((s, i) => {
          const trendMax = Math.max(...s.trend, 1);
          const inactive = s.weekHours === 0;
          // A student with no practice has an all-zero trend; render a flat
          // minimum bar instead of a collapsed (0-height) chart.
          const hasTrend = s.trend.some((v) => v > 0);
          return (
            <div
              key={s.name}
              role="button"
              tabIndex={0}
              onClick={() => setDetail(s)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setDetail(s);
                }
              }}
              className="card press reveal-up"
              style={{
                padding: 22,
                animationDelay: `${i * 60}ms`,
                border: inactive ? "0.5px solid var(--color-text-primary)" : "0.5px solid transparent",
                cursor: "pointer",
              }}
            >
              <div className="row-between" style={{ marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{s.name}</div>
                  <div className="t-meta" style={{ marginTop: 2 }}>{s.instrument}</div>
                </div>
                {inactive
                  ? <div className="t-micro" style={{ color: "var(--color-text-primary)" }}>⚑ 0 days</div>
                  : <div className="t-micro">{s.streak}d streak</div>}
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                <span className="tabular" style={{ fontSize: 28, fontWeight: 500, letterSpacing: -0.6 }}>
                  {s.weekHours}
                </span>
                <span className="muted" style={{ fontSize: 12 }}>hrs this week</span>
              </div>

              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 36, marginBottom: 14 }}>
                {hasTrend ? (
                  s.trend.map((v, j) => (
                    <div
                      key={j}
                      style={{
                        flex: 1, height: `${Math.max((v / trendMax) * 100, 4).toFixed(2)}%`,
                        background: j === s.trend.length - 1 ? "var(--color-text-primary)" : "var(--color-bar-past)",
                      }}
                    />
                  ))
                ) : (
                  <div style={{
                    alignSelf: "center",
                    width: "100%", height: 3, borderRadius: 2,
                    background: "var(--color-track-empty)",
                  }} title="No practice yet" />
                )}
              </div>

              <div className="row-between" style={{ paddingTop: 14, borderTop: "0.5px solid var(--color-border)" }}>
                <span className="t-micro">Audition in {s.daysToAudition}d</span>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{s.pieces.length} pieces →</span>
              </div>
            </div>
          );
        })}
      </div>

      <BottomSheet open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? "Student"}>
        {detail && <StudentDetail student={detail} />}
      </BottomSheet>

      <BottomSheet open={inviteOpen} onClose={closeInvite} title="Invite a student">
        {sentTo ? (
          <div className="col" style={{ gap: 16, alignItems: "flex-start" }}>
            <div style={{
              width: 44, height: 44, borderRadius: 999,
              background: "var(--color-card-fill-deep)",
              display: "grid", placeItems: "center",
            }}>
              <Icon name="check" size={20} />
            </div>
            <div>
              <div className="t-card-label">{configured ? "Invite sent" : "Demo: invite not actually sent"}</div>
              <div className="t-meta" style={{ marginTop: 4 }}>
                {configured
                  ? `${sentTo} will get an email to join your studio.`
                  : `In a connected studio, ${sentTo} would get an email to join. No email was sent in demo mode.`}
              </div>
            </div>
            <div className="row" style={{ gap: 12, width: "100%" }}>
              <button
                className="cta"
                style={{ background: "transparent", color: "var(--color-text-primary)", border: "0.5px solid var(--color-border)" }}
                onClick={() => setSentTo(null)}
              >Invite another</button>
              <button className="cta" onClick={closeInvite}>Done</button>
            </div>
          </div>
        ) : (
          <div className="col" style={{ gap: 14 }}>
            <div className="t-meta">
              {configured
                ? "They'll get an email invite to join your studio and share their practice log, streak, and takes."
                : "Demo mode: invites are validated but no email is actually sent."}
            </div>
            <input
              className="input"
              type="email"
              placeholder="student@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (inviteError) setInviteError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") sendInvite(); }}
              autoFocus
            />
            {inviteError && (
              <div className="t-meta" style={{ color: "var(--color-danger)" }}>{inviteError}</div>
            )}
            <button className="cta" disabled={!email.trim()} onClick={sendInvite}>
              {configured ? "Send invite" : "Validate invite (demo)"}
            </button>
          </div>
        )}
      </BottomSheet>
    </>
  );
}

function StudentDetail({ student }: { student: Student }) {
  const maxPieceHours = Math.max(...student.pieces.map((p) => p.hours), 1);
  const inactive = student.weekHours === 0;
  return (
    <div className="col" style={{ gap: 18 }}>
      <div style={{ border: "0.5px solid var(--color-border)", borderRadius: 10 }}>
        <DetailRow label="Instrument" value={student.instrument} />
        <DetailRow label="This week" value={`${student.weekHours}h`} />
        <DetailRow label="Streak" value={inactive ? "⚑ 0 days" : `${student.streak} days`} />
        <DetailRow label="Next audition" value={`in ${student.daysToAudition} days`} last />
      </div>

      <div>
        <div className="t-micro" style={{ marginBottom: 12 }}>Pieces this week</div>
        <div className="col" style={{ gap: 14 }}>
          {student.pieces.map((p) => (
            <div key={p.name}>
              <div className="row-between" style={{ marginBottom: 6 }}>
                <span className="t-card-label">{p.name}</span>
                <span className="t-meta tabular">{p.hours}h</span>
              </div>
              <ProgressBar value={p.hours / maxPieceHours} animateOnMount={false} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 16,
      padding: "12px 16px",
      borderBottom: last ? "none" : "0.5px solid var(--color-border)",
    }}>
      <span className="t-caption muted">{label}</span>
      <span className="t-card-label" style={{ textAlign: "right" }}>{value}</span>
    </div>
  );
}
