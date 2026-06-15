import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { serverEnv } from "@/lib/env-server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PushSubscriptionRow, SessionRow, UserPreferenceRow, UserRow } from "@/lib/supabase/types";
import { sendReminderPush } from "@/lib/web-push";

export const runtime = "nodejs";

const DAY_BY_SHORT: Record<string, string> = {
  Sun: "sun",
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
};

function localScheduleParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = value("hour") === "24" ? "00" : value("hour");
  return {
    day: DAY_BY_SHORT[value("weekday")] ?? "mon",
    dateKey: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${hour}:${value("minute")}`,
  };
}

function localDayKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function sendReminderEmail(to: string, name: string) {
  if (!serverEnv.resendApiKey || !serverEnv.digestFromEmail) {
    return { sent: false, skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: serverEnv.digestFromEmail,
      to: [to],
      subject: "Your Andante practice reminder",
      html: `
        <!doctype html>
        <html>
          <body style="margin:0;padding:24px;background:#f4f4f4;color:#0f0f0f;font-family:Inter,ui-sans-serif,system-ui,sans-serif;">
            <div style="max-width:520px;margin:0 auto;background:#ffffff;border:0.5px solid #e0e0e0;border-radius:12px;padding:28px;">
              <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#707070;">Andante</div>
              <div style="font-size:24px;font-weight:500;margin-top:8px;">Time to practice, ${name}.</div>
              <div style="font-size:14px;line-height:1.6;color:rgba(15,15,15,0.58);margin-top:12px;">Open Andante and log today's session while the plan is fresh.</div>
            </div>
          </body>
        </html>
      `,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend returned ${response.status}: ${await response.text()}`);
  }
  return { sent: true, skipped: false };
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Practice reminders require SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
  }

  const now = new Date();
  const { data: prefRows, error: prefError } = await admin
    .from("user_preferences")
    .select("*")
    .eq("practice_reminder_enabled", true);

  if (prefError) {
    console.error("[practice-reminders] preferences query failed:", prefError);
    return NextResponse.json({ error: "Reminder run failed." }, { status: 500 });
  }

  const preferences = (prefRows ?? []) as UserPreferenceRow[];
  if (preferences.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0 });
  }

  const userIds = preferences.map((pref) => pref.user_id);
  const since = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString();
  const [{ data: userRows }, { data: sessionRows }, { data: pushRows }] = await Promise.all([
    admin.from("users").select("*").in("id", userIds),
    admin.from("sessions").select("*").in("user_id", userIds).gte("started_at", since),
    admin.from("push_subscriptions").select("*").in("user_id", userIds),
  ]);

  const users = new Map(((userRows ?? []) as UserRow[]).map((user) => [user.id, user]));
  const sessions = (sessionRows ?? []) as SessionRow[];
  const pushSubscriptions = (pushRows ?? []) as PushSubscriptionRow[];
  const sentTo: string[] = [];
  const skipped: string[] = [];

  for (const pref of preferences) {
    const user = users.get(pref.user_id);
    if (!user) {
      skipped.push(`${pref.user_id}: missing user`);
      continue;
    }

    const timeZone = user.timezone || "America/New_York";
    const local = localScheduleParts(now, timeZone);
    const targetTime = (pref.practice_reminder_time || "18:00").slice(0, 5);
    if (local.time !== targetTime || !pref.practice_reminder_days.includes(local.day)) continue;
    if (pref.last_practice_reminder_sent_at && localDayKey(new Date(pref.last_practice_reminder_sent_at), timeZone) === local.dateKey) {
      continue;
    }

    const practicedToday = sessions.some((session) =>
      session.user_id === user.id && localDayKey(new Date(session.started_at), timeZone) === local.dateKey,
    );
    if (practicedToday) {
      skipped.push(`${user.email}: already practiced`);
      continue;
    }

    let delivered = false;
    if (pref.email_practice_reminders) {
      const result = await sendReminderEmail(user.email, user.display_name ?? "there");
      delivered = delivered || result.sent;
      if (result.skipped) skipped.push(`${user.email}: email not configured`);
    }

    if (pref.push_practice_reminders) {
      const subs = pushSubscriptions.filter((subscription) => subscription.user_id === user.id);
      if (subs.length === 0) skipped.push(`${user.email}: no push subscription`);
      for (const sub of subs) {
        try {
          const result = await sendReminderPush(sub);
          delivered = delivered || result.sent;
          if (result.skipped) skipped.push(`${user.email}: push not configured`);
          if (result.expired) {
            await admin.from("push_subscriptions").delete().eq("id", sub.id);
          }
        } catch (err) {
          skipped.push(`${user.email}: ${(err as Error).message}`);
        }
      }
    }

    if (delivered) {
      await admin
        .from("user_preferences")
        .update({ last_practice_reminder_sent_at: now.toISOString(), updated_at: now.toISOString() })
        .eq("user_id", user.id);
      sentTo.push(user.email);
    }
  }

  // Counts only — never return user emails or raw upstream error strings.
  return NextResponse.json({ sent: sentTo.length, skipped: skipped.length });
}
