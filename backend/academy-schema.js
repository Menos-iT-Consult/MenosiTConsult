async function ensureAcademySchema(query) {
  await query(`CREATE TABLE IF NOT EXISTS academy_programs (
    id text PRIMARY KEY,
    code text UNIQUE,
    name text NOT NULL,
    description text,
    duration_semesters int DEFAULT 4,
    fee_structure jsonb DEFAULT '{}'::jsonb,
    published boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
  );`);
  await query(`CREATE TABLE IF NOT EXISTS academy_courses (
    id text PRIMARY KEY,
    program_id text,
    code text,
    title text NOT NULL,
    credit_hours int DEFAULT 3,
    semester_number int DEFAULT 1,
    description text,
    instructor_staff_id text,
    published boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
  );`);
  await query(`CREATE TABLE IF NOT EXISTS academy_sessions (
    id text PRIMARY KEY,
    name text NOT NULL,
    start_date text, end_date text,
    is_current boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
  );`);
  await query(`CREATE TABLE IF NOT EXISTS academy_students (
    id text PRIMARY KEY,
    student_id text UNIQUE,
    first_name text, middle_name text, last_name text,
    email text, phone text,
    photo text,
    program_id text,
    status text DEFAULT 'pending',
    password_hash text,
    must_change_password boolean DEFAULT false,
    dob text, gender text, nationality text, address text,
    city text, region text, country text,
    guardian_name text, guardian_relationship text, guardian_phone text,
    highest_qualification text, institution text, field_of_study text,
    graduation_year text, study_reason text,
    seq int,
    created_at timestamptz DEFAULT now(),
    admitted_at timestamptz
  );`);
  await query(`ALTER TABLE academy_students
    ADD COLUMN IF NOT EXISTS middle_name text,
    ADD COLUMN IF NOT EXISTS gender text,
    ADD COLUMN IF NOT EXISTS nationality text,
    ADD COLUMN IF NOT EXISTS city text,
    ADD COLUMN IF NOT EXISTS region text,
    ADD COLUMN IF NOT EXISTS country text,
    ADD COLUMN IF NOT EXISTS guardian_relationship text,
    ADD COLUMN IF NOT EXISTS highest_qualification text,
    ADD COLUMN IF NOT EXISTS institution text,
    ADD COLUMN IF NOT EXISTS field_of_study text,
    ADD COLUMN IF NOT EXISTS graduation_year text,
    ADD COLUMN IF NOT EXISTS study_reason text;`);
  await query(`CREATE TABLE IF NOT EXISTS academy_enrollments (
    id text PRIMARY KEY,
    student_id text, course_id text, session_id text,
    status text DEFAULT 'enrolled',
    created_at timestamptz DEFAULT now()
  );`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS academy_enrollments_unique
    ON academy_enrollments (student_id, course_id, session_id);`);
  await query(`CREATE TABLE IF NOT EXISTS academy_grades (
    enrollment_id text PRIMARY KEY,
    ca numeric, exam numeric, total numeric,
    letter text, points numeric,
    updated_by text,
    updated_at timestamptz DEFAULT now()
  );`);
  await query(`CREATE TABLE IF NOT EXISTS academy_assignments (
    id text PRIMARY KEY,
    course_id text, session_id text,
    title text, instructions text,
    due_at timestamptz,
    max_score numeric DEFAULT 100,
    attachment text,
    created_by text,
    created_at timestamptz DEFAULT now()
  );`);
  await query(`CREATE TABLE IF NOT EXISTS academy_submissions (
    id text PRIMARY KEY,
    assignment_id text, student_id text,
    text text, file text,
    submitted_at timestamptz DEFAULT now(),
    score numeric, feedback text,
    graded_by text, graded_at timestamptz
  );`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS academy_submissions_unique
    ON academy_submissions (assignment_id, student_id);`);
  await query(`CREATE TABLE IF NOT EXISTS academy_timetable (
    id text PRIMARY KEY,
    session_id text, course_id text,
    day_of_week text, start_time text, end_time text, venue text,
    created_at timestamptz DEFAULT now()
  );`);
  await query(`CREATE TABLE IF NOT EXISTS academy_exams (
    id text PRIMARY KEY,
    session_id text, course_id text,
    title text, date text, start_time text, end_time text, venue text,
    created_at timestamptz DEFAULT now()
  );`);
  await query(`CREATE TABLE IF NOT EXISTS academy_invoices (
    id text PRIMARY KEY,
    student_id text, session_id text,
    title text, amount numeric,
    due_date text,
    status text DEFAULT 'unpaid',
    created_at timestamptz DEFAULT now()
  );`);
  await query(`CREATE TABLE IF NOT EXISTS academy_payments (
    id text PRIMARY KEY,
    student_id text, invoice_id text,
    amount numeric, method text,
    reference text UNIQUE,
    note text,
    paid_at timestamptz DEFAULT now(),
    recorded_by text
  );`);
  await query(`CREATE TABLE IF NOT EXISTS academy_staff (
    id text PRIMARY KEY,
    name text, email text UNIQUE,
    role text DEFAULT 'instructor',
    status text DEFAULT 'active',
    password_hash text,
    created_at timestamptz DEFAULT now()
  );`);
  await query(`CREATE TABLE IF NOT EXISTS academy_staff_invitations (
    id text PRIMARY KEY,
    staff_id text NOT NULL REFERENCES academy_staff(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at timestamptz DEFAULT now()
  );`);
  await query(`CREATE INDEX IF NOT EXISTS academy_staff_invitations_staff_id
    ON academy_staff_invitations (staff_id, created_at DESC);`);
  await query(`CREATE TABLE IF NOT EXISTS academy_attendance (
    id text PRIMARY KEY,
    course_id text NOT NULL,
    session_id text NOT NULL,
    student_id text NOT NULL,
    meeting_date date NOT NULL,
    status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    note text,
    recorded_by text NOT NULL,
    updated_at timestamptz DEFAULT now(),
    UNIQUE (course_id, session_id, student_id, meeting_date)
  );`);
  await query(`CREATE TABLE IF NOT EXISTS academy_lesson_plans (
    id text PRIMARY KEY,
    course_id text NOT NULL,
    session_id text,
    lesson_date date,
    title text NOT NULL,
    objectives text,
    notes text,
    resources text,
    created_by text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );`);
  await query(`CREATE TABLE IF NOT EXISTS academy_notifications (
    id text PRIMARY KEY,
    student_id text,
    channel text,
    type text,
    status text DEFAULT 'sent',
    error text,
    payload jsonb,
    created_at timestamptz DEFAULT now()
  );`);
  await query(`CREATE TABLE IF NOT EXISTS academy_announcements (
    id text PRIMARY KEY,
    title text NOT NULL,
    body text NOT NULL,
    session_id text,
    published boolean DEFAULT true,
    created_by text,
    created_at timestamptz DEFAULT now()
  );`);
  await query(`CREATE TABLE IF NOT EXISTS academy_settings (
    key text PRIMARY KEY,
    value jsonb
  );`);
}

module.exports = ensureAcademySchema;
