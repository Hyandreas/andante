// Shape of the public schema. Hand-maintained for now; once the Supabase
// project is provisioned, regenerate via `supabase gen types typescript` and
// replace this file.

export type FocusType = "repertoire" | "scales" | "etudes" | "sight-reading";
export type Plan = "free" | "pro" | "studio";
export type RequirementStatus = "todo" | "active" | "done";
export type TakeStatus = "pending" | "judged" | "withdrawn";
export type UserRole = "musician" | "teacher";

export type UserRow = {
  id: string;
  email: string;
  display_name: string | null;
  instrument: string | null;
  region_flag: string | null;
  daily_goal_min: number;
  timezone: string;
  role: UserRole;
  onboarded_at: string | null;
  created_at: string;
}

export type PieceRow = {
  id: string;
  user_id: string;
  name: string;
  composer: string | null;
  role: string | null;
  progress: number;
  is_active: boolean;
  created_at: string;
}

export type SessionRow = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
  focus_type: FocusType | null;
  notes: string | null;
  created_at: string;
}

export type SessionPieceRow = {
  session_id: string;
  piece_id: string;
}

export type AuditionRow = {
  id: string;
  user_id: string;
  name: string;
  location: string | null;
  date: string;
  notes: string | null;
  created_at: string;
}

export type PathwayRow = {
  id: string;
  region: string;
  flag: string | null;
  name: string;
  deadline_label: string | null;
  deadline_date: string | null;
  enrolled_count: number;
  insight: string | null;
  created_at: string;
}

export type PathwayRequirementRow = {
  id: string;
  pathway_id: string;
  position: number;
  label: string;
  piece_label: string | null;
}

export type PathwayEnrollmentRow = {
  user_id: string;
  pathway_id: string;
  enrolled_at: string;
}

export type PathwayProgressRow = {
  user_id: string;
  requirement_id: string;
  status: RequirementStatus;
  updated_at: string;
}

export type RoomRow = {
  id: string;
  host_id: string;
  name: string;
  focus: string | null;
  piece_label: string | null;
  region: string | null;
  max_seats: number;
  scheduled_for: string | null;
  is_open: boolean;
  created_at: string;
}

export type RoomSeatRow = {
  room_id: string;
  user_id: string;
  joined_at: string;
}

export type RecordingRow = {
  id: string;
  user_id: string;
  session_id: string | null;
  piece_id: string | null;
  storage_path: string;
  duration_sec: number | null;
  title: string | null;
  flagged: boolean;
  created_at: string;
}

export type RecordingAnnotationRow = {
  id: string;
  recording_id: string;
  at_sec: number;
  note: string;
  created_by: string | null;
  created_at: string;
}

export type TakeRow = {
  id: string;
  user_id: string;
  requirement_id: string | null;
  recording_id: string | null;
  status: TakeStatus;
  score: number | null;
  submitted_at: string;
  judged_at: string | null;
}

export type TakeFeedbackRow = {
  id: string;
  take_id: string;
  reviewer_id: string | null;
  reviewer_role: string | null;
  reviewer_note: string | null;
  body: string;
  created_at: string;
}

export type SubscriptionRow = {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: Plan;
  status: string;
  cadence: "monthly" | "yearly";
  period_end: string | null;
  updated_at: string;
}

export type TeacherRow = {
  user_id: string;
  studio_name: string | null;
  bio: string | null;
  created_at: string;
}

export type TeacherStudentRow = {
  teacher_id: string;
  student_id: string;
  invite_token: string;
  invited_at: string;
  accepted_at: string | null;
}

export type AssignmentRow = {
  id: string;
  teacher_id: string;
  student_id: string;
  piece_label: string;
  instruction: string | null;
  due_date: string | null;
  done_at: string | null;
  created_at: string;
}

// Minimal Database typing the @supabase/ssr clients need. Read paths use
// the precise Row types above; write paths are intentionally permissive
// because postgrest-js's GenericTable constraint requires
// `Record<string, unknown>` on Insert/Update — not satisfiable from a
// declared interface without index signatures. Replace this whole file
// when the project is provisioned via `supabase gen types typescript`.
type GenericTable<Row> = {
  Row: Row;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

// postgrest-js v12 reads PostgrestVersion off this marker for type inference.
export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      users: GenericTable<UserRow>;
      pieces: GenericTable<PieceRow>;
      sessions: GenericTable<SessionRow>;
      session_pieces: GenericTable<SessionPieceRow>;
      auditions: GenericTable<AuditionRow>;
      pathways: GenericTable<PathwayRow>;
      pathway_requirements: GenericTable<PathwayRequirementRow>;
      pathway_enrollments: GenericTable<PathwayEnrollmentRow>;
      pathway_progress: GenericTable<PathwayProgressRow>;
      rooms: GenericTable<RoomRow>;
      room_seats: GenericTable<RoomSeatRow>;
      recordings: GenericTable<RecordingRow>;
      recording_annotations: GenericTable<RecordingAnnotationRow>;
      takes: GenericTable<TakeRow>;
      take_feedback: GenericTable<TakeFeedbackRow>;
      subscriptions: GenericTable<SubscriptionRow>;
      teachers: GenericTable<TeacherRow>;
      teacher_students: GenericTable<TeacherStudentRow>;
      assignments: GenericTable<AssignmentRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      focus_type: FocusType;
      plan: Plan;
      requirement_status: RequirementStatus;
      take_status: TakeStatus;
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
}
