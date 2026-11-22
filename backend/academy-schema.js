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
  await query(`ALTER TABLE academy_students
    ADD COLUMN IF NOT EXISTS confirm_accuracy boolean,
    ADD COLUMN IF NOT EXISTS terms_accepted boolean,
    ADD COLUMN IF NOT EXISTS privacy_consent boolean;`);
  await query(`CREATE TABLE IF NOT EXISTS academy_scholarships (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text,
    program_id text,
    discount_type text NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
    discount_value numeric(12,2) NOT NULL CHECK (discount_value > 0),
    active boolean NOT NULL DEFAULT true,
    created_by text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );`);
  await query(`CREATE TABLE IF NOT EXISTS academy_student_scholarships (
    student_id text PRIMARY KEY REFERENCES academy_students(id) ON DELETE CASCADE,
    scholarship_id text NOT NULL REFERENCES academy_scholarships(id) ON DELETE RESTRICT,
    assigned_by text NOT NULL,
    assigned_at timestamptz NOT NULL DEFAULT now()
  );`);
  await query(`CREATE TABLE IF NOT EXISTS academy_scholarship_applications (
    id text PRIMARY KEY,
    student_id text NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
    scholarship_id text NOT NULL REFERENCES academy_scholarships(id) ON DELETE RESTRICT,
    statement text NOT NULL,
    status text NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by text,
    reviewed_at timestamptz,
    review_note text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS academy_scholarship_one_pending_application
    ON academy_scholarship_applications (student_id)
    WHERE status = 'pending';`);
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
  await query(`CREATE TABLE IF NOT EXISTS academy_quizzes (
    id text PRIMARY KEY,
    course_id text NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
    session_id text NOT NULL REFERENCES academy_sessions(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text NOT NULL DEFAULT '',
    duration_minutes int NOT NULL CHECK (duration_minutes BETWEEN 1 AND 240),
    max_attempts int NOT NULL DEFAULT 1 CHECK (max_attempts BETWEEN 1 AND 10),
    opens_at timestamptz,
    closes_at timestamptz,
    questions jsonb NOT NULL,
    published boolean NOT NULL DEFAULT false,
    created_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );`);
  await query(`CREATE INDEX IF NOT EXISTS academy_quizzes_course_session
    ON academy_quizzes (course_id, session_id, published);`);
  await query(`CREATE TABLE IF NOT EXISTS academy_quiz_attempts (
    id text PRIMARY KEY,
    quiz_id text NOT NULL REFERENCES academy_quizzes(id) ON DELETE CASCADE,
    student_id text NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
    attempt_number int NOT NULL,
    answers jsonb NOT NULL DEFAULT '{}'::jsonb,
    score numeric(6,2),
    correct_count int,
    status text NOT NULL DEFAULT 'in_progress'
      CHECK (status IN ('in_progress', 'submitted')),
    started_at timestamptz NOT NULL DEFAULT now(),
    submitted_at timestamptz,
    UNIQUE (quiz_id, student_id, attempt_number)
  );`);
  await query(`CREATE INDEX IF NOT EXISTS academy_quiz_attempts_student
    ON academy_quiz_attempts (student_id, quiz_id, started_at DESC);`);
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
    paid boolean DEFAULT false,
    status text DEFAULT 'unpaid',
    created_by text,
    created_at timestamptz DEFAULT now()
  );`);
  await query(`ALTER TABLE academy_invoices
    ADD COLUMN IF NOT EXISTS paid boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_by text;`);
  await query(`UPDATE academy_invoices
    SET paid = COALESCE(paid, status = 'paid', false)
    WHERE paid IS NULL OR (status = 'paid' AND paid = false);`);
  await query('ALTER TABLE academy_invoices ALTER COLUMN paid SET DEFAULT false;');
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
    phone text,
    role text DEFAULT 'instructor',
    status text DEFAULT 'active',
    password_hash text,
    created_at timestamptz DEFAULT now()
  );`);
  await query(`ALTER TABLE academy_staff ADD COLUMN IF NOT EXISTS phone text;`);
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
  await query(`CREATE INDEX IF NOT EXISTS academy_attendance_student_date
    ON academy_attendance (student_id, meeting_date DESC);`);
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
  await query(`CREATE TABLE IF NOT EXISTS academy_student_lesson_progress (
    student_id text NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
    lesson_plan_id text NOT NULL REFERENCES academy_lesson_plans(id) ON DELETE CASCADE,
    completed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, lesson_plan_id)
  );`);
  await query(`CREATE TABLE IF NOT EXISTS academy_lesson_materials (
    id text PRIMARY KEY,
    lesson_plan_id text NOT NULL REFERENCES academy_lesson_plans(id) ON DELETE CASCADE,
    title text NOT NULL,
    kind text NOT NULL CHECK (kind IN ('link', 'file')),
    url text,
    storage_key text,
    content_type text,
    file_size int,
    file_name text,
    created_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (
      (kind = 'link' AND url IS NOT NULL AND storage_key IS NULL)
      OR
      (kind = 'file' AND url IS NULL AND storage_key IS NOT NULL
        AND content_type IS NOT NULL AND file_size IS NOT NULL AND file_name IS NOT NULL)
    )
  );`);
  await query(`CREATE INDEX IF NOT EXISTS academy_lesson_materials_lesson
    ON academy_lesson_materials (lesson_plan_id, created_at);`);
  await query(`CREATE TABLE IF NOT EXISTS academy_student_notifications (
    id text PRIMARY KEY,
    student_id text NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    metadata jsonb,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  );`);
  await query(`CREATE INDEX IF NOT EXISTS academy_student_notifications_feed
    ON academy_student_notifications (student_id, created_at DESC);`);
  await query(`CREATE TABLE IF NOT EXISTS academy_support_tickets (
    id text PRIMARY KEY,
    student_id text NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
    subject text NOT NULL,
    status text NOT NULL DEFAULT 'open'
      CHECK (status IN ('open', 'in_progress', 'resolved')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );`);
  await query(`CREATE TABLE IF NOT EXISTS academy_support_messages (
    id text PRIMARY KEY,
    ticket_id text NOT NULL REFERENCES academy_support_tickets(id) ON DELETE CASCADE,
    sender_id text NOT NULL,
    sender_role text NOT NULL CHECK (sender_role IN ('student', 'admin')),
    message text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );`);
  await query(`CREATE INDEX IF NOT EXISTS academy_support_tickets_updated
    ON academy_support_tickets (status, updated_at DESC);`);
  await query(`CREATE TABLE IF NOT EXISTS academy_payment_submissions (
    id text PRIMARY KEY,
    student_id text NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
    invoice_id text NOT NULL REFERENCES academy_invoices(id) ON DELETE CASCADE,
    method text NOT NULL,
    reference text NOT NULL,
    note text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'approved', 'rejected')),
    review_note text NOT NULL DEFAULT '',
    reviewed_by text,
    submitted_at timestamptz NOT NULL DEFAULT now(),
    reviewed_at timestamptz
  );`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS academy_payment_one_pending_per_invoice
    ON academy_payment_submissions (invoice_id)
    WHERE status = 'pending';`);
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
  await query(`CREATE TABLE IF NOT EXISTS academy_student_certificates (
    student_id text PRIMARY KEY,
    certificate_number text NOT NULL UNIQUE,
    student_name text NOT NULL,
    program_name text NOT NULL,
    issue_date date NOT NULL,
    issued_at timestamptz NOT NULL DEFAULT now(),
    issued_by text NOT NULL,
    template_key text NOT NULL,
    document_key text NOT NULL
  );`);
}

module.exports = ensureAcademySchema;
