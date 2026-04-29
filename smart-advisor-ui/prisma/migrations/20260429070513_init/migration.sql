-- CreateTable
CREATE TABLE "student_progress" (
    "student_id" TEXT NOT NULL,
    "major" TEXT NOT NULL,
    "completed" TEXT NOT NULL DEFAULT '[]',
    "updated_at" BIGINT NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "student_progress_pkey" PRIMARY KEY ("student_id","major")
);

-- CreateTable
CREATE TABLE "student_profile" (
    "student_id" TEXT NOT NULL,
    "major" TEXT NOT NULL,
    "previous_gpa" DOUBLE PRECISION,
    "previous_credits" DOUBLE PRECISION,
    "updated_at" BIGINT NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "student_profile_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "visitor_logs" (
    "id" SERIAL NOT NULL,
    "student_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_vendor" TEXT,
    "device_model" TEXT,
    "os_name" TEXT,
    "os_version" TEXT,
    "browser_name" TEXT,
    "visited_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER,

    CONSTRAINT "visitor_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "student_id" TEXT,
    "email" TEXT,
    "password_hash" TEXT,
    "name" TEXT,
    "image" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT DEFAULT 'student',
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_logs" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "details" JSONB DEFAULT '{}',
    "course_id" INTEGER,
    "event_kind" TEXT,
    "target_id" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semesters" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "semester_gpa" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "semesters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semester_notes" (
    "id" SERIAL NOT NULL,
    "semester_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB DEFAULT '{}',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "semester_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" SERIAL NOT NULL,
    "semester_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "credits" DOUBLE PRECISION NOT NULL,
    "instructor_name" TEXT,
    "location" TEXT,
    "class_schedule" JSONB DEFAULT '[]',
    "status" TEXT DEFAULT 'planned',
    "grade_letter" TEXT,
    "grade_point" DOUBLE PRECISION,
    "final_mark" DOUBLE PRECISION,
    "midterm_date" TIMESTAMP(3),
    "final_date" TIMESTAMP(3),
    "is_completed" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_notes" (
    "course_id" TEXT,
    "notes" TEXT,
    "content" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "db_course_id" INTEGER,
    "id" SERIAL NOT NULL,
    "student_id" TEXT,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "course_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "course_id" INTEGER,
    "date" DATE DEFAULT CURRENT_DATE,
    "duration_minutes" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gpa_history" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "semester_id" INTEGER,
    "semester_gpa" DOUBLE PRECISION,
    "cumulative_gpa" DOUBLE PRECISION NOT NULL,
    "classification" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gpa_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_tokens" (
    "id" SERIAL NOT NULL,
    "student_id" TEXT,
    "provider" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" BIGINT,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "provider_account_id" TEXT,
    "account_email" TEXT,

    CONSTRAINT "integration_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "course_id" INTEGER,
    "type" TEXT NOT NULL,
    "google_event_id" TEXT,
    "title" TEXT NOT NULL,
    "start_datetime" TIMESTAMP(3) NOT NULL,
    "end_datetime" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "xp" INTEGER DEFAULT 0,
    "level" INTEGER DEFAULT 1,
    "current_streak_days" INTEGER DEFAULT 0,
    "longest_streak_days" INTEGER DEFAULT 0,
    "last_activity_date" DATE,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gamification_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "badge_id" INTEGER NOT NULL,
    "awarded_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "scope" TEXT DEFAULT 'global',
    "target_course_id" INTEGER,
    "target_semester_id" INTEGER,
    "type" TEXT NOT NULL,
    "target_value" DOUBLE PRECISION NOT NULL,
    "current_value" DOUBLE PRECISION DEFAULT 0,
    "status" TEXT DEFAULT 'active',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "endpoint" TEXT NOT NULL,
    "feature_name" TEXT,
    "input_tokens" INTEGER DEFAULT 0,
    "output_tokens" INTEGER DEFAULT 0,
    "total_tokens" INTEGER DEFAULT 0,
    "model_used" TEXT,
    "status" TEXT DEFAULT 'success',
    "error_message" TEXT,
    "response_time_ms" INTEGER,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_progress_student_id_idx" ON "student_progress"("student_id");

-- CreateIndex
CREATE INDEX "student_progress_user_id_idx" ON "student_progress"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_profile_user_id_key" ON "student_profile"("user_id");

-- CreateIndex
CREATE INDEX "visitor_logs_user_id_idx" ON "visitor_logs"("user_id");

-- CreateIndex
CREATE INDEX "visitor_logs_visited_at_idx" ON "visitor_logs"("visited_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "users_student_id_key" ON "users"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE INDEX "admin_logs_course_id_idx" ON "admin_logs"("course_id");

-- CreateIndex
CREATE INDEX "admin_logs_created_at_idx" ON "admin_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "admin_logs_type_idx" ON "admin_logs"("type");

-- CreateIndex
CREATE INDEX "semesters_user_id_idx" ON "semesters"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "semesters_user_id_year_type_key" ON "semesters"("user_id", "year", "type");

-- CreateIndex
CREATE INDEX "semester_notes_semester_id_idx" ON "semester_notes"("semester_id");

-- CreateIndex
CREATE INDEX "courses_semester_id_idx" ON "courses"("semester_id");

-- CreateIndex
CREATE UNIQUE INDEX "courses_semester_id_code_key" ON "courses"("semester_id", "code");

-- CreateIndex
CREATE INDEX "course_notes_user_id_course_id_idx" ON "course_notes"("user_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_notes_user_id_course_id_key" ON "course_notes"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "study_sessions_user_id_idx" ON "study_sessions"("user_id");

-- CreateIndex
CREATE INDEX "study_sessions_course_id_idx" ON "study_sessions"("course_id");

-- CreateIndex
CREATE INDEX "study_sessions_date_idx" ON "study_sessions"("date" DESC);

-- CreateIndex
CREATE INDEX "gpa_history_user_id_idx" ON "gpa_history"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "gpa_history_user_id_semester_id_key" ON "gpa_history"("user_id", "semester_id");

-- CreateIndex
CREATE INDEX "integration_tokens_user_id_idx" ON "integration_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_tokens_user_id_provider_key" ON "integration_tokens"("user_id", "provider");

-- CreateIndex
CREATE INDEX "calendar_events_user_id_start_datetime_idx" ON "calendar_events"("user_id", "start_datetime");

-- CreateIndex
CREATE INDEX "calendar_events_course_id_idx" ON "calendar_events"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_user_id_google_event_id_key" ON "calendar_events"("user_id", "google_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_profiles_user_id_key" ON "gamification_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "badges_code_key" ON "badges"("code");

-- CreateIndex
CREATE INDEX "user_badges_user_id_idx" ON "user_badges"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_user_id_badge_id_key" ON "user_badges"("user_id", "badge_id");

-- CreateIndex
CREATE INDEX "quests_user_id_idx" ON "quests"("user_id");

-- CreateIndex
CREATE INDEX "ai_usage_logs_user_id_idx" ON "ai_usage_logs"("user_id");

-- CreateIndex
CREATE INDEX "ai_usage_logs_endpoint_idx" ON "ai_usage_logs"("endpoint");

-- CreateIndex
CREATE INDEX "ai_usage_logs_created_at_idx" ON "ai_usage_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "ai_usage_logs_model_used_idx" ON "ai_usage_logs"("model_used");

-- AddForeignKey
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profile" ADD CONSTRAINT "student_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_logs" ADD CONSTRAINT "visitor_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_notes" ADD CONSTRAINT "semester_notes_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_notes" ADD CONSTRAINT "course_notes_db_course_id_fkey" FOREIGN KEY ("db_course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_notes" ADD CONSTRAINT "course_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gpa_history" ADD CONSTRAINT "gpa_history_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gpa_history" ADD CONSTRAINT "gpa_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_tokens" ADD CONSTRAINT "integration_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_profiles" ADD CONSTRAINT "gamification_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_target_course_id_fkey" FOREIGN KEY ("target_course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_target_semester_id_fkey" FOREIGN KEY ("target_semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
