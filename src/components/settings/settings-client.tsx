"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { rememberAuthEmail } from "@/lib/auth-memory";
import { normalizeEmail, withLoginParams } from "@/lib/auth-routes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { useSessionStore } from "@/store/session-store";
import type {
  DensityPreference,
  FocusType,
  SubscriptionRow,
  ThemePreference,
  UserPreferenceRow,
  UserRole,
} from "@/lib/supabase/types";
import { useTheme } from "@/lib/theme";

const INSTRUMENTS = ["Violin","Viola","Cello","Bass","Piano","Voice","Flute","Oboe","Clarinet","Bassoon","Trumpet","Horn","Trombone","Other"];
const GOAL_OPTIONS = [30, 45, 60, 75, 90, 120];
const REGION_OPTIONS = ["🇺🇸", "🇨🇦", "🇬🇧", "🇪🇺", "🇯🇵", "🇰🇷", "🇨🇳", "🇦🇺"];
const FOCUS_OPTIONS: Array<{ id: FocusType; label: string }> = [
  { id: "repertoire", label: "Repertoire" },
  { id: "scales", label: "Scales" },
  { id: "etudes", label: "Etudes" },
  { id: "sight-reading", label: "Sight-reading" },
];
const TIMEZONE_OPTIONS = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Australia/Sydney",
];
const REMINDER_DAYS = [
  { id: "mon", label: "M" },
  { id: "tue", label: "T" },
  { id: "wed", label: "W" },
  { id: "thu", label: "T" },
  { id: "fri", label: "F" },
  { id: "sat", label: "S" },
  { id: "sun", label: "S" },
];

type PreferenceForm = Pick<
  UserPreferenceRow,
  | "theme"
  | "reduced_motion"
  | "density"
  | "default_focus_type"
  | "practice_reminder_enabled"
  | "practice_reminder_days"
  | "email_practice_reminders"
  | "push_practice_reminders"
  | "parent_digest_emails"
  | "product_emails"
> & {
  practice_reminder_time: string;
};

const DEFAULT_PREFERENCES: PreferenceForm = {
  theme: "system",
  reduced_motion: false,
  density: "comfortable",
  default_focus_type: "repertoire",
  practice_reminder_enabled: false,
  practice_reminder_time: "18:00",
  practice_reminder_days: ["mon", "tue", "wed", "thu", "fri"],
  email_practice_reminders: true,
  push_practice_reminders: false,
  parent_digest_emails: true,
  product_emails: true,
};

interface Props {
  email: string;
  displayName: string;
  instrument: string;
  regionFlag: string;
  dailyGoalMin: number;
  timezone: string;
  role: UserRole;
  subscription: SubscriptionRow | null;
  preferences: UserPreferenceRow | null;
  vapidPublicKey: string;
}

function preferenceForm(row: UserPreferenceRow | null): PreferenceForm {
  if (!row) return DEFAULT_PREFERENCES;
  return {
    theme: row.theme ?? DEFAULT_PREFERENCES.theme,
    reduced_motion: row.reduced_motion ?? DEFAULT_PREFERENCES.reduced_motion,
    density: row.density ?? DEFAULT_PREFERENCES.density,
    default_focus_type: row.default_focus_type ?? DEFAULT_PREFERENCES.default_focus_type,
    practice_reminder_enabled: row.practice_reminder_enabled ?? DEFAULT_PREFERENCES.practice_reminder_enabled,
    practice_reminder_time: (row.practice_reminder_time ?? DEFAULT_PREFERENCES.practice_reminder_time).slice(0, 5),
    practice_reminder_days: row.practice_reminder_days?.length ? row.practice_reminder_days : DEFAULT_PREFERENCES.practice_reminder_days,
    email_practice_reminders: row.email_practice_reminders ?? DEFAULT_PREFERENCES.email_practice_reminders,
    push_practice_reminders: row.push_practice_reminders ?? DEFAULT_PREFERENCES.push_practice_reminders,
    parent_digest_emails: row.parent_digest_emails ?? DEFAULT_PREFERENCES.parent_digest_emails,
    product_emails: row.product_emails ?? DEFAULT_PREFERENCES.product_emails,
  };
}

function applyDensity(density: DensityPreference) {
  localStorage.setItem("density", density);
  document.documentElement.setAttribute("data-density", density);
}

function sameDays(a: string[], b: string[]) {
  return [...a].sort().join(",") === [...b].sort().join(",");
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function SettingsClient({
  email,
  displayName,
  instrument,
  regionFlag,
  dailyGoalMin,
  timezone,
  role,
  subscription,
  preferences,
  vapidPublicKey,
}: Props) {
  const router = useRouter();
  const { setTheme, setReducedMotion } = useTheme();
  const initialPrefs = useMemo(() => preferenceForm(preferences), [preferences]);

  const [profileBase, setProfileBase] = useState({ name: displayName, instrument, regionFlag });
  const [name, setName] = useState(displayName);
  const [inst, setInst] = useState(instrument);
  const [flag, setFlag] = useState(regionFlag);
  const [profileStatus, setProfileStatus] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [practiceBase, setPracticeBase] = useState({ dailyGoalMin, timezone, prefs: initialPrefs });
  const [goal, setGoal] = useState(dailyGoalMin);
  const [tz, setTz] = useState(timezone);
  const [prefs, setPrefs] = useState<PreferenceForm>(initialPrefs);
  const [preferenceStatus, setPreferenceStatus] = useState("");
  const [savingPreferences, setSavingPreferences] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [accountError, setAccountError] = useState("");
  const [workingAccount, setWorkingAccount] = useState<string | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    setTheme(initialPrefs.theme, { animate: false });
    setReducedMotion(initialPrefs.reduced_motion);
    applyDensity(initialPrefs.density);
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushPermission("unsupported");
    } else {
      setPushPermission(Notification.permission);
    }
  }, [initialPrefs, setReducedMotion, setTheme]);

  // Demo-mode persistence: when Supabase isn't configured, hydrate any locally
  // saved profile/preferences so settings survive navigation.
  useEffect(() => {
    if (isSupabaseConfigured()) return;
    if (typeof window === "undefined") return;
    try {
      const rawProfile = localStorage.getItem("andante.demoProfile");
      if (rawProfile) {
        const p = JSON.parse(rawProfile) as { name?: string; instrument?: string; regionFlag?: string };
        if (typeof p.name === "string") { setName(p.name); setProfileBase((b) => ({ ...b, name: p.name! })); }
        if (typeof p.instrument === "string") { setInst(p.instrument); setProfileBase((b) => ({ ...b, instrument: p.instrument! })); }
        if (typeof p.regionFlag === "string") { setFlag(p.regionFlag); setProfileBase((b) => ({ ...b, regionFlag: p.regionFlag! })); }
      }
      const rawPrefs = localStorage.getItem("andante.demoPrefs");
      if (rawPrefs) {
        const p = JSON.parse(rawPrefs) as Partial<PreferenceForm> & { goal?: number; tz?: string };
        if (typeof p.goal === "number") { setGoal(p.goal); setPracticeBase((b) => ({ ...b, dailyGoalMin: p.goal! })); }
        if (typeof p.tz === "string") { setTz(p.tz); setPracticeBase((b) => ({ ...b, timezone: p.tz! })); }
        // Restore the full preference object so notification toggles, theme,
        // density, etc. survive reload in demo mode (previously dropped).
        const restored: PreferenceForm = {
          theme: p.theme ?? DEFAULT_PREFERENCES.theme,
          reduced_motion: p.reduced_motion ?? DEFAULT_PREFERENCES.reduced_motion,
          density: p.density ?? DEFAULT_PREFERENCES.density,
          default_focus_type: p.default_focus_type ?? DEFAULT_PREFERENCES.default_focus_type,
          practice_reminder_enabled: p.practice_reminder_enabled ?? DEFAULT_PREFERENCES.practice_reminder_enabled,
          practice_reminder_time: p.practice_reminder_time ?? DEFAULT_PREFERENCES.practice_reminder_time,
          practice_reminder_days: p.practice_reminder_days?.length ? p.practice_reminder_days : DEFAULT_PREFERENCES.practice_reminder_days,
          email_practice_reminders: p.email_practice_reminders ?? DEFAULT_PREFERENCES.email_practice_reminders,
          push_practice_reminders: p.push_practice_reminders ?? DEFAULT_PREFERENCES.push_practice_reminders,
          parent_digest_emails: p.parent_digest_emails ?? DEFAULT_PREFERENCES.parent_digest_emails,
          product_emails: p.product_emails ?? DEFAULT_PREFERENCES.product_emails,
        };
        setPrefs(restored);
        setPracticeBase((b) => ({ ...b, prefs: restored }));
        setTheme(restored.theme, { animate: false });
        setReducedMotion(restored.reduced_motion);
        applyDensity(restored.density);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profileDirty = name !== profileBase.name || inst !== profileBase.instrument || flag !== profileBase.regionFlag;
  const preferencesDirty =
    goal !== practiceBase.dailyGoalMin ||
    tz !== practiceBase.timezone ||
    prefs.theme !== practiceBase.prefs.theme ||
    prefs.reduced_motion !== practiceBase.prefs.reduced_motion ||
    prefs.density !== practiceBase.prefs.density ||
    prefs.default_focus_type !== practiceBase.prefs.default_focus_type ||
    prefs.practice_reminder_enabled !== practiceBase.prefs.practice_reminder_enabled ||
    prefs.practice_reminder_time !== practiceBase.prefs.practice_reminder_time ||
    !sameDays(prefs.practice_reminder_days, practiceBase.prefs.practice_reminder_days) ||
    prefs.email_practice_reminders !== practiceBase.prefs.email_practice_reminders ||
    prefs.push_practice_reminders !== practiceBase.prefs.push_practice_reminders ||
    prefs.parent_digest_emails !== practiceBase.prefs.parent_digest_emails ||
    prefs.product_emails !== practiceBase.prefs.product_emails;

  const planLabel = subscription?.plan ? subscription.plan[0].toUpperCase() + subscription.plan.slice(1) : "Free";
  const cadenceLabel = subscription?.cadence ? ` · ${subscription.cadence}` : "";
  const statusLabel = subscription?.status ? ` · ${subscription.status}` : "";

  const setPreference = <Key extends keyof PreferenceForm>(key: Key, value: PreferenceForm[Key]) => {
    setPrefs((current) => ({ ...current, [key]: value }));
    if (key === "theme") setTheme(value as ThemePreference);
    if (key === "reduced_motion") setReducedMotion(Boolean(value));
    if (key === "density") applyDensity(value as DensityPreference);
  };

  const saveProfile = async () => {
    if (!profileDirty) return;
    setSavingProfile(true);
    setProfileStatus("");
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sign in to save profile settings.");
        const { error } = await supabase.from("users").update({
          display_name: name.trim() || null,
          instrument: inst || null,
          region_flag: flag || null,
        }).eq("id", user.id);
        if (error) throw error;
        router.refresh();
      } else {
        try {
          localStorage.setItem("andante.demoProfile", JSON.stringify({
            name, instrument: inst, regionFlag: flag,
          }));
        } catch {}
      }
      setProfileBase({ name, instrument: inst, regionFlag: flag });
      setProfileStatus("Saved.");
    } catch (err) {
      setProfileStatus((err as Error).message || "Could not save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePreferences = async () => {
    if (!preferencesDirty) return;
    setSavingPreferences(true);
    setPreferenceStatus("");
    try {
      setTheme(prefs.theme);
      setReducedMotion(prefs.reduced_motion);
      applyDensity(prefs.density);

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sign in to save preferences.");
        const prefPayload = {
          user_id: user.id,
          theme: prefs.theme,
          reduced_motion: prefs.reduced_motion,
          density: prefs.density,
          default_focus_type: prefs.default_focus_type,
          practice_reminder_enabled: prefs.practice_reminder_enabled,
          practice_reminder_time: `${prefs.practice_reminder_time}:00`,
          practice_reminder_days: prefs.practice_reminder_days,
          email_practice_reminders: prefs.email_practice_reminders,
          push_practice_reminders: prefs.push_practice_reminders,
          parent_digest_emails: prefs.parent_digest_emails,
          product_emails: prefs.product_emails,
          updated_at: new Date().toISOString(),
        };
        const [{ error: userError }, { error: prefError }] = await Promise.all([
          supabase.from("users").update({ daily_goal_min: goal, timezone: tz }).eq("id", user.id),
          supabase.from("user_preferences").upsert(prefPayload, { onConflict: "user_id" }),
        ]);
        if (userError) throw userError;
        if (prefError) throw prefError;
        router.refresh();
      } else {
        try {
          // Persist the FULL preference object (not just goal/tz) so notification
          // toggles, theme, density, etc. survive reload in demo mode.
          localStorage.setItem("andante.demoPrefs", JSON.stringify({ goal, tz, ...prefs }));
        } catch {}
      }

      setPracticeBase({ dailyGoalMin: goal, timezone: tz, prefs });
      setPreferenceStatus("Saved.");
    } catch (err) {
      setPreferenceStatus((err as Error).message || "Could not save preferences.");
    } finally {
      setSavingPreferences(false);
    }
  };

  const requestEmailChange = async () => {
    const next = newEmail.trim();
    if (!next || next === email) return;
    setWorkingAccount("email");
    setAccountStatus("");
    setAccountError("");
    try {
      if (!isSupabaseConfigured()) {
        setAccountStatus("Email change is available when Supabase is configured.");
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ email: next });
      if (error) throw error;
      setNewEmail("");
      setAccountStatus("Check your inbox to confirm the new email.");
    } catch (err) {
      setAccountError((err as Error).message || "Could not request email change.");
    } finally {
      setWorkingAccount(null);
    }
  };

  const sendPasswordReset = async () => {
    setWorkingAccount("password");
    setAccountStatus("");
    setAccountError("");
    try {
      if (!isSupabaseConfigured()) {
        setAccountStatus("Password reset is available when Supabase is configured.");
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setAccountStatus("Password reset email sent.");
    } catch (err) {
      setAccountError((err as Error).message || "Could not send reset email.");
    } finally {
      setWorkingAccount(null);
    }
  };

  const openBillingPortal = async () => {
    setAccountStatus("");
    setAccountError("");
    if (!isSupabaseConfigured()) {
      setAccountStatus("Demo mode: billing is available when the app is connected to a live account.");
      return;
    }
    setWorkingAccount("billing");
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const payload = await response.json().catch(() => ({})) as { url?: string; fallbackUrl?: string; error?: string };
      if (response.ok && payload.url) {
        window.location.assign(payload.url);
        return;
      }
      if (payload.fallbackUrl) {
        router.push(payload.fallbackUrl);
        return;
      }
      throw new Error(payload.error || "Billing portal is not available.");
    } catch (err) {
      setAccountError((err as Error).message || "Could not open billing.");
    } finally {
      setWorkingAccount(null);
    }
  };

  const signOut = async () => {
    setWorkingAccount("signout");
    try {
      // Reset any in-progress practice session so a running timer doesn't bleed
      // across accounts after sign-out.
      useSessionStore.getState().stop();
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
      }
      if ("caches" in window) {
        await caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
      }
      const rememberedEmail = normalizeEmail(email);
      rememberAuthEmail(rememberedEmail);
      router.push(withLoginParams({ email: rememberedEmail, notice: "signed-out" }));
    } finally {
      setWorkingAccount(null);
    }
  };

  const deleteAccount = async () => {
    if (deleteText !== "DELETE") return;
    setAccountStatus("");
    setAccountError("");
    if (!isSupabaseConfigured()) {
      setAccountStatus("Demo mode: account deletion is disabled. Connect a live account to manage deletion.");
      setDeleteText("");
      return;
    }
    setWorkingAccount("delete");
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not delete account.");
      router.push("/signup");
    } catch (err) {
      setAccountError((err as Error).message || "Could not delete account.");
    } finally {
      setWorkingAccount(null);
    }
  };

  const updatePushPreference = async (enabled: boolean) => {
    setPreferenceStatus("");
    if (!enabled) {
      try {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (subscription && isSupabaseConfigured()) {
            await fetch("/api/notifications/push-subscription", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ endpoint: subscription.endpoint }),
            });
          }
          await subscription?.unsubscribe();
        }
      } finally {
        setPreference("push_practice_reminders", false);
      }
      return;
    }

    try {
      if (!isSupabaseConfigured()) throw new Error("Browser push is available when Supabase is configured.");
      if (!vapidPublicKey) throw new Error("Browser push is not configured.");
      if (typeof Notification === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Browser push is not supported here.");
      }
      let permission = Notification.permission;
      if (permission === "default") permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== "granted") throw new Error("Browser push permission was not granted.");

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const response = await fetch("/api/notifications/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not save push subscription.");
      setPreference("push_practice_reminders", true);
    } catch (err) {
      setPreference("push_practice_reminders", false);
      setPreferenceStatus((err as Error).message || "Could not enable browser push.");
    }
  };

  return (
    <div className="settings-shell">
      <header className="settings-header reveal-up">
        <div>
          <div className="t-micro">Settings</div>
          <h1>Control room</h1>
        </div>
        <Link
          href={role === "teacher" ? "/home" : "/teacher"}
          className="settings-role-pill press"
          title={role === "teacher" ? "Switch to musician view" : "Switch to teacher view"}
          style={{ textDecoration: "none", cursor: "pointer" }}
        >
          {role === "teacher" ? "Teacher" : "Musician"}
        </Link>
      </header>

      <div className="settings-layout">
        <aside className="settings-rail">
          <a href="#profile">Profile</a>
          <a href="#account">Account</a>
          <a href="#preferences">Preferences</a>
          <a href="#notifications">Notifications</a>
        </aside>

        <div className="settings-stack">
          <section id="profile" className="settings-panel reveal-up">
            <PanelHeader eyebrow="Profile" title="Musician identity" />
            <div className="settings-two-col">
              <div className="settings-form">
                <Field label="Display name" htmlFor="display-name">
                  <input id="display-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name shown in Andante" />
                </Field>
                <Field label="Instrument">
                  <div className="chip-row">
                    {INSTRUMENTS.map((item) => (
                      <button key={item} type="button" onClick={() => setInst(inst === item ? "" : item)} className={`chip press ${inst === item ? "active" : ""}`}>
                        {item}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Region">
                  <div className="settings-flag-row">
                    {REGION_OPTIONS.map((item) => (
                      <button key={item} type="button" onClick={() => setFlag(flag === item ? "" : item)} className={`settings-flag-button press ${flag === item ? "active" : ""}`}>
                        {item}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
              <div className="settings-preview">
                <div className="t-micro">Public preview</div>
                <div className="settings-preview-name">{flag || "•"} {name.trim() || "You"}</div>
                <div className="t-meta">{inst || "Musician"} · Cohorts and leaderboards</div>
                <div className="settings-preview-meter"><span /><span /><span /><span /></div>
              </div>
            </div>
            <SaveRow dirty={profileDirty} saving={savingProfile} status={profileStatus} onSave={saveProfile} />
          </section>

          <section id="account" className="settings-panel reveal-up">
            <PanelHeader eyebrow="Account" title="Access and billing" />
            <div className="settings-form">
              <Field label="Current email" htmlFor="current-email">
                <input id="current-email" className="input" value={email} disabled style={{ opacity: 0.7 }} />
              </Field>
              <div className="settings-inline-control">
                <Field label="New email" htmlFor="new-email">
                  <input id="new-email" className="input" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="you@studio.edu" />
                </Field>
                <button className="settings-secondary-button press" disabled={!newEmail.trim() || workingAccount === "email"} onClick={requestEmailChange}>
                  <Icon name="mail" size={16} /> Request
                </button>
              </div>
              <div className="settings-account-grid">
                <div>
                  <div className="t-meta">Password</div>
                  <button className="settings-secondary-button press" disabled={workingAccount === "password"} onClick={sendPasswordReset}>
                    <Icon name="shield" size={16} /> Send reset email
                  </button>
                </div>
                <div>
                  <div className="t-meta">Plan</div>
                  <div className="settings-plan-row">
                    <span className="settings-status-pill">{planLabel}{cadenceLabel}{statusLabel}</span>
                    {subscription?.plan && subscription.plan !== "free"
                      ? <button className="settings-secondary-button press" disabled={workingAccount === "billing"} onClick={openBillingPortal}><Icon name="credit-card" size={16} /> Manage</button>
                      : <Link href="/pricing" className="settings-secondary-link press"><Icon name="credit-card" size={16} /> Upgrade</Link>}
                  </div>
                </div>
              </div>
              <div className="settings-action-row">
                <button className="settings-secondary-button press" disabled={workingAccount === "signout"} onClick={signOut}>
                  <Icon name="log-out" size={16} /> Sign out
                </button>
              </div>
              <div className="settings-danger">
                <div>
                  <div className="t-card-label">Delete account</div>
                  <div className="t-meta">This permanently removes your Andante data.</div>
                </div>
                <input className="input" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="Type DELETE" />
                <button className="settings-danger-button press" disabled={deleteText !== "DELETE" || workingAccount === "delete"} onClick={deleteAccount}>
                  <Icon name="trash" size={16} /> Delete
                </button>
              </div>
              {(accountStatus || accountError) && (
                <div className={`settings-message ${accountError ? "error" : ""}`}>{accountError || accountStatus}</div>
              )}
            </div>
          </section>

          <section id="preferences" className="settings-panel reveal-up">
            <PanelHeader eyebrow="Preferences" title="Practice defaults" />
            <div className="settings-form">
              <Field label="Daily goal">
                <Segmented>
                  {GOAL_OPTIONS.map((item) => (
                    <button key={item} type="button" className={goal === item ? "active" : ""} onClick={() => setGoal(item)}>{item}</button>
                  ))}
                </Segmented>
              </Field>
              <div className="settings-inline-control">
                <Field label="Timezone" htmlFor="timezone">
                  <select id="timezone" className="input" value={tz} onChange={(e) => setTz(e.target.value)}>
                    {!TIMEZONE_OPTIONS.includes(tz) && <option value={tz}>{tz}</option>}
                    {TIMEZONE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </Field>
                <button className="settings-secondary-button press" onClick={() => setTz(Intl.DateTimeFormat().resolvedOptions().timeZone)}>
                  <Icon name="target" size={16} /> Detect
                </button>
              </div>
              <Field label="Default focus">
                <Segmented>
                  {FOCUS_OPTIONS.map((item) => (
                    <button key={item.id} type="button" className={prefs.default_focus_type === item.id ? "active" : ""} onClick={() => setPreference("default_focus_type", item.id)}>{item.label}</button>
                  ))}
                </Segmented>
              </Field>
              <Field label="Theme">
                <Segmented>
                  {(["system", "light", "dark"] as ThemePreference[]).map((item) => (
                    <button key={item} type="button" className={prefs.theme === item ? "active" : ""} onClick={() => setPreference("theme", item)}>{item}</button>
                  ))}
                </Segmented>
              </Field>
              <Field label="Density">
                <Segmented>
                  {(["comfortable", "compact"] as DensityPreference[]).map((item) => (
                    <button key={item} type="button" className={prefs.density === item ? "active" : ""} onClick={() => setPreference("density", item)}>{item}</button>
                  ))}
                </Segmented>
              </Field>
              <ToggleRow label="Reduced motion" checked={prefs.reduced_motion} onChange={(checked) => setPreference("reduced_motion", checked)} />
            </div>
            <SaveRow dirty={preferencesDirty} saving={savingPreferences} status={preferenceStatus} onSave={savePreferences} />
          </section>

          <section id="notifications" className="settings-panel reveal-up">
            <PanelHeader eyebrow="Notifications" title="Practice reminders" />
            <div className="settings-form">
              <ToggleRow label="Practice reminder" checked={prefs.practice_reminder_enabled} onChange={(checked) => setPreference("practice_reminder_enabled", checked)} />
              <Field label="Reminder time" htmlFor="reminder-time">
                <input id="reminder-time" className="input" type="time" value={prefs.practice_reminder_time} onChange={(e) => setPreference("practice_reminder_time", e.target.value)} />
              </Field>
              <Field label="Reminder days">
                <div className="settings-day-row">
                  {REMINDER_DAYS.map((day) => {
                    const active = prefs.practice_reminder_days.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        className={`settings-day-button press ${active ? "active" : ""}`}
                        onClick={() => setPreference(
                          "practice_reminder_days",
                          active
                            ? prefs.practice_reminder_days.filter((item) => item !== day.id)
                            : [...prefs.practice_reminder_days, day.id],
                        )}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <ToggleRow label="Email reminders" checked={prefs.email_practice_reminders} onChange={(checked) => setPreference("email_practice_reminders", checked)} />
              <ToggleRow
                label={`Browser push${pushPermission === "unsupported" ? " unavailable" : pushPermission === "granted" ? " granted" : ""}`}
                checked={prefs.push_practice_reminders}
                onChange={updatePushPreference}
              />
              <ToggleRow label="Parent digest emails" checked={prefs.parent_digest_emails} onChange={(checked) => setPreference("parent_digest_emails", checked)} />
              <ToggleRow label="Product emails" checked={prefs.product_emails} onChange={(checked) => setPreference("product_emails", checked)} />
            </div>
            <SaveRow dirty={preferencesDirty} saving={savingPreferences} status={preferenceStatus} onSave={savePreferences} />
          </section>
        </div>
      </div>
    </div>
  );
}

function PanelHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="settings-panel-header">
      <div className="t-micro">{eyebrow}</div>
      <h2>{title}</h2>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="settings-field">
      <label className="t-meta" htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

function Segmented({ children }: { children: React.ReactNode }) {
  return <div className="settings-segmented">{children}</div>;
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void | Promise<void> }) {
  return (
    <button type="button" className="settings-toggle-row press" onClick={() => void onChange(!checked)} aria-pressed={checked}>
      <span>{label}</span>
      <span className={`settings-switch ${checked ? "active" : ""}`}><span /></span>
    </button>
  );
}

function SaveRow({ dirty, saving, status, onSave }: { dirty: boolean; saving: boolean; status: string; onSave: () => void }) {
  return (
    <div className="settings-save-row">
      <button className="cta" disabled={!dirty || saving} onClick={onSave} style={{ width: "auto", minWidth: 144, height: 44, padding: "0 20px", fontSize: 14 }}>
        {saving ? "Saving..." : "Save changes"}
      </button>
      {status && <span className="t-meta">{status}</span>}
    </div>
  );
}
