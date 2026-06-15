// Shape of the public schema. Hand-maintained for now; once the Supabase
// project is provisioned, regenerate via `supabase gen types typescript` and
// replace this file.

export type FocusType = "repertoire" | "scales" | "etudes" | "sight-reading";
export type Plan = "free" | "pro" | "studio";
export type RequirementStatus = "todo" | "active" | "done";
export type TakeStatus = "pending" | "judged" | "withdrawn";
export type ThemePreference = "system" | "light" | "dark";
export type DensityPreference = "comfortable" | "compact";
export type UserRole = "musician" | "teacher";
export type SessionMode = "practice" | "composer";
export type SheetMusicOrigin = "upload" | "imslp" | "pathway" | "generated";
export type SheetMusicFileKind = "pdf" | "image" | "musicxml" | "midi" | "audio-source";
export type ComposerJobStatus = "queued" | "processing" | "completed" | "failed";

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
  session_mode: SessionMode;
  entry_pathway_id: string | null;
  entry_requirement_id: string | null;
  notes: string | null;
  created_at: string;
}

export type SessionPieceRow = {
  session_id: string;
  piece_id: string;
}

export type SessionSheetMusicRow = {
  session_id: string;
  sheet_music_id: string;
  role: string;
  created_at: string;
}

export type SheetMusicRow = {
  id: string;
  user_id: string | null;
  piece_id: string | null;
  title: string;
  composer: string | null;
  origin: SheetMusicOrigin;
  source_name: string | null;
  source_url: string | null;
  license: string | null;
  attribution: string | null;
  is_public: boolean;
  created_at: string;
}

export type SheetMusicFileRow = {
  id: string;
  sheet_music_id: string;
  kind: SheetMusicFileKind;
  storage_bucket: string | null;
  storage_path: string | null;
  external_url: string | null;
  content_type: string | null;
  size_bytes: number | null;
  display_order: number;
  created_at: string;
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
  sheet_music_id: string | null;
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

export type ComposerJobRow = {
  id: string;
  user_id: string;
  session_id: string;
  source_recording_id: string | null;
  generated_sheet_music_id: string | null;
  status: ComposerJobStatus;
  worker_run_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
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

export type UserPreferenceRow = {
  user_id: string;
  theme: ThemePreference;
  reduced_motion: boolean;
  density: DensityPreference;
  default_focus_type: FocusType | null;
  practice_reminder_enabled: boolean;
  practice_reminder_time: string;
  practice_reminder_days: string[];
  email_practice_reminders: boolean;
  push_practice_reminders: boolean;
  parent_digest_emails: boolean;
  product_emails: boolean;
  last_practice_reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export type OnboardingResponseRow = {
  user_id: string;
  display_name: string | null;
  instrument: string | null;
  role: string | null;
  level: string | null;
  years_playing: string | null;
  age_range: string | null;
  country: string | null;
  has_teacher: boolean | null;
  referral_source: string | null;
  weekly_frequency: string | null;
  session_length: string | null;
  daily_goal_min: number | null;
  primary_goal: string | null;
  struggle: string | null;
  piece_name: string | null;
  composer: string | null;
  audition_name: string | null;
  audition_date: string | null;
  timezone: string | null;
  completed_at: string;
  created_at: string;
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
      sheet_music: GenericTable<SheetMusicRow>;
      sheet_music_files: GenericTable<SheetMusicFileRow>;
      sessions: GenericTable<SessionRow>;
      session_pieces: GenericTable<SessionPieceRow>;
      session_sheet_music: GenericTable<SessionSheetMusicRow>;
      auditions: GenericTable<AuditionRow>;
      pathways: GenericTable<PathwayRow>;
      pathway_requirements: GenericTable<PathwayRequirementRow>;
      pathway_enrollments: GenericTable<PathwayEnrollmentRow>;
      pathway_progress: GenericTable<PathwayProgressRow>;
      rooms: GenericTable<RoomRow>;
      room_seats: GenericTable<RoomSeatRow>;
      recordings: GenericTable<RecordingRow>;
      recording_annotations: GenericTable<RecordingAnnotationRow>;
      composer_jobs: GenericTable<ComposerJobRow>;
      takes: GenericTable<TakeRow>;
      take_feedback: GenericTable<TakeFeedbackRow>;
      subscriptions: GenericTable<SubscriptionRow>;
      user_preferences: GenericTable<UserPreferenceRow>;
      push_subscriptions: GenericTable<PushSubscriptionRow>;
      onboarding_responses: GenericTable<OnboardingResponseRow>;
      teachers: GenericTable<TeacherRow>;
      teacher_students: GenericTable<TeacherStudentRow>;
      assignments: GenericTable<AssignmentRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      focus_type: FocusType;
      session_mode: SessionMode;
      sheet_music_origin: SheetMusicOrigin;
      sheet_music_file_kind: SheetMusicFileKind;
      composer_job_status: ComposerJobStatus;
      plan: Plan;
      requirement_status: RequirementStatus;
      take_status: TakeStatus;
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
}
