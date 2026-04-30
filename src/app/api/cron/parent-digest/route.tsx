import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { renderDigestHtml } from "@/lib/digest-email";
import { env } from "@/lib/env";
import type {
  AssignmentRow,
  PieceRow,
  SessionRow,
  TakeRow,
  TeacherStudentRow,
  UserRow,
} from "@/lib/supabase/types";

export const runtime = "nodejs";

function hourKey(date: Date, timeZone: string) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hour12: false,
    }).format(date),
  );

  return { weekday, hour };
}

function dayKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function startOfCurrentHour(date: Date) {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    0,
    0,
    0,
  ));
}

async function sendResendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.digestFromEmail,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend returned ${response.status}: ${await response.text()}`);
  }
}

function isAuthorized(req: Request) {
  const auth = req.headers.get("authorization");
  if (env.cronSecret && auth === `Bearer ${env.cronSecret}`) return true;
  return req.headers.has("x-vercel-cron");
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!env.resendApiKey || !env.digestFromEmail || !env.supabaseServiceRoleKey) {
    return NextResponse.json({ error: "Digest email is not configured." }, { status: 503 });
  }

  const admin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
  const now = new Date();
  const hourStart = startOfCurrentHour(now);
  const weekStart = new Date(hourStart.getTime() - 6 * 86400000);

  const { data: teacherStudents, error: teacherStudentsError } = await admin
    .from("teacher_students")
    .select("*")
    .not("accepted_at", "is", null);

  if (teacherStudentsError) {
    return NextResponse.json({ error: teacherStudentsError.message }, { status: 500 });
  }

  const links = (teacherStudents ?? []) as TeacherStudentRow[];
  if (links.length === 0) {
    return NextResponse.json({ sent: 0, skipped: ["No accepted teacher/student links."] });
  }

  const studentIds = Array.from(new Set(links.map((link) => link.student_id)));
  const teacherIds = Array.from(new Set(links.map((link) => link.teacher_id)));
  const [{ data: studentRows }, { data: teacherRows }, { data: sessionRows }, { data: takeRows }, { data: assignmentRows }, { data: pieceRows }] = await Promise.all([
    admin.from("users").select("*").in("id", studentIds),
    admin.from("users").select("*").in("id", teacherIds),
    admin.from("sessions").select("*").in("user_id", studentIds).gte("started_at", weekStart.toISOString()),
    admin.from("takes").select("*").in("user_id", studentIds).gte("submitted_at", weekStart.toISOString()),
    admin.from("assignments").select("*").in("student_id", studentIds).order("due_date", { ascending: true }),
    admin.from("pieces").select("*").in("user_id", studentIds).eq("is_active", true),
  ]);

  const students = (studentRows ?? []) as UserRow[];
  const teachers = (teacherRows ?? []) as UserRow[];
  const sessions = (sessionRows ?? []) as SessionRow[];
  const takes = (takeRows ?? []) as TakeRow[];
  const assignments = (assignmentRows ?? []) as AssignmentRow[];
  const pieces = (pieceRows ?? []) as PieceRow[];
  const teacherById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const sentTo: string[] = [];
  const skipped: string[] = [];

  for (const student of students) {
    const timeZone = student.timezone || "America/New_York";
    const { weekday, hour } = hourKey(now, timeZone);
    if (weekday !== "Sun" || hour !== 18) {
      continue;
    }

    const link = links.find((entry) => entry.student_id === student.id);
    if (!link) {
      skipped.push(`${student.email}: missing teacher link`);
      continue;
    }

    const teacher = teacherById.get(link.teacher_id);
    const studentSessions = sessions.filter((session) => session.user_id === student.id);
    const studentTakes = takes.filter((take) => take.user_id === student.id);
    const studentAssignments = assignments.filter((assignment) => assignment.student_id === student.id).slice(0, 4);
    const studentPieces = pieces.filter((piece) => piece.user_id === student.id);
    const weekKeys = Array.from({ length: 7 }, (_, index) =>
      dayKey(new Date(hourStart.getTime() - (6 - index) * 86400000), timeZone),
    );
    const minutesByDay = new Map<string, number>();

    for (const session of studentSessions) {
      const key = dayKey(new Date(session.started_at), timeZone);
      const minutes = Math.round((session.duration_sec ?? 0) / 60);
      minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + minutes);
    }

    const weekMinutes = weekKeys.map((key) => minutesByDay.get(key) ?? 0);
    const totalMinutes = weekMinutes.reduce((sum, value) => sum + value, 0);
    const daysPracticed = weekMinutes.filter((value) => value > 0).length;
    const activePieceNames = studentPieces.slice(0, 3).map((piece) => piece.name);
    const teacherName = teacher?.display_name ?? teacher?.email ?? "Your teacher";
    const html = renderDigestHtml({
      sentLabel: new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(now),
      studentName: student.display_name ?? student.email,
      studentSummary: `${student.instrument ?? "Musician"} · Studio of ${teacherName}`,
      weekLabel: `Week ending ${new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(now)}`,
      hero: [
        [`${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, "0")}m`, "practiced", `${daysPracticed} practice days`],
        [`${daysPracticed} / 7`, "days", `${Math.max(0, 7 - daysPracticed)} missed`],
        [`${activePieceNames.length}`, "pieces worked", activePieceNames.join(", ") || "No active pieces yet"],
        [`${studentTakes.length}`, "takes submitted", studentTakes.length > 0 ? "Review queue is moving" : "No takes this week"],
      ],
      week: weekMinutes,
      teacherNote: studentAssignments[0]?.instruction ?? "Strong week. Keep the practice cadence steady and prioritize one polished take before Friday.",
      assignments: studentAssignments.length > 0
        ? studentAssignments.map((assignment) => [
            assignment.piece_label,
            assignment.instruction ?? "Review in app",
          ] as [string, string])
        : [["Open practice", "Review your active pieces and plan next week in Andante"]],
    });

    try {
      await sendResendEmail({
        to: student.email,
        subject: `Andante weekly digest for ${student.display_name ?? student.email}`,
        html,
      });
      sentTo.push(student.email);
    } catch (err) {
      skipped.push(`${student.email}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({
    sent: sentTo.length,
    recipients: sentTo,
    skipped,
  });
}
