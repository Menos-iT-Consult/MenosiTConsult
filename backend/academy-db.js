/**
 * Academy data-access layer (MITA — IT Academy), backed by its own PostgreSQL
 * database configured with ACADEMY_DATABASE_URL.
 */
const crypto = require('crypto');
const { AsyncLocalStorage } = require('async_hooks');
const ensureAcademySchema = require('./academy-schema');
const { getAcademyDatabaseConfigError } = require('../lib/academy-db-config');
const { isInstructorInvitationRedeemable } = require('../lib/academy-invitations');
const academyBootstrapContext = new AsyncLocalStorage();
let Pool;
let lastLoginRateLimitCleanup = 0;

try {
  ({ Pool } = require('pg'));
} catch {
  Pool = null;
}

const academyDbConfigError = getAcademyDatabaseConfigError();
const pool = !academyDbConfigError && Pool
  ? new Pool({
      connectionString: process.env.ACADEMY_DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

function noAcademyDbError() {
  const err = new Error(academyDbConfigError || 'Academy database driver is unavailable.');
  err.noDb = true;
  return err;
}

function newId(prefix) {
  return (prefix || 'ac') + '-' + Date.now().toString(36) + crypto.randomBytes(6).toString('hex');
}

// ── one-time academy seeding (idempotent) ────────────────────────────────────
let academyReadyPromise = null;

function ensureAcademyReady() {
  if (!pool) return Promise.reject(noAcademyDbError());
  if (!academyReadyPromise) {
    academyReadyPromise = (async () => {
      await academyBootstrapContext.run(true, async () => {
        await ensureAcademySchema((sql) => pool.query(sql));
        await seedAcademy(console.log);
      });
    })().catch((err) => {
      academyReadyPromise = null; // allow retry on next call
      if (!err.noDb) err.noDb = true;
      throw err;
    });
  }
  return academyReadyPromise;
}

async function q(sql, params) {
  if (!academyBootstrapContext.getStore()) await ensureAcademyReady();
  if (!pool) throw noAcademyDbError();
  return pool.query(sql, params);
}

async function transaction(callback) {
  await ensureAcademyReady();
  if (!pool) throw noAcademyDbError();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function reserveAcademyLoginAttempts(keys) {
  const now = Date.now();
  if (now - lastLoginRateLimitCleanup > 60 * 60 * 1000) {
    await q(`DELETE FROM academy_login_rate_limits
      WHERE updated_at < now() - interval '24 hours'`);
    lastLoginRateLimitCleanup = now;
  }

  let retryAfterSeconds = 0;
  for (const { keyHash, limit, windowSeconds } of keys) {
    const { rows } = await q(
      `INSERT INTO academy_login_rate_limits
        (key_hash, attempts, window_started_at, updated_at)
       VALUES ($1, 1, now(), now())
       ON CONFLICT (key_hash) DO UPDATE SET
         attempts = CASE
           WHEN academy_login_rate_limits.blocked_until > now()
             THEN academy_login_rate_limits.attempts
           WHEN academy_login_rate_limits.window_started_at <= now() - ($3 * interval '1 second')
             THEN 1
           ELSE academy_login_rate_limits.attempts + 1
         END,
         window_started_at = CASE
           WHEN academy_login_rate_limits.blocked_until > now()
             THEN academy_login_rate_limits.window_started_at
           WHEN academy_login_rate_limits.window_started_at <= now() - ($3 * interval '1 second')
             THEN now()
           ELSE academy_login_rate_limits.window_started_at
         END,
         blocked_until = CASE
           WHEN academy_login_rate_limits.blocked_until > now()
             THEN academy_login_rate_limits.blocked_until
           WHEN academy_login_rate_limits.window_started_at <= now() - ($3 * interval '1 second')
             THEN NULL
           WHEN academy_login_rate_limits.attempts + 1 > $2
             THEN now() + ($3 * interval '1 second')
           ELSE NULL
         END,
         updated_at = now()
       RETURNING GREATEST(
         CEIL(EXTRACT(EPOCH FROM (blocked_until - now()))),
         0
       )::int AS retry_after_seconds`,
      [keyHash, limit, windowSeconds]
    );
    retryAfterSeconds = Math.max(retryAfterSeconds, Number(rows[0]?.retry_after_seconds) || 0);
  }

  return {
    allowed: retryAfterSeconds === 0,
    retryAfterSeconds,
  };
}

async function clearAcademyLoginAttempts(keys) {
  await q(
    'DELETE FROM academy_login_rate_limits WHERE key_hash = ANY($1::text[])',
    [keys.map(({ keyHash }) => keyHash)]
  );
}

// ── row → camelCase mappers ──────────────────────────────────────────────────
function mapStudent(r) {
  return {
    id: r.id,
    studentId: r.student_id || '',
    firstName: r.first_name,
    middleName: r.middle_name || '',
    lastName: r.last_name,
    email: r.email,
    phone: r.phone,
    photo: r.photo || '',
    programId: r.program_id,
    status: r.status,
    mustChangePassword: !!r.must_change_password,
    dob: r.dob || '',
    gender: r.gender || '',
    nationality: r.nationality || '',
    address: r.address || '',
    city: r.city || '',
    region: r.region || '',
    country: r.country || '',
    guardianName: r.guardian_name || '',
    guardianRelationship: r.guardian_relationship || '',
    guardianPhone: r.guardian_phone || '',
    highestQualification: r.highest_qualification || '',
    institution: r.institution || '',
    fieldOfStudy: r.field_of_study || '',
    graduationYear: r.graduation_year || '',
    studyReason: r.study_reason || '',
    confirmAccuracy: r.confirm_accuracy == null ? null : !!r.confirm_accuracy,
    termsAccepted: r.terms_accepted == null ? null : !!r.terms_accepted,
    privacyConsent: r.privacy_consent == null ? null : !!r.privacy_consent,
    seq: r.seq != null ? Number(r.seq) : null,
    createdAt: iso(r.created_at),
    admittedAt: iso(r.admitted_at),
  };
}

function mapCourse(r) {
  return {
    id: r.id,
    programId: r.program_id || '',
    code: r.code || '',
    title: r.title,
    creditHours: r.credit_hours != null ? Number(r.credit_hours) : 3,
    semesterNumber: r.semester_number != null ? Number(r.semester_number) : 1,
    description: r.description || '',
    instructorStaffId: r.instructor_staff_id || '',
    instructorName: r.instructor_name || '',
    published: r.published !== false,
  };
}

function dateOnly(value) {
  if (value == null) return '';
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

function mapLessonPlan(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    sessionId: row.session_id || '',
    lessonDate: dateOnly(row.lesson_date),
    title: row.title,
    objectives: row.objectives || '',
    notes: row.notes || '',
    resources: row.resources || '',
    materials: row.materials || [],
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapStaff(r) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone || '',
    role: r.role,
    status: r.status,
    createdAt: iso(r.created_at),
  };
}

function mapProgram(r) {
  let fees = r.fee_structure;
  if (typeof fees === 'string') { try { fees = JSON.parse(fees); } catch { fees = {}; } }
  return {
    id: r.id,
    code: r.code || '',
    name: r.name,
    description: r.description || '',
    durationSemesters: r.duration_semesters != null ? Number(r.duration_semesters) : 4,
    feeStructure: fees && typeof fees === 'object' ? fees : {},
    published: !!r.published,
    createdAt: iso(r.created_at),
  };
}

function mapScholarship(r) {
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    programId: r.program_id || '',
    programName: r.program_name || '',
    discountType: r.discount_type,
    discountValue: Number(r.discount_value),
    active: !!r.active,
    createdBy: r.created_by || '',
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

function mapScholarshipApplication(r) {
  return {
    id: r.id,
    studentId: r.student_id,
    studentNumber: r.student_number || '',
    studentName: [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' '),
    studentEmail: r.email || '',
    programName: r.student_program_name || '',
    scholarshipId: r.scholarship_id,
    scholarshipName: r.scholarship_name,
    scholarshipProgramName: r.scholarship_program_name || '',
    discountType: r.discount_type,
    discountValue: Number(r.discount_value),
    statement: r.statement,
    status: r.status,
    reviewedBy: r.reviewed_by || '',
    reviewedAt: iso(r.reviewed_at),
    reviewNote: r.review_note || '',
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

function mapNotification(r) {
  let payload = r.payload;
  if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch { payload = null; } }
  return {
    id: r.id,
    studentId: r.student_id,
    channel: r.channel,
    type: r.type,
    status: r.status,
    error: r.error || '',
    payload: payload || null,
    createdAt: iso(r.created_at),
  };
}

function iso(v) {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return new Date(v).toISOString();
}

// ── students ─────────────────────────────────────────────────────────────────
async function listStudents({ status } = {}) {
  const { rows } = status
    ? await q('SELECT * FROM academy_students WHERE status = $1 ORDER BY created_at DESC', [status])
    : await q('SELECT * FROM academy_students ORDER BY created_at DESC');
  return rows.map(mapStudent);
}

async function listAdminStudents({
  status,
  programId,
  sessionId,
  smsStatus,
  search,
  limit = 50,
  offset = 0,
} = {}) {
  const { rows } = await q(
    `SELECT st.id, st.student_id, st.first_name, st.middle_name, st.last_name,
            st.email, st.phone, st.program_id, st.status, st.admitted_at, st.created_at,
            p.name AS program_name,
            cert.certificate_number,
            cert.issued_at AS certificate_issued_at,
            COALESCE(latest.status, 'not_sent') AS sms_status,
            latest.error AS sms_error,
            latest.created_at AS sms_at,
            COALESCE(session_names.names, ARRAY[]::text[]) AS session_names,
            COUNT(*) OVER() AS total_count
       FROM academy_students st
       LEFT JOIN academy_programs p ON p.id = st.program_id
       LEFT JOIN academy_student_certificates cert ON cert.student_id = st.id
       LEFT JOIN LATERAL (
         SELECT n.status, n.error, n.created_at
           FROM academy_notifications n
          WHERE n.student_id = st.id
            AND n.channel = 'sms'
            AND n.type = 'admission_approved'
          ORDER BY n.created_at DESC
          LIMIT 1
       ) latest ON true
       LEFT JOIN LATERAL (
         SELECT array_agg(DISTINCT s.name ORDER BY s.name) AS names
           FROM academy_enrollments e
           JOIN academy_sessions s ON s.id = e.session_id
          WHERE e.student_id = st.id
       ) session_names ON true
      WHERE ($1::text IS NULL OR st.status = $1)
        AND ($2::text IS NULL OR st.program_id = $2)
        AND ($3::text IS NULL OR EXISTS (
          SELECT 1 FROM academy_enrollments e
           WHERE e.student_id = st.id AND e.session_id = $3
        ))
        AND ($4::text IS NULL OR COALESCE(latest.status, 'not_sent') = $4)
        AND ($5::text IS NULL OR concat_ws(
          ' ', st.student_id, st.first_name, st.middle_name, st.last_name, st.email, st.phone
        ) ILIKE $5)
      ORDER BY st.created_at DESC, st.id
      LIMIT $6 OFFSET $7`,
    [
      status || null,
      programId || null,
      sessionId || null,
      smsStatus || null,
      search ? `%${search}%` : null,
      limit,
      offset,
    ]
  );
  return {
    students: rows.map((row) => ({
      id: row.id,
      studentId: row.student_id || '',
      firstName: row.first_name || '',
      middleName: row.middle_name || '',
      lastName: row.last_name || '',
      email: row.email || '',
      phone: row.phone || '',
      programId: row.program_id || '',
      programName: row.program_name || 'Program unavailable',
      status: row.status,
      admittedAt: iso(row.admitted_at),
      createdAt: iso(row.created_at),
      certificateNumber: row.certificate_number || '',
      certificateIssuedAt: iso(row.certificate_issued_at),
      sessionNames: row.session_names || [],
      smsStatus: row.sms_status || 'not_sent',
      smsError: row.sms_error || '',
      smsAt: iso(row.sms_at),
    })),
    total: rows[0] ? Number(rows[0].total_count) : 0,
  };
}

async function getStudent(id) {
  const { rows } = await q('SELECT * FROM academy_students WHERE id = $1', [id]);
  return rows[0] ? mapStudent(rows[0]) : null;
}

async function getStudentCertificate(studentId) {
  const { rows } = await q(
    `SELECT student_id, certificate_number, student_name, program_name, issue_date,
            issued_at, issued_by, template_key, document_key
       FROM academy_student_certificates
      WHERE student_id = $1`,
    [studentId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    studentId: row.student_id,
    certificateNumber: row.certificate_number,
    studentName: row.student_name,
    programName: row.program_name,
    issueDate: dateOnly(row.issue_date),
    issuedAt: iso(row.issued_at),
    issuedBy: row.issued_by,
    templateKey: row.template_key,
    documentKey: row.document_key,
  };
}

async function createStudentCertificate(certificate) {
  const { rows } = await q(
    `INSERT INTO academy_student_certificates
      (student_id, certificate_number, student_name, program_name, issue_date,
       issued_by, template_key, document_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (student_id) DO NOTHING
     RETURNING student_id, certificate_number, student_name, program_name, issue_date,
               issued_at, issued_by, template_key, document_key`,
    [
      certificate.studentId,
      certificate.certificateNumber,
      certificate.studentName,
      certificate.programName,
      certificate.issueDate,
      certificate.issuedBy,
      certificate.templateKey,
      certificate.documentKey,
    ]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    studentId: row.student_id,
    certificateNumber: row.certificate_number,
    studentName: row.student_name,
    programName: row.program_name,
    issueDate: dateOnly(row.issue_date),
    issuedAt: iso(row.issued_at),
    issuedBy: row.issued_by,
    templateKey: row.template_key,
    documentKey: row.document_key,
  };
}

async function getStudentByStudentId(studentId) {
  const { rows } = await q('SELECT * FROM academy_students WHERE student_id = $1', [studentId]);
  return rows[0] ? mapStudent(rows[0]) : null;
}

async function getStudentByEmail(email) {
  const { rows } = await q(
    'SELECT * FROM academy_students WHERE LOWER(email) = LOWER($1) ORDER BY created_at DESC LIMIT 1',
    [email]
  );
  return rows[0] ? mapStudent(rows[0]) : null;
}

/** Returns the stored password hash row (bypasses the public mapper). */
/** Credential row for portal login (id, status, hash) — looked up by Student ID. */
async function getStudentAuthByStudentId(studentId) {
  const { rows } = await q(
    'SELECT id, student_id, status, password_hash, must_change_password FROM academy_students WHERE student_id = $1',
    [studentId]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id,
    studentId: r.student_id,
    status: r.status,
    passwordHash: r.password_hash || '',
    mustChangePassword: !!r.must_change_password,
  };
}

async function getStudentCredentials(id) {
  const { rows } = await q(
    'SELECT id, student_id, status, password_hash, must_change_password FROM academy_students WHERE id = $1',
    [id]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id,
    studentId: r.student_id,
    status: r.status,
    passwordHash: r.password_hash || '',
    mustChangePassword: !!r.must_change_password,
  };
}

async function createPendingStudent(s) {
  const { rows } = await q(
    `INSERT INTO academy_students
      (id, first_name, middle_name, last_name, email, phone, photo, program_id, status,
       dob, gender, nationality, address, city, region, country,
       guardian_name, guardian_relationship, guardian_phone,
       highest_qualification, institution, field_of_study, graduation_year, study_reason,
       confirm_accuracy, terms_accepted, privacy_consent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
     RETURNING *`,
    [
      s.id || newId('astu'), s.firstName, s.middleName || '', s.lastName, s.email,
      s.phone || '', s.photo || '', s.programId || null, s.dob || '', s.gender || '', s.nationality || '',
      s.address || '', s.city || '', s.region || '', s.country || '',
      s.guardianName || '', s.guardianRelationship || '', s.guardianPhone || '',
      s.highestQualification || '', s.institution || '', s.fieldOfStudy || '',
      s.graduationYear || '', s.studyReason || '',
      s.confirmAccuracy === true, s.termsAccepted === true, s.privacyConsent === true,
    ]
  );
  return mapStudent(rows[0]);
}

async function updateStudent(id, s) {
  const { rows } = await q(
    `UPDATE academy_students
        SET first_name = COALESCE($2, first_name),
            last_name  = COALESCE($3, last_name),
            email      = COALESCE($4, email),
            phone      = COALESCE($5, phone),
            photo      = COALESCE($6, photo),
            dob        = COALESCE($7, dob),
            address    = COALESCE($8, address),
            guardian_name  = COALESCE($9, guardian_name),
            guardian_phone = COALESCE($10, guardian_phone)
      WHERE id = $1 RETURNING *`,
    [id, s.firstName, s.lastName, s.email, s.phone, s.photo,
     s.dob, s.address, s.guardianName, s.guardianPhone]
  );
  return rows[0] ? mapStudent(rows[0]) : null;
}

async function setStudentStatus(id, status) {
  const { rows } = await q(
    'UPDATE academy_students SET status = $2 WHERE id = $1 RETURNING *',
    [id, status]
  );
  return rows[0] ? mapStudent(rows[0]) : null;
}

/**
 * Admission: issues the Student ID (MITA/<CODE>-<YEAR>-<4-digit seq>), hashes
 * the Student ID as the default password and flags must_change_password so the
 * portal forces the change-password guide on first login.
 */
async function admitStudent(id, { year = new Date().getFullYear() } = {}) {
  const bcrypt = require('bcryptjs');
  return transaction(async (client) => {
    const { rows: studentRows } = await client.query(
      'SELECT * FROM academy_students WHERE id = $1 FOR UPDATE',
      [id]
    );
    const applicant = studentRows[0];
    if (!applicant || applicant.status !== 'pending') return null;
    if (!applicant.program_id) {
      const error = new Error('The applicant must be assigned to a program before admission.');
      error.code = 'ADMISSION_PROGRAM_REQUIRED';
      throw error;
    }

    const { rows: programRows } = await client.query(
      'SELECT id, code FROM academy_programs WHERE id = $1 FOR UPDATE',
      [applicant.program_id]
    );
    const program = programRows[0];
    const programCode = String(program?.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9-]{0,19}$/.test(programCode)) {
      const error = new Error('The applicant program needs a valid program code before admission.');
      error.code = 'ADMISSION_PROGRAM_CODE_INVALID';
      throw error;
    }

    const admissionYear = Number(year);
    if (!Number.isInteger(admissionYear) || admissionYear < 2000 || admissionYear > 9999) {
      throw new Error('Admission year must be a four-digit year.');
    }
    const prefix = `MITA/${programCode}-${admissionYear}-%`;
    const { rows: sequenceRows } = await client.query(
      `SELECT COALESCE(MAX(seq), 0) AS max_seq
         FROM academy_students
        WHERE program_id = $1 AND student_id LIKE $2`,
      [applicant.program_id, prefix]
    );
    const seq = Number(sequenceRows[0].max_seq) + 1;
    const studentId = `MITA/${programCode}-${admissionYear}-${String(seq).padStart(4, '0')}`;
    const { rows } = await client.query(
      `UPDATE academy_students
          SET student_id = $2, seq = $3, status = 'active',
              password_hash = $4, must_change_password = true, admitted_at = now()
        WHERE id = $1 AND status = 'pending'
        RETURNING *`,
      [id, studentId, seq, bcrypt.hashSync(studentId, 12)]
    );
    return rows[0] ? mapStudent(rows[0]) : null;
  });
}

async function updateStudentPassword(id, hash) {
  const { rows } = await q(
    `UPDATE academy_students
        SET password_hash = $2, must_change_password = false
      WHERE id = $1 RETURNING *`,
    [id, hash]
  );
  return rows[0] ? mapStudent(rows[0]) : null;
}

/**
 * Next admission sequence for a program in a given year. The sequence is
 * per-program per-year, matching the Student ID format
 * MITA/<PROGRAM CODE>-<YEAR>-<4-digit admission number>.
 */
async function nextSeq(programId, programCode, year) {
  const prefix = `MITA/${programCode}-${year}-%`;
  const { rows } = await q(
    `SELECT COALESCE(MAX(seq), 0) AS max_seq
       FROM academy_students
      WHERE program_id = $1 AND student_id LIKE $2`,
    [programId, prefix]
  );
  return Number(rows[0].max_seq) + 1;
}

async function deleteStudent(id) {
  await q('DELETE FROM academy_students WHERE id = $1', [id]);
}

// ── staff ────────────────────────────────────────────────────────────────────
async function listStaff() {
  const { rows } = await q('SELECT * FROM academy_staff ORDER BY created_at ASC');
  return rows.map(mapStaff);
}

async function getStaff(id) {
  const { rows } = await q('SELECT * FROM academy_staff WHERE id = $1', [id]);
  return rows[0] ? mapStaff(rows[0]) : null;
}

async function getStaffByEmail(email) {
  const { rows } = await q(
    'SELECT * FROM academy_staff WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );
  return rows[0] ? mapStaff(rows[0]) : null;
}

/** Credential row for staff login (id, role, status, hash) — looked up by email. */
async function getStaffAuthByEmail(email) {
  const { rows } = await q(
    'SELECT id, name, role, status, password_hash FROM academy_staff WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    status: r.status,
    passwordHash: r.password_hash || '',
  };
}

async function getStaffCredentials(id) {
  const { rows } = await q(
    'SELECT id, role, status, password_hash FROM academy_staff WHERE id = $1',
    [id]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return { id: r.id, role: r.role, status: r.status, passwordHash: r.password_hash || '' };
}

async function createStaff(s) {
  const bcrypt = require('bcryptjs');
  const { rows } = await q(
    `INSERT INTO academy_staff (id, name, email, role, status, password_hash)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [
      s.id || newId('astf'), s.name, s.email,
      s.role || 'instructor', s.status || 'active',
      s.passwordHash || bcrypt.hashSync(s.password || newId('tmp'), 12),
    ]
  );
  return mapStaff(rows[0]);
}

async function updateStaff(id, s) {
  const { rows } = await q(
    `UPDATE academy_staff
        SET name = COALESCE($2, name),
            email = COALESCE($3, email),
            role = COALESCE($4, role),
            status = COALESCE($5, status),
            phone = COALESCE($6, phone)
      WHERE id = $1 RETURNING *`,
    [id, s.name, s.email, s.role, s.status, s.phone]
  );
  if (rows[0] && s.status && s.status !== 'pending') {
    await q(
      `UPDATE academy_staff_invitations
          SET consumed_at = COALESCE(consumed_at, now())
        WHERE staff_id = $1 AND consumed_at IS NULL`,
      [id]
    );
  }
  return rows[0] ? mapStaff(rows[0]) : null;
}

async function updateStaffPassword(id, hash) {
  await q('UPDATE academy_staff SET password_hash = $2 WHERE id = $1', [id, hash]);
}

async function deleteStaff(id) {
  await q('UPDATE academy_courses SET instructor_staff_id = NULL WHERE instructor_staff_id = $1', [id]);
  await q('DELETE FROM academy_staff WHERE id = $1', [id]);
}

async function createInstructorInvitation({ name, email, phone, tokenHash, expiresAt }) {
  return transaction(async (client) => {
    const staffId = newId('astf');
    const { rows } = await client.query(
      `INSERT INTO academy_staff (id, name, email, phone, role, status, password_hash)
       VALUES ($1, $2, $3, $4, 'instructor', 'pending', NULL)
       RETURNING *`,
      [staffId, name, email, phone]
    );
    await client.query(
      `INSERT INTO academy_staff_invitations (id, staff_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [newId('ainv'), staffId, tokenHash, expiresAt]
    );
    return mapStaff(rows[0]);
  });
}

async function rotateInstructorInvitation(staffId, tokenHash, expiresAt) {
  return transaction(async (client) => {
    const { rows: staffRows } = await client.query(
      `SELECT * FROM academy_staff
        WHERE id = $1 AND role = 'instructor' AND status = 'pending'
        FOR UPDATE`,
      [staffId]
    );
    if (!staffRows[0]) return null;
    await client.query(
      `UPDATE academy_staff_invitations
          SET consumed_at = COALESCE(consumed_at, now())
        WHERE staff_id = $1 AND consumed_at IS NULL`,
      [staffId]
    );
    await client.query(
      `INSERT INTO academy_staff_invitations (id, staff_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [newId('ainv'), staffId, tokenHash, expiresAt]
    );
    return mapStaff(staffRows[0]);
  });
}

async function acceptInstructorInvitation(tokenHash, passwordHash) {
  return transaction(async (client) => {
    const { rows } = await client.query(
      `SELECT i.id AS invitation_id, i.expires_at, i.consumed_at,
              s.*, now() AS database_now
         FROM academy_staff_invitations i
         JOIN academy_staff s ON s.id = i.staff_id
        WHERE i.token_hash = $1
        FOR UPDATE OF i, s`,
      [tokenHash]
    );
    const staff = rows[0];
    if (!isInstructorInvitationRedeemable(staff && {
      role: staff.role,
      status: staff.status,
      consumedAt: staff.consumed_at,
      expiresAt: staff.expires_at,
    }, staff && staff.database_now)) return null;
    await client.query(
      `UPDATE academy_staff_invitations SET consumed_at = now() WHERE id = $1`,
      [staff.invitation_id]
    );
    const { rows: updated } = await client.query(
      `UPDATE academy_staff
          SET password_hash = $2, status = 'active'
        WHERE id = $1 AND status = 'pending'
        RETURNING *`,
      [staff.id, passwordHash]
    );
    return updated[0] ? mapStaff(updated[0]) : null;
  });
}

// ── programs ─────────────────────────────────────────────────────────────────
async function listPrograms({ publishedOnly } = {}) {
  const { rows } = publishedOnly
    ? await q('SELECT * FROM academy_programs WHERE published = true ORDER BY name ASC')
    : await q('SELECT * FROM academy_programs ORDER BY name ASC');
  return rows.map(mapProgram);
}

async function getProgram(id) {
  const { rows } = await q('SELECT * FROM academy_programs WHERE id = $1', [id]);
  return rows[0] ? mapProgram(rows[0]) : null;
}

async function createProgram(p) {
  const { rows } = await q(
    `INSERT INTO academy_programs
      (id, code, name, description, duration_semesters, fee_structure, published)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      p.id || newId('aprg'), (p.code || '').toUpperCase(), p.name,
      p.description || '', p.durationSemesters || 4,
      JSON.stringify(p.feeStructure || {}), p.published !== false,
    ]
  );
  return mapProgram(rows[0]);
}

async function updateProgram(id, p) {
  const { rows } = await q(
    `UPDATE academy_programs
        SET code = COALESCE($2, code),
            name = COALESCE($3, name),
            description = COALESCE($4, description),
            duration_semesters = COALESCE($5, duration_semesters),
            fee_structure = COALESCE($6, fee_structure),
            published = COALESCE($7, published)
      WHERE id = $1 RETURNING *`,
    [
      id, p.code ? p.code.toUpperCase() : null, p.name, p.description,
      p.durationSemesters,
      p.feeStructure ? JSON.stringify(p.feeStructure) : null,
      p.published,
    ]
  );
  return rows[0] ? mapProgram(rows[0]) : null;
}

async function listScholarships() {
  const { rows } = await q(
    `SELECT scholarship.*, program.name AS program_name
       FROM academy_scholarships scholarship
       LEFT JOIN academy_programs program ON program.id = scholarship.program_id
      ORDER BY scholarship.created_at DESC, scholarship.name`
  );
  return rows.map(mapScholarship);
}

async function getScholarship(id) {
  const { rows } = await q(
    `SELECT scholarship.*, program.name AS program_name
       FROM academy_scholarships scholarship
       LEFT JOIN academy_programs program ON program.id = scholarship.program_id
      WHERE scholarship.id = $1`,
    [id]
  );
  return rows[0] ? mapScholarship(rows[0]) : null;
}

async function createScholarship(scholarship) {
  const { rows } = await q(
    `INSERT INTO academy_scholarships
      (id, name, description, program_id, discount_type, discount_value, active, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      scholarship.id || newId('asch'),
      scholarship.name,
      scholarship.description || '',
      scholarship.programId || null,
      scholarship.discountType,
      scholarship.discountValue,
      scholarship.active !== false,
      scholarship.createdBy,
    ]
  );
  return mapScholarship(rows[0]);
}

async function setScholarshipActive(id, active) {
  const { rows } = await q(
    `UPDATE academy_scholarships
        SET active = $2, updated_at = now()
      WHERE id = $1
      RETURNING *`,
    [id, active]
  );
  return rows[0] ? mapScholarship(rows[0]) : null;
}

async function updateScholarship(id, scholarship) {
  return transaction(async (client) => {
    const { rows: currentRows } = await client.query(
      'SELECT id, program_id FROM academy_scholarships WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (!currentRows[0]) return null;

    if (scholarship.programId && currentRows[0].program_id !== scholarship.programId) {
      const { rows: assignedRows } = await client.query(
        `SELECT 1
           FROM academy_student_scholarships award
           JOIN academy_students student ON student.id = award.student_id
          WHERE award.scholarship_id = $1
            AND student.program_id IS DISTINCT FROM $2
         UNION ALL
         SELECT 1
           FROM academy_scholarship_applications application
           JOIN academy_students student ON student.id = application.student_id
          WHERE application.scholarship_id = $1
            AND application.status = 'pending'
            AND student.program_id IS DISTINCT FROM $2
          LIMIT 1`,
        [id, scholarship.programId]
      );
      if (assignedRows.length) {
        const error = new Error('The scholarship scope conflicts with students who have an award or a pending application.');
        error.code = 'SCHOLARSHIP_SCOPE_CONFLICT';
        throw error;
      }
    }

    const { rows } = await client.query(
      `UPDATE academy_scholarships
          SET name = $2, description = $3, program_id = $4,
              discount_type = $5, discount_value = $6, updated_at = now()
        WHERE id = $1
        RETURNING *`,
      [
        id,
        scholarship.name,
        scholarship.description || '',
        scholarship.programId || null,
        scholarship.discountType,
        scholarship.discountValue,
      ]
    );
    return rows[0] ? mapScholarship(rows[0]) : null;
  });
}

async function getStudentScholarship(studentId) {
  const { rows } = await q(
    `SELECT scholarship.*, program.name AS program_name, award.assigned_by, award.assigned_at
       FROM academy_student_scholarships award
       JOIN academy_scholarships scholarship ON scholarship.id = award.scholarship_id
       LEFT JOIN academy_programs program ON program.id = scholarship.program_id
      WHERE award.student_id = $1`,
    [studentId]
  );
  if (!rows[0]) return null;
  return {
    ...mapScholarship(rows[0]),
    assignedBy: rows[0].assigned_by,
    assignedAt: iso(rows[0].assigned_at),
  };
}

const scholarshipApplicationSelect = `SELECT application.*,
       student.student_id AS student_number,
       student.first_name,
       student.middle_name,
       student.last_name,
       student.email,
       student_program.name AS student_program_name,
       scholarship.name AS scholarship_name,
       scholarship.discount_type,
       scholarship.discount_value,
       scholarship_program.name AS scholarship_program_name
  FROM academy_scholarship_applications application
  JOIN academy_students student ON student.id = application.student_id
  JOIN academy_scholarships scholarship ON scholarship.id = application.scholarship_id
  LEFT JOIN academy_programs student_program ON student_program.id = student.program_id
  LEFT JOIN academy_programs scholarship_program ON scholarship_program.id = scholarship.program_id`;

async function getStudentScholarshipApplication(studentId) {
  const { rows } = await q(
    `${scholarshipApplicationSelect}
      WHERE application.student_id = $1
      ORDER BY application.created_at DESC
      LIMIT 1`,
    [studentId]
  );
  return rows[0] ? mapScholarshipApplication(rows[0]) : null;
}

async function listScholarshipApplications({ status = 'pending' } = {}) {
  const { rows } = await q(
    `${scholarshipApplicationSelect}
      WHERE application.status = $1
      ORDER BY application.created_at ASC`,
    [status]
  );
  return rows.map(mapScholarshipApplication);
}

async function createScholarshipApplication(studentId, scholarshipId, statement) {
  return transaction(async (client) => {
    const { rows: studentRows } = await client.query(
      'SELECT id, program_id, status FROM academy_students WHERE id = $1 FOR UPDATE',
      [studentId]
    );
    const student = studentRows[0];
    if (!student || student.status !== 'active') {
      const error = new Error('An active student account is required to apply.');
      error.code = 'STUDENT_NOT_ACTIVE';
      throw error;
    }

    const { rows: awardRows } = await client.query(
      'SELECT 1 FROM academy_student_scholarships WHERE student_id = $1',
      [studentId]
    );
    if (awardRows.length) {
      const error = new Error('A scholarship is already assigned to this student.');
      error.code = 'STUDENT_ALREADY_AWARDED';
      throw error;
    }

    const { rows: scholarshipRows } = await client.query(
      'SELECT id, program_id, active FROM academy_scholarships WHERE id = $1 FOR SHARE',
      [scholarshipId]
    );
    const scholarship = scholarshipRows[0];
    if (!scholarship || !scholarship.active) {
      const error = new Error('This scholarship is not available for applications.');
      error.code = 'SCHOLARSHIP_NOT_AVAILABLE';
      throw error;
    }
    if (scholarship.program_id && scholarship.program_id !== student.program_id) {
      const error = new Error('This scholarship is not available for your program.');
      error.code = 'SCHOLARSHIP_NOT_ELIGIBLE';
      throw error;
    }

    const { rows: pendingRows } = await client.query(
      `SELECT 1 FROM academy_scholarship_applications
        WHERE student_id = $1 AND status = 'pending'
        LIMIT 1`,
      [studentId]
    );
    if (pendingRows.length) {
      const error = new Error('A scholarship application is already under review.');
      error.code = 'SCHOLARSHIP_APPLICATION_PENDING';
      throw error;
    }

    const id = newId('asapp');
    await client.query(
      `INSERT INTO academy_scholarship_applications
        (id, student_id, scholarship_id, statement)
       VALUES ($1, $2, $3, $4)`,
      [id, studentId, scholarshipId, statement]
    );
    const { rows } = await client.query(
      `${scholarshipApplicationSelect} WHERE application.id = $1`,
      [id]
    );
    return mapScholarshipApplication(rows[0]);
  });
}

async function reviewScholarshipApplication(id, status, reviewerId, reviewNote = '') {
  return transaction(async (client) => {
    const { rows: applicationRows } = await client.query(
      `SELECT id, student_id, scholarship_id, status
         FROM academy_scholarship_applications
        WHERE id = $1
        FOR UPDATE`,
      [id]
    );
    const application = applicationRows[0];
    if (!application) return null;
    if (application.status !== 'pending') {
      const error = new Error('This scholarship application has already been reviewed.');
      error.code = 'SCHOLARSHIP_APPLICATION_ALREADY_REVIEWED';
      throw error;
    }

    const { rows: studentRows } = await client.query(
      'SELECT id, program_id, status FROM academy_students WHERE id = $1 FOR UPDATE',
      [application.student_id]
    );
    const student = studentRows[0];

    if (status === 'approved') {
      if (!student || student.status !== 'active') {
        const error = new Error('The student account is not active and cannot receive a scholarship award.');
        error.code = 'STUDENT_NOT_ACTIVE';
        throw error;
      }
      const { rows: scholarshipRows } = await client.query(
        'SELECT id, program_id, active FROM academy_scholarships WHERE id = $1 FOR SHARE',
        [application.scholarship_id]
      );
      const scholarship = scholarshipRows[0];
      if (!scholarship || !scholarship.active ||
          (scholarship.program_id && scholarship.program_id !== student.program_id)) {
        const error = new Error('This scholarship is no longer available for the student.');
        error.code = 'SCHOLARSHIP_NOT_AVAILABLE';
        throw error;
      }

      const { rows: awardRows } = await client.query(
        'SELECT 1 FROM academy_student_scholarships WHERE student_id = $1',
        [application.student_id]
      );
      if (awardRows.length) {
        const error = new Error('A scholarship has already been assigned to this student.');
        error.code = 'STUDENT_ALREADY_AWARDED';
        throw error;
      }
      await client.query(
        `INSERT INTO academy_student_scholarships (student_id, scholarship_id, assigned_by)
         VALUES ($1, $2, $3)`,
        [application.student_id, application.scholarship_id, reviewerId]
      );
    }

    await client.query(
      `UPDATE academy_scholarship_applications
          SET status = $2, reviewed_by = $3, reviewed_at = now(),
              review_note = $4, updated_at = now()
        WHERE id = $1`,
      [id, status, reviewerId, reviewNote]
    );
    const { rows } = await client.query(
      `${scholarshipApplicationSelect} WHERE application.id = $1`,
      [id]
    );
    return mapScholarshipApplication(rows[0]);
  });
}

async function assignStudentScholarship(studentId, scholarshipId, assignedBy) {
  return transaction(async (client) => {
    await client.query('SELECT id FROM academy_students WHERE id = $1 FOR UPDATE', [studentId]);
    if (!scholarshipId) {
      await client.query('DELETE FROM academy_student_scholarships WHERE student_id = $1', [studentId]);
      return null;
    }
    await client.query(
      `INSERT INTO academy_student_scholarships (student_id, scholarship_id, assigned_by)
       VALUES ($1,$2,$3)
       ON CONFLICT (student_id) DO UPDATE
         SET scholarship_id = EXCLUDED.scholarship_id,
             assigned_by = EXCLUDED.assigned_by,
             assigned_at = now()`,
      [studentId, scholarshipId, assignedBy]
    );
    const { rows } = await client.query(
      `SELECT scholarship.*, program.name AS program_name, award.assigned_by, award.assigned_at
         FROM academy_student_scholarships award
         JOIN academy_scholarships scholarship ON scholarship.id = award.scholarship_id
         LEFT JOIN academy_programs program ON program.id = scholarship.program_id
        WHERE award.student_id = $1`,
      [studentId]
    );
    return {
      ...mapScholarship(rows[0]),
      assignedBy: rows[0].assigned_by,
      assignedAt: iso(rows[0].assigned_at),
    };
  });
}

async function deleteProgram(id) {
  await q('DELETE FROM academy_programs WHERE id = $1', [id]);
}

// ── academy courses ──────────────────────────────────────────────────────────
async function createCourse(course) {
  const { rows } = await q(
    `INSERT INTO academy_courses
      (id, program_id, code, title, credit_hours, semester_number, description, published)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING *`,
    [
      newId('acrs'),
      course.programId || null,
      course.code ? String(course.code).trim().toUpperCase() : null,
      course.title,
      course.creditHours,
      course.semesterNumber,
      course.description || '',
    ]
  );
  return mapCourse(rows[0]);
}

async function listCourses({ instructorStaffId, programId } = {}) {
  const params = [];
  const conditions = [];
  if (instructorStaffId) {
    params.push(instructorStaffId);
    conditions.push(`c.instructor_staff_id = $${params.length}`);
  }
  if (programId) {
    params.push(programId);
    conditions.push(`c.program_id = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await q(
    `SELECT c.*, s.name AS instructor_name
       FROM academy_courses c
       LEFT JOIN academy_staff s ON s.id = c.instructor_staff_id
       ${where}
      ORDER BY c.title ASC`,
    params
  );
  return rows.map(mapCourse);
}

async function getCourse(id) {
  const { rows } = await q(
    `SELECT c.*, s.name AS instructor_name
       FROM academy_courses c
       LEFT JOIN academy_staff s ON s.id = c.instructor_staff_id
      WHERE c.id = $1`,
    [id]
  );
  return rows[0] ? mapCourse(rows[0]) : null;
}

async function setInstructorCourses(staffId, courseIds) {
  const uniqueIds = [...new Set(courseIds)];
  return transaction(async (client) => {
    const { rows: staffRows } = await client.query(
      `SELECT id FROM academy_staff WHERE id = $1 AND role = 'instructor' FOR UPDATE`,
      [staffId]
    );
    if (!staffRows[0]) return null;
    if (uniqueIds.length) {
      const { rows: courses } = await client.query(
        'SELECT id FROM academy_courses WHERE id = ANY($1::text[])',
        [uniqueIds]
      );
      if (courses.length !== uniqueIds.length) {
        const err = new Error('One or more selected courses were not found.');
        err.code = 'COURSE_NOT_FOUND';
        throw err;
      }
    }
    await client.query(
      `UPDATE academy_courses
          SET instructor_staff_id = NULL
        WHERE instructor_staff_id = $1
          AND NOT (id = ANY($2::text[]))`,
      [staffId, uniqueIds]
    );
    if (uniqueIds.length) {
      await client.query(
        `UPDATE academy_courses SET instructor_staff_id = $1
          WHERE id = ANY($2::text[])`,
        [staffId, uniqueIds]
      );
    }
    return uniqueIds;
  });
}

async function isCourseAssignedToInstructor(courseId, staffId) {
  const { rows } = await q(
    `SELECT 1 FROM academy_courses
      WHERE id = $1 AND instructor_staff_id = $2`,
    [courseId, staffId]
  );
  return rows.length > 0;
}

async function listInstructorRoster(courseId, staffId) {
  const { rows } = await q(
    `SELECT e.id AS enrollment_id, e.student_id, e.course_id, e.session_id, e.status,
            st.first_name, st.middle_name, st.last_name, st.student_id AS student_number,
            st.email, st.phone, s.name AS session_name
       FROM academy_courses c
       JOIN academy_enrollments e ON e.course_id = c.id
       JOIN academy_students st ON st.id = e.student_id
       LEFT JOIN academy_sessions s ON s.id = e.session_id
      WHERE c.id = $1 AND c.instructor_staff_id = $2
        AND e.status IN ('enrolled', 'active')
      ORDER BY s.start_date DESC, st.last_name, st.first_name`,
    [courseId, staffId]
  );
  return rows.map((row) => ({
    enrollmentId: row.enrollment_id,
    studentId: row.student_id,
    studentNumber: row.student_number || '',
    name: [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' '),
    email: row.email || '',
    phone: row.phone || '',
    courseId: row.course_id,
    sessionId: row.session_id,
    sessionName: row.session_name || '',
    status: row.status,
  }));
}

async function listStudentsForCourseSession(courseId, sessionId) {
  const { rows } = await q(
    `SELECT DISTINCT student.*
       FROM academy_students student
       JOIN academy_enrollments enrollment ON enrollment.student_id = student.id
      WHERE enrollment.course_id = $1 AND enrollment.session_id = $2
        AND enrollment.status IN ('enrolled', 'active')
        AND student.status = 'active'
      ORDER BY student.last_name, student.first_name`,
    [courseId, sessionId]
  );
  return rows.map(mapStudent);
}

async function listStudentsForSession(sessionId) {
  const { rows } = await q(
    `SELECT DISTINCT student.*
       FROM academy_students student
       JOIN academy_enrollments enrollment ON enrollment.student_id = student.id
      WHERE enrollment.session_id = $1
        AND enrollment.status IN ('enrolled', 'active')
        AND student.status = 'active'
      ORDER BY student.last_name, student.first_name`,
    [sessionId]
  );
  return rows.map(mapStudent);
}

// ── academy sessions ────────────────────────────────────────────────────────
async function listSessions({ currentOnly } = {}) {
  const where = currentOnly ? 'WHERE is_current = true' : '';
  const { rows } = await q(
    `SELECT * FROM academy_sessions ${where} ORDER BY start_date DESC`,
    []
  );
  return rows;
}

async function createAcademySession({ name, startDate, endDate, isCurrent }) {
  return transaction(async (client) => {
    if (isCurrent) await client.query('UPDATE academy_sessions SET is_current = false');
    const { rows } = await client.query(
      `INSERT INTO academy_sessions
        (id, name, start_date, end_date, is_current)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [newId('ases'), name, startDate || null, endDate || null, isCurrent === true]
    );
    return rows[0];
  });
}

async function listEnrollmentsBySession() {
  const { rows } = await q(
    `SELECT session_id, COUNT(*) as enrollment_count
     FROM academy_enrollments
     GROUP BY session_id`,
    []
  );
  return rows;
}

async function getStudentPortalData(studentId) {
  const [enrollmentsResult, assignmentsResult, examsResult, timetableResult, invoicesResult, announcementsResult] =
    await Promise.all([
      q(
        `SELECT e.id AS enrollment_id, e.course_id, e.session_id, e.status,
                c.title AS course_title, c.code AS course_code, c.description AS course_description,
                c.credit_hours, c.semester_number,
                s.name AS session_name, s.start_date, s.end_date, s.is_current,
                g.ca, g.exam, g.total, g.letter, g.points
           FROM academy_enrollments e
           LEFT JOIN academy_courses c ON c.id = e.course_id
           LEFT JOIN academy_sessions s ON s.id = e.session_id
           LEFT JOIN academy_grades g ON g.enrollment_id = e.id
          WHERE e.student_id = $1 AND e.status IN ('enrolled', 'active')
          ORDER BY s.is_current DESC, s.start_date DESC, c.title ASC`,
        [studentId]
      ),
      q(
        `SELECT a.id, a.course_id, a.session_id, a.title, a.instructions, a.due_at,
                a.max_score, a.attachment, c.title AS course_title, s.name AS session_name,
                sub.id AS submission_id, sub.submitted_at, sub.score, sub.feedback,
                sub.text AS submission_text, sub.file AS submission_file
           FROM academy_assignments a
           JOIN academy_enrollments e
             ON e.student_id = $1 AND e.status IN ('enrolled', 'active')
            AND e.course_id = a.course_id AND e.session_id = a.session_id
           LEFT JOIN academy_courses c ON c.id = a.course_id
           LEFT JOIN academy_sessions s ON s.id = a.session_id
           LEFT JOIN academy_submissions sub
             ON sub.assignment_id = a.id AND sub.student_id = $1
          ORDER BY a.due_at NULLS LAST, a.created_at DESC`,
        [studentId]
      ),
      q(
        `SELECT x.id, x.course_id, x.session_id, x.title, x.date, x.start_time,
                x.end_time, x.venue, c.title AS course_title, s.name AS session_name
           FROM academy_exams x
           JOIN academy_enrollments e
             ON e.student_id = $1 AND e.status IN ('enrolled', 'active')
            AND e.course_id = x.course_id AND e.session_id = x.session_id
           LEFT JOIN academy_courses c ON c.id = x.course_id
           LEFT JOIN academy_sessions s ON s.id = x.session_id
          ORDER BY x.date, x.start_time`,
        [studentId]
      ),
      q(
        `SELECT t.id, t.course_id, t.session_id, t.day_of_week, t.start_time,
                t.end_time, t.venue, c.title AS course_title, s.name AS session_name
           FROM academy_timetable t
           JOIN academy_enrollments e
             ON e.student_id = $1 AND e.status IN ('enrolled', 'active')
            AND e.course_id = t.course_id AND e.session_id = t.session_id
           LEFT JOIN academy_courses c ON c.id = t.course_id
           LEFT JOIN academy_sessions s ON s.id = t.session_id
          ORDER BY CASE LOWER(t.day_of_week)
                     WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2
                     WHEN 'wednesday' THEN 3 WHEN 'thursday' THEN 4
                     WHEN 'friday' THEN 5 WHEN 'saturday' THEN 6
                     WHEN 'sunday' THEN 7 ELSE 8
                   END, t.start_time`,
        [studentId]
      ),
      q(
        `SELECT i.id, i.session_id, i.title, i.amount, i.due_date, i.status,
                s.name AS session_name
           FROM academy_invoices i
           LEFT JOIN academy_sessions s ON s.id = i.session_id
          WHERE i.student_id = $1
          ORDER BY i.due_date NULLS LAST`,
        [studentId]
      ),
      q(
        `SELECT a.id, a.title, a.body, a.session_id, a.created_at,
                s.name AS session_name
           FROM academy_announcements a
           LEFT JOIN academy_sessions s ON s.id = a.session_id
          WHERE a.published = true
            AND (a.session_id IS NULL OR EXISTS (
              SELECT 1 FROM academy_enrollments e
               WHERE e.student_id = $1 AND e.session_id = a.session_id
                 AND e.status IN ('enrolled', 'active')
            ))
          ORDER BY a.created_at DESC`,
        [studentId]
      ),
    ]);

  return {
    enrollments: enrollmentsResult.rows,
    assignments: assignmentsResult.rows,
    exams: examsResult.rows,
    timetable: timetableResult.rows,
    invoices: invoicesResult.rows,
    announcements: announcementsResult.rows,
  };
}

async function getEnrollment(id) {
  const { rows } = await q(
    'SELECT * FROM academy_enrollments WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function createEnrollment(e) {
  const { rows } = await q(
    `INSERT INTO academy_enrollments
      (id, student_id, course_id, session_id, status)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [
      e.id || newId('acen'),
      e.studentId,
      e.courseId,
      e.sessionId,
      e.status || 'enrolled',
    ]
  );
  return mapEnrollment(rows[0]);
}

async function updateEnrollment(id, e) {
  const { rows } = await q(
    `UPDATE academy_enrollments
         SET status = COALESCE($2, status)
      WHERE id = $1 RETURNING *`,
    [id, e.status]
  );
  return rows[0] ? mapEnrollment(rows[0]) : null;
}

async function deleteEnrollment(id) {
  await q('DELETE FROM academy_enrollments WHERE id = $1', [id]);
}

// ── academy assignments ───────────────────────────────────────────────────────
async function listAssignments({ sessionId, courseId } = {}) {
  let sql = 'SELECT * FROM academy_assignments WHERE 1=1';
  let params = [];
  if (sessionId) {
    sql += ` AND session_id = $${params.length + 1}`;
    params.push(sessionId);
  }
  if (courseId) {
    sql += ` AND course_id = $${params.length + 1}`;
    params.push(courseId);
  }
  sql += ' ORDER BY created_at DESC';
  const { rows } = await q(sql, params);
  return rows.map(mapAssignment);
}

async function getAssignment(id) {
  const { rows } = await q(
    'SELECT * FROM academy_assignments WHERE id = $1',
    [id]
  );
  return rows[0] ? mapAssignment(rows[0]) : null;
}

async function createAssignment(a) {
  const { rows } = await q(
    `INSERT INTO academy_assignments
      (id, course_id, session_id, title, instructions, due_at, max_score, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      a.id || newId('acaa'),
      a.courseId,
      a.sessionId,
      a.title,
      a.instructions || null,
      a.dueAt || null,
      a.maxScore != null ? Number(a.maxScore) : 100,
      a.createdBy || null,
    ]
  );
  return mapAssignment(rows[0]);
}

async function updateAssignment(id, a) {
  const { rows } = await q(
    `UPDATE academy_assignments
         SET title = COALESCE($2, title),
             instructions = COALESCE($3, instructions),
             due_at = COALESCE($4, due_at),
             max_score = COALESCE($5, max_score)
       WHERE id = $1 RETURNING *`,
    [
      id,
      a.title,
      a.instructions,
      a.dueAt,
      a.maxScore != null ? Number(a.maxScore) : null,
    ]
  );
  return rows[0] ? mapAssignment(rows[0]) : null;
}

async function deleteAssignment(id) {
  await q('DELETE FROM academy_assignments WHERE id = $1', [id]);
}

async function listInstructorAssignments(staffId, courseId) {
  const params = [staffId];
  const courseFilter = courseId ? ` AND c.id = $2` : '';
  if (courseId) params.push(courseId);
  const { rows } = await q(
    `SELECT a.*
       FROM academy_assignments a
       JOIN academy_courses c ON c.id = a.course_id
      WHERE c.instructor_staff_id = $1${courseFilter}
      ORDER BY a.due_at NULLS LAST, a.created_at DESC`,
    params
  );
  return rows.map(mapAssignment);
}

async function listStudentAssignments(studentId) {
  const { rows } = await q(
    `SELECT a.*
       FROM academy_assignments a
       JOIN academy_enrollments e
         ON e.student_id = $1 AND e.course_id = a.course_id
        AND e.session_id = a.session_id AND e.status IN ('enrolled', 'active')
      ORDER BY a.due_at NULLS LAST, a.created_at DESC`,
    [studentId]
  );
  return rows.map(mapAssignment);
}

async function createInstructorAssignment(staffId, assignment) {
  const { rows } = await q(
    `INSERT INTO academy_assignments
      (id, course_id, session_id, title, instructions, due_at, max_score, created_by)
     SELECT $1, c.id, $3, $4, $5, $6, $7, $8
       FROM academy_courses c
      WHERE c.id = $2 AND c.instructor_staff_id = $9
     RETURNING *`,
    [
      newId('acaa'), assignment.courseId, assignment.sessionId, assignment.title,
      assignment.instructions || null, assignment.dueAt || null,
      assignment.maxScore != null ? Number(assignment.maxScore) : 100,
      staffId, staffId,
    ]
  );
  return rows[0] ? mapAssignment(rows[0]) : null;
}

async function updateInstructorAssignment(staffId, assignmentId, assignment) {
  const { rows } = await q(
    `UPDATE academy_assignments a
        SET title = COALESCE($3, a.title),
            instructions = COALESCE($4, a.instructions),
            due_at = COALESCE($5, a.due_at),
            max_score = COALESCE($6, a.max_score)
       FROM academy_courses c
      WHERE a.id = $1 AND c.id = a.course_id
        AND c.instructor_staff_id = $2
      RETURNING a.*`,
    [
      assignmentId, staffId, assignment.title, assignment.instructions,
      assignment.dueAt, assignment.maxScore != null ? Number(assignment.maxScore) : null,
    ]
  );
  return rows[0] ? mapAssignment(rows[0]) : null;
}

async function deleteInstructorAssignment(staffId, assignmentId) {
  const { rows } = await q(
    `DELETE FROM academy_assignments a
      USING academy_courses c
      WHERE a.id = $1 AND c.id = a.course_id
        AND c.instructor_staff_id = $2
      RETURNING a.id`,
    [assignmentId, staffId]
  );
  return rows.length > 0;
}

// ── academy submissions ───────────────────────────────────────────────────────
async function listSubmissions({ assignmentId, studentId } = {}) {
  let sql = 'SELECT * FROM academy_submissions WHERE 1=1';
  let params = [];
  if (assignmentId) {
    sql += ` AND assignment_id = $${params.length + 1}`;
    params.push(assignmentId);
  }
  if (studentId) {
    sql += ` AND student_id = $${params.length + 1}`;
    params.push(studentId);
  }
  sql += ' ORDER BY submitted_at DESC';
  const { rows } = await q(sql, params);
  return rows.map(mapSubmission);
}

async function getSubmission(id) {
  const { rows } = await q(
    'SELECT * FROM academy_submissions WHERE id = $1',
    [id]
  );
  return rows[0] ? mapSubmission(rows[0]) : null;
}

async function createSubmission(s) {
  const { rows } = await q(
    `INSERT INTO academy_submissions
      (id, assignment_id, student_id, text, file, submitted_at, score, feedback, graded_by, graded_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      s.id || newId('acms'),
      s.assignmentId,
      s.studentId,
      s.text || null,
      s.file || null,
      s.submittedAt || null,
      s.score != null ? Number(s.score) : null,
      s.feedback || null,
      s.gradedBy || null,
      s.gradedAt || null,
    ]
  );
  return mapSubmission(rows[0]);
}

async function saveStudentSubmission(studentId, submission) {
  return transaction(async (client) => {
    const { rows: eligibleRows } = await client.query(
      `SELECT a.id, a.due_at, (a.due_at IS NOT NULL AND a.due_at < now()) AS deadline_passed
         FROM academy_assignments a
         JOIN academy_enrollments e
           ON e.student_id = $1 AND e.course_id = a.course_id
          AND e.session_id = a.session_id AND e.status IN ('enrolled', 'active')
        WHERE a.id = $2
        FOR UPDATE OF a, e`,
      [studentId, submission.assignmentId]
    );
    if (!eligibleRows[0]) return { error: 'not_enrolled' };
    if (eligibleRows[0].deadline_passed) return { error: 'deadline_passed' };

    const { rows: existingRows } = await client.query(
      `SELECT id, score
         FROM academy_submissions
        WHERE assignment_id = $1 AND student_id = $2
        FOR UPDATE`,
      [submission.assignmentId, studentId]
    );
    if (existingRows[0] && existingRows[0].score != null) {
      return { error: 'already_graded' };
    }

    const values = [
      newId('acms'),
      submission.assignmentId,
      studentId,
      submission.text || null,
      submission.file || null,
    ];
    const { rows } = await client.query(
      `INSERT INTO academy_submissions AS existing_submission
        (id, assignment_id, student_id, text, file)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (assignment_id, student_id)
       DO UPDATE SET text = EXCLUDED.text, file = EXCLUDED.file, submitted_at = now()
       WHERE existing_submission.score IS NULL
         AND EXISTS (
           SELECT 1 FROM academy_assignments a
            WHERE a.id = EXCLUDED.assignment_id
              AND (a.due_at IS NULL OR a.due_at >= now())
         )
       RETURNING *`,
      values
    );
    if (!rows[0]) return { error: 'submission_closed' };
    return {
      submission: mapSubmission(rows[0]),
      created: !existingRows[0],
    };
  });
}

async function updateSubmission(id, s) {
  const { rows } = await q(
    `UPDATE academy_submissions
         SET text = COALESCE($2, text),
             file = COALESCE($3, file),
             score = COALESCE($4, score),
             feedback = COALESCE($5, feedback),
             graded_by = COALESCE($6, graded_by),
             graded_at = COALESCE($7, graded_at)
       WHERE id = $1 RETURNING *`,
    [
      id,
      s.text,
      s.file,
      s.score != null ? Number(s.score) : null,
      s.feedback,
      s.gradedBy || null,
      s.gradedAt || null,
    ]
  );
  return rows[0] ? mapSubmission(rows[0]) : null;
}

async function deleteSubmission(id) {
  await q('DELETE FROM academy_submissions WHERE id = $1', [id]);
}

async function listInstructorSubmissions(staffId, courseId) {
  const params = [staffId];
  const courseFilter = courseId ? ' AND c.id = $2' : '';
  if (courseId) params.push(courseId);
  const { rows } = await q(
    `SELECT sub.*, a.title AS assignment_title, a.course_id,
            st.first_name, st.middle_name, st.last_name, st.student_id AS student_number
       FROM academy_submissions sub
       JOIN academy_assignments a ON a.id = sub.assignment_id
       JOIN academy_courses c ON c.id = a.course_id
       JOIN academy_students st ON st.id = sub.student_id
      WHERE c.instructor_staff_id = $1${courseFilter}
      ORDER BY sub.submitted_at DESC`,
    params
  );
  return rows.map((row) => ({
    ...mapSubmission(row),
    assignmentTitle: row.assignment_title,
    courseId: row.course_id,
    studentName: [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' '),
    studentNumber: row.student_number || '',
  }));
}

async function updateInstructorSubmission(staffId, submissionId, { score, feedback }) {
  const { rows } = await q(
    `UPDATE academy_submissions sub
        SET score = $3, feedback = $4, graded_by = $2, graded_at = now()
       FROM academy_assignments a
       JOIN academy_courses c ON c.id = a.course_id
      WHERE sub.id = $1 AND a.id = sub.assignment_id
        AND c.instructor_staff_id = $2
      RETURNING sub.*`,
    [submissionId, staffId, score, feedback || null]
  );
  return rows[0] ? mapSubmission(rows[0]) : null;
}

async function getInstructorSubmissionMaxScore(staffId, submissionId) {
  const { rows } = await q(
    `SELECT a.max_score
       FROM academy_submissions sub
       JOIN academy_assignments a ON a.id = sub.assignment_id
       JOIN academy_courses c ON c.id = a.course_id
      WHERE sub.id = $1 AND c.instructor_staff_id = $2`,
    [submissionId, staffId]
  );
  return rows[0] && rows[0].max_score != null ? Number(rows[0].max_score) : null;
}

// ── academy grades ────────────────────────────────────────────────────────────
async function calculateGrade(enrollmentId) {
  const { rows } = await q(
    `SELECT ca, exam FROM academy_grades WHERE enrollment_id = $1`,
    [enrollmentId]
  );
  if (!rows[0]) return null;
  const { ca, exam } = rows[0];
  const total = (ca || 0) * 0.3 + (exam || 0) * 0.7;
  let letter = 'F';
  let point = 0;
  if (total >= 80) { letter = 'A'; point = 5; }
  else if (total >= 70) { letter = 'B'; point = 4; }
  else if (total >= 60) { letter = 'C'; point = 3; }
  else if (total >= 50) { letter = 'D'; point = 2; }
  else if (total >= 45) { letter = 'E'; point = 1; }
  return { total, letter, point };
}

async function upsertGrade(e) {
  const exists = await q(
    'SELECT id FROM academy_grades WHERE enrollment_id = $1',
    [e.enrollmentId]
  );
  if (exists.rows.length > 0) {
    const { rows } = await q(
      `UPDATE academy_grades
           SET ca = COALESCE($2, ca), exam = COALESCE($3, exam),
               total = CAST(COALESCE($2, 0) * 0.3 + COALESCE($3, 0) * 0.7 AS numeric),
               letter = CASE
                 WHEN CAST(COALESCE($2, 0) * 0.3 + COALESCE($3, 0) * 0.7 AS numeric) >= 80 THEN 'A'
                 WHEN CAST(COALESCE($2, 0) * 0.3 + COALESCE($3, 0) * 0.7 AS numeric) >= 70 THEN 'B'
                 WHEN CAST(COALESCE($2, 0) * 0.3 + COALESCE($3, 0) * 0.7 AS numeric) >= 60 THEN 'C'
                 WHEN CAST(COALESCE($2, 0) * 0.3 + COALESCE($3, 0) * 0.7 AS numeric) >= 50 THEN 'D'
                 WHEN CAST(COALESCE($2, 0) * 0.3 + COALESCE($3, 0) * 0.7 AS numeric) >= 45 THEN 'E'
                 ELSE 'F'
               END,
               updated_at = now()
       WHERE enrollment_id = $1 RETURNING *`,
      [e.enrollmentId, e.ca, e.exam]
    );
    return mapGrade(rows[0]);
  } else {
    const { rows } = await q(
      `INSERT INTO academy_grades
           (enrollment_id, ca, exam, total, letter, points, updated_by, updated_at)
       VALUES ($1,$2,$3,NULL,NULL,NULL,$4,now()) RETURNING *`,
      [
        e.enrollmentId,
        e.ca,
        e.exam,
        e.updatedBy || null,
      ]
    );
    return mapGrade(rows[0]);
  }
}

async function getGrade(enrollmentId) {
  const { rows } = await q(
    'SELECT * FROM academy_grades WHERE enrollment_id = $1',
    [enrollmentId]
  );
  return rows[0] ? mapGrade(rows[0]) : null;
}

async function listInstructorGradebook(staffId, courseId) {
  const { rows } = await q(
    `SELECT e.id AS enrollment_id, e.course_id, e.session_id, e.status,
            st.id AS student_id, st.student_id AS student_number,
            st.first_name, st.middle_name, st.last_name,
            g.ca, g.exam, g.total, g.letter, g.points, g.updated_at
       FROM academy_courses c
       JOIN academy_enrollments e ON e.course_id = c.id
       JOIN academy_students st ON st.id = e.student_id
       LEFT JOIN academy_grades g ON g.enrollment_id = e.id
      WHERE c.id = $1 AND c.instructor_staff_id = $2
        AND e.status IN ('enrolled', 'active')
      ORDER BY st.last_name, st.first_name`,
    [courseId, staffId]
  );
  return rows.map((row) => ({
    enrollmentId: row.enrollment_id,
    courseId: row.course_id,
    sessionId: row.session_id,
    enrollmentStatus: row.status,
    studentId: row.student_id,
    studentNumber: row.student_number || '',
    studentName: [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' '),
    ca: row.ca == null ? null : Number(row.ca),
    exam: row.exam == null ? null : Number(row.exam),
    total: row.total == null ? null : Number(row.total),
    letter: row.letter || '',
    points: row.points == null ? null : Number(row.points),
    updatedAt: iso(row.updated_at),
  }));
}

async function upsertInstructorGrade(staffId, { enrollmentId, ca, exam }) {
  const weightedTotal = '((COALESCE($3, 0) * 0.3) + (COALESCE($4, 0) * 0.7))';
  const { rows } = await q(
    `INSERT INTO academy_grades
      (enrollment_id, ca, exam, total, letter, points, updated_by, updated_at)
     SELECT e.id, $3, $4, ${weightedTotal},
            CASE
              WHEN ${weightedTotal} >= 80 THEN 'A'
              WHEN ${weightedTotal} >= 70 THEN 'B'
              WHEN ${weightedTotal} >= 60 THEN 'C'
              WHEN ${weightedTotal} >= 50 THEN 'D'
              WHEN ${weightedTotal} >= 45 THEN 'E'
              ELSE 'F'
            END,
            CASE
              WHEN ${weightedTotal} >= 80 THEN 5
              WHEN ${weightedTotal} >= 70 THEN 4
              WHEN ${weightedTotal} >= 60 THEN 3
              WHEN ${weightedTotal} >= 50 THEN 2
              WHEN ${weightedTotal} >= 45 THEN 1
              ELSE 0
            END,
            $2, now()
       FROM academy_enrollments e
       JOIN academy_courses c ON c.id = e.course_id
      WHERE e.id = $1 AND c.instructor_staff_id = $2
        AND e.status IN ('enrolled', 'active')
     ON CONFLICT (enrollment_id) DO UPDATE
       SET ca = EXCLUDED.ca, exam = EXCLUDED.exam, total = EXCLUDED.total,
           letter = EXCLUDED.letter, points = EXCLUDED.points,
           updated_by = EXCLUDED.updated_by, updated_at = now()
     RETURNING *`,
    [enrollmentId, staffId, ca, exam]
  );
  return rows[0] ? mapGrade(rows[0]) : null;
}

async function listInstructorCourseProgress(staffId) {
  const { rows } = await q(
    `WITH roster AS (
       SELECT course_id, COUNT(DISTINCT student_id) AS roster_count
         FROM academy_enrollments
        WHERE status IN ('enrolled', 'active')
        GROUP BY course_id
     ),
     expected_work AS (
       SELECT a.course_id, e.student_id, sub.id AS submission_id, sub.score
         FROM academy_assignments a
         JOIN academy_enrollments e
           ON e.course_id = a.course_id AND e.session_id = a.session_id
          AND e.status IN ('enrolled', 'active')
         LEFT JOIN academy_submissions sub
           ON sub.assignment_id = a.id AND sub.student_id = e.student_id
     ),
     work_summary AS (
       SELECT course_id,
              COUNT(*) FILTER (WHERE submission_id IS NULL) AS missing_submission_count,
              COUNT(DISTINCT student_id) FILTER (WHERE submission_id IS NULL) AS missing_student_count,
              COUNT(*) FILTER (WHERE submission_id IS NOT NULL AND score IS NULL) AS ungraded_submission_count,
              COUNT(submission_id) AS submitted_count
         FROM expected_work
        GROUP BY course_id
     ),
     attendance_summary AS (
       SELECT course_id,
              COUNT(*) AS attendance_record_count,
              COUNT(*) FILTER (WHERE status = 'present') AS present_count,
              COUNT(*) FILTER (WHERE status = 'late') AS late_count,
              COUNT(*) FILTER (WHERE status = 'absent') AS absent_count,
              COUNT(*) FILTER (WHERE status = 'excused') AS excused_count
         FROM academy_attendance
        GROUP BY course_id
     )
     SELECT c.id, c.code, c.title,
            COALESCE(r.roster_count, 0) AS roster_count,
            COALESCE(w.missing_submission_count, 0) AS missing_submission_count,
            COALESCE(w.missing_student_count, 0) AS missing_student_count,
            COALESCE(w.ungraded_submission_count, 0) AS ungraded_submission_count,
            COALESCE(w.submitted_count, 0) AS submitted_count,
            COALESCE(a.attendance_record_count, 0) AS attendance_record_count,
            COALESCE(a.present_count, 0) AS present_count,
            COALESCE(a.late_count, 0) AS late_count,
            COALESCE(a.absent_count, 0) AS absent_count,
            COALESCE(a.excused_count, 0) AS excused_count
       FROM academy_courses c
       LEFT JOIN roster r ON r.course_id = c.id
       LEFT JOIN work_summary w ON w.course_id = c.id
       LEFT JOIN attendance_summary a ON a.course_id = c.id
      WHERE c.instructor_staff_id = $1
      ORDER BY c.title ASC`,
    [staffId]
  );
  return rows.map((row) => ({
    courseId: row.id,
    courseCode: row.code || '',
    courseTitle: row.title || '',
    rosterCount: Number(row.roster_count),
    missingSubmissionCount: Number(row.missing_submission_count),
    missingStudentCount: Number(row.missing_student_count),
    ungradedSubmissionCount: Number(row.ungraded_submission_count),
    submittedCount: Number(row.submitted_count),
    attendanceRecordCount: Number(row.attendance_record_count),
    presentCount: Number(row.present_count),
    lateCount: Number(row.late_count),
    absentCount: Number(row.absent_count),
    excusedCount: Number(row.excused_count),
  }));
}

async function listStudentAttendance(studentId, { courseId, sessionId } = {}) {
  const params = [studentId];
  const filters = [];
  if (courseId) {
    params.push(courseId);
    filters.push(`a.course_id = $${params.length}`);
  }
  if (sessionId) {
    params.push(sessionId);
    filters.push(`a.session_id = $${params.length}`);
  }
  const { rows } = await q(
    `SELECT a.id, a.course_id, a.session_id, a.meeting_date, a.status, a.note,
            c.code AS course_code, c.title AS course_title, s.name AS session_name
       FROM academy_attendance a
       JOIN academy_courses c ON c.id = a.course_id
       JOIN academy_sessions s ON s.id = a.session_id
      WHERE a.student_id = $1
        ${filters.map((filter) => `AND ${filter}`).join('\n        ')}
      ORDER BY a.meeting_date DESC, c.title ASC`,
    params
  );
  return rows.map((row) => ({
    id: row.id,
    courseId: row.course_id,
    courseCode: row.course_code || '',
    courseTitle: row.course_title || '',
    sessionId: row.session_id,
    sessionName: row.session_name || '',
    meetingDate: dateOnly(row.meeting_date),
    status: row.status,
    note: row.note || '',
  }));
}

async function listInstructorAttendance(staffId, { courseId, sessionId, meetingDate } = {}) {
  const params = [staffId];
  const filters = [];
  if (courseId) {
    params.push(courseId);
    filters.push(`a.course_id = $${params.length}`);
  }
  if (sessionId) {
    params.push(sessionId);
    filters.push(`a.session_id = $${params.length}`);
  }
  if (meetingDate) {
    params.push(meetingDate);
    filters.push(`a.meeting_date = $${params.length}`);
  }
  const { rows } = await q(
    `SELECT a.*, st.first_name, st.middle_name, st.last_name,
            st.student_id AS student_number
       FROM academy_attendance a
       JOIN academy_courses c ON c.id = a.course_id
       JOIN academy_students st ON st.id = a.student_id
      WHERE c.instructor_staff_id = $1
        ${filters.map((filter) => `AND ${filter}`).join('\n        ')}
      ORDER BY a.meeting_date DESC, st.last_name, st.first_name`,
    params
  );
  return rows.map((row) => ({
    id: row.id,
    courseId: row.course_id,
    sessionId: row.session_id,
    studentId: row.student_id,
    studentName: [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' '),
    studentNumber: row.student_number || '',
    meetingDate: dateOnly(row.meeting_date),
    status: row.status,
    note: row.note || '',
    updatedAt: iso(row.updated_at),
  }));
}

async function saveInstructorAttendance(staffId, { courseId, sessionId, meetingDate, records }) {
  return transaction(async (client) => {
    const { rows: courseRows } = await client.query(
      `SELECT id FROM academy_courses
        WHERE id = $1 AND instructor_staff_id = $2
        FOR UPDATE`,
      [courseId, staffId]
    );
    if (!courseRows[0]) return null;
    const saved = [];
    for (const record of records) {
      const { rows } = await client.query(
        `INSERT INTO academy_attendance
          (id, course_id, session_id, student_id, meeting_date, status, note, recorded_by)
         SELECT $1, e.course_id, e.session_id, e.student_id, $5, $6, $7, $8
           FROM academy_enrollments e
          WHERE e.student_id = $4 AND e.course_id = $2 AND e.session_id = $3
            AND e.status IN ('enrolled', 'active')
         ON CONFLICT (course_id, session_id, student_id, meeting_date)
         DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note,
                       recorded_by = EXCLUDED.recorded_by, updated_at = now()
         RETURNING *`,
        [
          newId('aatd'), courseId, sessionId, record.studentId, meetingDate,
          record.status, record.note || null, staffId,
        ]
      );
      if (!rows[0]) {
        const err = new Error('A selected student is not enrolled in this course session.');
        err.code = 'STUDENT_NOT_ENROLLED';
        throw err;
      }
      saved.push(rows[0]);
    }
    return saved;
  });
}

async function listInstructorLessonPlans(staffId, courseId) {
  const { rows } = await q(
    `SELECT p.*,
            COALESCE((
              SELECT json_agg(json_build_object(
                'id', m.id, 'title', m.title, 'kind', m.kind, 'url', m.url,
                'contentType', m.content_type, 'fileSize', m.file_size,
                'fileName', m.file_name,
                'downloadUrl', CASE WHEN m.kind = 'file'
                  THEN '/api/academy/lessons/' || p.id || '/materials/' || m.id
                  ELSE NULL END
              ) ORDER BY m.created_at)
              FROM academy_lesson_materials m WHERE m.lesson_plan_id = p.id
            ), '[]'::json) AS materials
       FROM academy_lesson_plans p
       JOIN academy_courses c ON c.id = p.course_id
      WHERE c.instructor_staff_id = $1 AND p.course_id = $2
      ORDER BY p.lesson_date NULLS LAST, p.created_at DESC`,
    [staffId, courseId]
  );
  return rows.map(mapLessonPlan);
}

async function listStudentLessons(studentId, { courseId } = {}) {
  const params = [studentId];
  if (courseId) params.push(courseId);
  const { rows } = await q(
    `SELECT p.id, p.course_id, p.session_id, p.lesson_date, p.title,
            p.objectives, p.notes, p.resources, c.code AS course_code,
            c.title AS course_title, s.name AS session_name,
            COALESCE((
              SELECT json_agg(json_build_object(
                'id', m.id, 'title', m.title, 'kind', m.kind, 'url', m.url,
                'contentType', m.content_type, 'fileSize', m.file_size,
                'downloadUrl', CASE WHEN m.kind = 'file'
                  THEN '/api/academy/lessons/' || p.id || '/materials/' || m.id
                  ELSE NULL END
              ) ORDER BY m.created_at)
              FROM academy_lesson_materials m WHERE m.lesson_plan_id = p.id
            ), '[]'::json) AS materials,
            (progress.lesson_plan_id IS NOT NULL) AS completed,
            progress.completed_at
       FROM academy_lesson_plans p
       JOIN academy_courses c ON c.id = p.course_id
       LEFT JOIN academy_sessions s ON s.id = p.session_id
       LEFT JOIN academy_student_lesson_progress progress
         ON progress.student_id = $1 AND progress.lesson_plan_id = p.id
      WHERE EXISTS (
        SELECT 1 FROM academy_enrollments e
         WHERE e.student_id = $1 AND e.course_id = p.course_id
           AND (p.session_id IS NULL OR e.session_id = p.session_id)
           AND e.status IN ('enrolled', 'active')
      )
      ${courseId ? 'AND p.course_id = $2' : ''}
      ORDER BY p.lesson_date NULLS LAST, p.created_at, p.title`,
    params
  );
  return rows.map((row) => ({
    id: row.id,
    courseId: row.course_id,
    sessionId: row.session_id,
    lessonDate: dateOnly(row.lesson_date),
    title: row.title || 'Lesson',
    objectives: row.objectives || '',
    notes: row.notes || '',
    resources: row.resources || '',
    materials: row.materials || [],
    courseCode: row.course_code || '',
    courseTitle: row.course_title || '',
    sessionName: row.session_name || '',
    completed: !!row.completed,
    completedAt: row.completed_at ? iso(row.completed_at) : null,
  }));
}

async function setStudentLessonProgress(studentId, lessonId, completed) {
  if (!completed) {
    const { rows: eligible } = await q(
      `SELECT lesson.id FROM academy_lesson_plans lesson
        WHERE lesson.id = $2 AND EXISTS (
          SELECT 1 FROM academy_enrollments enrollment
           WHERE enrollment.student_id = $1 AND enrollment.course_id = lesson.course_id
             AND (lesson.session_id IS NULL OR enrollment.session_id = lesson.session_id)
             AND enrollment.status IN ('enrolled', 'active')
        )`,
      [studentId, lessonId]
    );
    if (!eligible.length) return false;
    await q(
      `DELETE FROM academy_student_lesson_progress
        WHERE student_id = $1 AND lesson_plan_id = $2`,
      [studentId, lessonId]
    );
    return true;
  }
  const { rows } = await q(
    `INSERT INTO academy_student_lesson_progress (student_id, lesson_plan_id)
     SELECT $1, lesson.id
       FROM academy_lesson_plans lesson
       JOIN academy_enrollments enrollment
         ON enrollment.student_id = $1 AND enrollment.course_id = lesson.course_id
        AND (lesson.session_id IS NULL OR enrollment.session_id = lesson.session_id)
        AND enrollment.status IN ('enrolled', 'active')
      WHERE lesson.id = $2
     ON CONFLICT (student_id, lesson_plan_id)
     DO UPDATE SET completed_at = now()
     RETURNING lesson_plan_id, completed_at`,
    [studentId, lessonId]
  );
  return rows[0] ? { lessonId: rows[0].lesson_plan_id, completedAt: iso(rows[0].completed_at) } : null;
}

function mapQuiz(r) {
  return {
    id: r.id,
    courseId: r.course_id,
    sessionId: r.session_id,
    title: r.title,
    description: r.description || '',
    durationMinutes: r.duration_minutes,
    maxAttempts: r.max_attempts,
    opensAt: r.opens_at ? iso(r.opens_at) : null,
    closesAt: r.closes_at ? iso(r.closes_at) : null,
    published: !!r.published,
    questions: r.questions,
    createdAt: r.created_at ? iso(r.created_at) : null,
  };
}

async function listInstructorQuizzes(staffId, courseId) {
  const { rows } = await q(
    `SELECT q.*, a.id AS attempt_id, a.student_id, a.attempt_number, a.score,
            a.correct_count, a.status AS attempt_status, a.started_at, a.submitted_at,
            s.first_name, s.last_name, s.student_id AS student_number
       FROM academy_quizzes q
       JOIN academy_courses c ON c.id = q.course_id AND c.instructor_staff_id = $1
       LEFT JOIN academy_quiz_attempts a ON a.quiz_id = q.id
       LEFT JOIN academy_students s ON s.id = a.student_id
      WHERE q.course_id = $2
      ORDER BY q.created_at DESC, a.started_at DESC`,
    [staffId, courseId]
  );
  const quizzes = new Map();
  for (const row of rows) {
    if (!quizzes.has(row.id)) quizzes.set(row.id, { ...mapQuiz(row), attempts: [] });
    if (row.attempt_id) {
      quizzes.get(row.id).attempts.push({
        id: row.attempt_id,
        studentId: row.student_id,
        studentName: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        studentNumber: row.student_number || '',
        attemptNumber: row.attempt_number,
        score: row.score == null ? null : Number(row.score),
        correctCount: row.correct_count,
        status: row.attempt_status,
        startedAt: iso(row.started_at),
        submittedAt: row.submitted_at ? iso(row.submitted_at) : null,
      });
    }
  }
  return [...quizzes.values()];
}

async function createInstructorQuiz(staffId, quiz) {
  const id = newId('quiz');
  const { rows } = await q(
    `INSERT INTO academy_quizzes
       (id, course_id, session_id, title, description, duration_minutes,
        max_attempts, opens_at, closes_at, questions, published, created_by)
     SELECT $1, c.id, s.id, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $2
       FROM academy_courses c
       JOIN academy_sessions s ON s.id = $3
      WHERE c.id = $12 AND c.instructor_staff_id = $2
     RETURNING *`,
    [
      id, staffId, quiz.sessionId, quiz.title, quiz.description, quiz.durationMinutes,
      quiz.maxAttempts, quiz.opensAt, quiz.closesAt, JSON.stringify(quiz.questions),
      quiz.published, quiz.courseId,
    ]
  );
  return rows[0] ? mapQuiz(rows[0]) : null;
}

async function updateInstructorQuiz(staffId, quizId, quiz) {
  const { rows } = await q(
    `UPDATE academy_quizzes q
        SET session_id = $4, title = $5, description = $6,
            duration_minutes = $7, max_attempts = $8, opens_at = $9,
            closes_at = $10, questions = $11::jsonb, updated_at = now()
       FROM academy_courses c
      WHERE q.id = $1 AND q.course_id = $2 AND c.id = q.course_id
        AND c.instructor_staff_id = $3 AND q.published = false
        AND NOT EXISTS (
          SELECT 1 FROM academy_quiz_attempts a WHERE a.quiz_id = q.id
        )
     RETURNING q.*`,
    [
      quizId, quiz.courseId, staffId, quiz.sessionId, quiz.title, quiz.description,
      quiz.durationMinutes, quiz.maxAttempts, quiz.opensAt, quiz.closesAt,
      JSON.stringify(quiz.questions),
    ]
  );
  return rows[0] ? mapQuiz(rows[0]) : null;
}

async function setInstructorQuizPublished(staffId, quizId, published) {
  const { rows } = await q(
    `WITH target AS (
       SELECT q.id, q.published
         FROM academy_quizzes q
         JOIN academy_courses c ON c.id = q.course_id
        WHERE q.id = $1 AND c.instructor_staff_id = $2
        FOR UPDATE OF q
     )
     UPDATE academy_quizzes q SET published = $3, updated_at = now()
       FROM target
      WHERE q.id = target.id
     RETURNING q.id, q.course_id, q.session_id, q.published,
               target.published AS was_published`,
    [quizId, staffId, published]
  );
  return rows[0] ? {
    id: rows[0].id,
    courseId: rows[0].course_id,
    sessionId: rows[0].session_id,
    published: rows[0].published,
    wasPublished: rows[0].was_published,
  } : null;
}

async function listStudentQuizzes(studentId, courseId) {
  const { rows } = await q(
    `SELECT q.id, q.course_id, q.session_id, q.title, q.description,
            q.duration_minutes, q.max_attempts, q.opens_at, q.closes_at, q.questions,
            a.id AS attempt_id, a.attempt_number, a.score, a.correct_count,
            a.status AS attempt_status, a.started_at, a.submitted_at, a.answers
       FROM academy_quizzes q
       JOIN academy_enrollments e ON e.course_id = q.course_id
         AND e.session_id = q.session_id AND e.student_id = $1
         AND e.status IN ('enrolled', 'active')
       LEFT JOIN academy_quiz_attempts a
         ON a.quiz_id = q.id AND a.student_id = $1
      WHERE q.course_id = $2 AND q.published = true
      ORDER BY q.opens_at NULLS FIRST, q.created_at DESC, a.attempt_number`,
    [studentId, courseId]
  );
  const quizzes = new Map();
  for (const row of rows) {
    if (!quizzes.has(row.id)) {
      quizzes.set(row.id, {
        id: row.id,
        courseId: row.course_id,
        sessionId: row.session_id,
        title: row.title,
        description: row.description || '',
        durationMinutes: row.duration_minutes,
        maxAttempts: row.max_attempts,
        opensAt: row.opens_at ? iso(row.opens_at) : null,
        closesAt: row.closes_at ? iso(row.closes_at) : null,
        questions: row.questions,
        attempts: [],
      });
    }
    if (row.attempt_id) {
      const attempt = {
        id: row.attempt_id,
        attemptNumber: row.attempt_number,
        score: row.score == null ? null : Number(row.score),
        correctCount: row.correct_count,
        status: row.attempt_status,
        startedAt: iso(row.started_at),
        submittedAt: row.submitted_at ? iso(row.submitted_at) : null,
      };
      if (row.attempt_status === 'in_progress') {
        quizzes.get(row.id).activeAttempt = { ...attempt, answers: row.answers || {} };
      } else {
        quizzes.get(row.id).attempts.push(attempt);
      }
    }
  }
  return [...quizzes.values()];
}

async function startStudentQuizAttempt(studentId, quizId) {
  return transaction(async (client) => {
    const { rows } = await client.query(
      `SELECT q.* FROM academy_quizzes q
        WHERE q.id = $1 AND q.published = true
        FOR UPDATE`,
      [quizId]
    );
    const quiz = rows[0];
    if (!quiz) return { error: 'QUIZ_NOT_FOUND' };
    const { rows: enrollmentRows } = await client.query(
      `SELECT 1 FROM academy_enrollments
        WHERE student_id = $1 AND course_id = $2 AND session_id = $3
          AND status IN ('enrolled', 'active')
        LIMIT 1`,
      [studentId, quiz.course_id, quiz.session_id]
    );
    if (!enrollmentRows.length) return { error: 'NOT_ENROLLED' };
    const now = Date.now();
    if (quiz.opens_at && now < new Date(quiz.opens_at).getTime()) return { error: 'NOT_OPEN' };
    if (quiz.closes_at && now >= new Date(quiz.closes_at).getTime()) return { error: 'CLOSED' };
    const { rows: countRows } = await client.query(
      `SELECT count(*)::int AS count FROM academy_quiz_attempts
        WHERE quiz_id = $1 AND student_id = $2`,
      [quizId, studentId]
    );
    const attemptNumber = countRows[0].count + 1;
    if (attemptNumber > quiz.max_attempts) return { error: 'ATTEMPTS_EXHAUSTED' };
    const id = newId('qat');
    const { rows: attemptRows } = await client.query(
      `INSERT INTO academy_quiz_attempts (id, quiz_id, student_id, attempt_number)
       VALUES ($1, $2, $3, $4) RETURNING id, attempt_number, started_at`,
      [id, quizId, studentId, attemptNumber]
    );
    return {
      quiz: mapQuiz(quiz),
      attempt: {
        id: attemptRows[0].id,
        attemptNumber: attemptRows[0].attempt_number,
        startedAt: iso(attemptRows[0].started_at),
      },
    };
  });
}

async function saveStudentQuizAnswers(studentId, attemptId, answers) {
  return transaction(async (client) => {
    const { rows } = await client.query(
      `SELECT a.id, a.answers, a.status, a.started_at, q.questions,
              q.duration_minutes, q.closes_at
         FROM academy_quiz_attempts a
         JOIN academy_quizzes q ON q.id = a.quiz_id
        WHERE a.id = $1 AND a.student_id = $2
        FOR UPDATE OF a`,
      [attemptId, studentId]
    );
    const attempt = rows[0];
    if (!attempt) return { error: 'ATTEMPT_NOT_FOUND' };
    if (attempt.status !== 'in_progress') return { error: 'ATTEMPT_SUBMITTED' };
    const deadline = Math.min(
      new Date(attempt.started_at).getTime() + attempt.duration_minutes * 60000,
      attempt.closes_at ? new Date(attempt.closes_at).getTime() : Infinity
    );
    if (Date.now() >= deadline) return { error: 'ATTEMPT_EXPIRED' };
    const { sanitizeAnswers } = require('../lib/academy-quizzes');
    const sanitized = sanitizeAnswers(attempt.questions, answers);
    if (!sanitized) return { error: 'INVALID_ANSWERS' };
    await client.query(
      `UPDATE academy_quiz_attempts SET answers = $2::jsonb WHERE id = $1`,
      [attemptId, JSON.stringify(sanitized)]
    );
    return { saved: true };
  });
}

async function submitStudentQuizAttempt(studentId, attemptId, answers) {
  return transaction(async (client) => {
    const { rows } = await client.query(
      `SELECT a.id, a.answers, a.status, a.started_at, q.questions,
              q.duration_minutes, q.closes_at
         FROM academy_quiz_attempts a
         JOIN academy_quizzes q ON q.id = a.quiz_id
        WHERE a.id = $1 AND a.student_id = $2
        FOR UPDATE OF a`,
      [attemptId, studentId]
    );
    const attempt = rows[0];
    if (!attempt) return { error: 'ATTEMPT_NOT_FOUND' };
    if (attempt.status !== 'in_progress') return { error: 'ATTEMPT_SUBMITTED' };
    const deadline = Math.min(
      new Date(attempt.started_at).getTime() + attempt.duration_minutes * 60000,
      attempt.closes_at ? new Date(attempt.closes_at).getTime() : Infinity
    );
    const expired = Date.now() >= deadline;
    const { scoreQuizAttempt } = require('../lib/academy-quizzes');
    const score = scoreQuizAttempt(attempt.questions, expired ? attempt.answers : answers);
    if (!score) return { error: 'INVALID_ANSWERS' };
    const { rows: savedRows } = await client.query(
      `UPDATE academy_quiz_attempts
          SET answers = $2::jsonb, score = $3, correct_count = $4,
              status = 'submitted', submitted_at = now()
        WHERE id = $1
        RETURNING submitted_at`,
      [attemptId, JSON.stringify(score.answers), score.score, score.correctCount]
    );
    return {
      score: score.score,
      correctCount: score.correctCount,
      totalQuestions: score.totalQuestions,
      submittedAt: iso(savedRows[0].submitted_at),
      expired,
    };
  });
}

async function listStudentQuizResults(studentId) {
  const { rows } = await q(
    `SELECT a.id, a.attempt_number, a.score, a.correct_count, a.submitted_at,
            q.id AS quiz_id, q.title, q.course_id, c.code AS course_code,
            c.title AS course_title
       FROM academy_quiz_attempts a
       JOIN academy_quizzes q ON q.id = a.quiz_id
       JOIN academy_courses c ON c.id = q.course_id
      WHERE a.student_id = $1 AND a.status = 'submitted'
      ORDER BY a.submitted_at DESC`,
    [studentId]
  );
  return rows.map((row) => ({
    id: row.id,
    quizId: row.quiz_id,
    title: row.title,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    attemptNumber: row.attempt_number,
    score: Number(row.score),
    correctCount: row.correct_count,
    submittedAt: iso(row.submitted_at),
  }));
}

async function createInstructorLessonPlan(staffId, plan) {
  const { rows } = await q(
    `INSERT INTO academy_lesson_plans
      (id, course_id, session_id, lesson_date, title, objectives, notes, resources, created_by)
     SELECT $1, c.id, $3, $4, $5, $6, $7, $8, $2
       FROM academy_courses c
      WHERE c.id = $9 AND c.instructor_staff_id = $2
     RETURNING *`,
    [
      newId('alpn'), staffId, plan.sessionId || null, plan.lessonDate || null,
      plan.title, plan.objectives || null, plan.notes || null, plan.resources || null,
      plan.courseId,
    ]
  );
  return rows[0] ? mapLessonPlan(rows[0]) : null;
}

async function updateInstructorLessonPlan(staffId, planId, plan) {
  const { rows } = await q(
    `UPDATE academy_lesson_plans p
        SET session_id = COALESCE($3, p.session_id),
            lesson_date = COALESCE($4, p.lesson_date),
            title = COALESCE($5, p.title),
            objectives = COALESCE($6, p.objectives),
            notes = COALESCE($7, p.notes),
            resources = COALESCE($8, p.resources),
            updated_at = now()
       FROM academy_courses c
      WHERE p.id = $1 AND c.id = p.course_id
        AND c.instructor_staff_id = $2
      RETURNING p.*`,
    [
      planId, staffId, plan.sessionId, plan.lessonDate, plan.title,
      plan.objectives, plan.notes, plan.resources,
    ]
  );
  return rows[0] ? mapLessonPlan(rows[0]) : null;
}

async function deleteInstructorLessonPlan(staffId, planId) {
  const { rows } = await q(
    `DELETE FROM academy_lesson_plans p
      USING academy_courses c
      WHERE p.id = $1 AND c.id = p.course_id
        AND c.instructor_staff_id = $2
      RETURNING p.id`,
    [planId, staffId]
  );
  return rows.length > 0;
}

async function createInstructorLessonMaterial(staffId, lessonId, material) {
  const { rows } = await q(
    `INSERT INTO academy_lesson_materials
       (id, lesson_plan_id, title, kind, url, storage_key, content_type,
        file_size, file_name, created_by)
     SELECT $1, p.id, $4, $5, $6, $7, $8, $9, $10, $2
       FROM academy_lesson_plans p
       JOIN academy_courses c ON c.id = p.course_id
      WHERE p.id = $3 AND p.course_id = $11 AND c.instructor_staff_id = $2
     RETURNING id, lesson_plan_id, title, kind, url, content_type,
               file_size, file_name, created_at`,
    [
      newId('almat'), staffId, lessonId, material.title, material.kind,
      material.url || null, material.storageKey || null, material.contentType || null,
      material.fileSize || null, material.fileName || null,
      material.courseId,
    ]
  );
  return rows[0] ? mapLessonMaterial(rows[0]) : null;
}

async function listInstructorLessonMaterials(staffId, lessonId) {
  const { rows } = await q(
    `SELECT m.* FROM academy_lesson_materials m
       JOIN academy_lesson_plans p ON p.id = m.lesson_plan_id
       JOIN academy_courses c ON c.id = p.course_id
      WHERE c.instructor_staff_id = $1 AND p.id = $2
      ORDER BY m.created_at`,
    [staffId, lessonId]
  );
  return rows.map(mapLessonMaterial);
}

function mapLessonMaterial(row) {
  return {
    id: row.id,
    lessonId: row.lesson_plan_id,
    title: row.title,
    kind: row.kind,
    url: row.url || '',
    contentType: row.content_type || '',
    fileSize: row.file_size == null ? null : Number(row.file_size),
    fileName: row.file_name || '',
    downloadUrl: row.kind === 'file'
      ? `/api/academy/lessons/${encodeURIComponent(row.lesson_plan_id)}/materials/${encodeURIComponent(row.id)}`
      : '',
    createdAt: row.created_at ? iso(row.created_at) : null,
  };
}

async function getInstructorLessonMaterial(staffId, lessonId, materialId) {
  const { rows } = await q(
    `SELECT m.* FROM academy_lesson_materials m
       JOIN academy_lesson_plans p ON p.id = m.lesson_plan_id
       JOIN academy_courses c ON c.id = p.course_id
      WHERE c.instructor_staff_id = $1 AND p.id = $2 AND m.id = $3`,
    [staffId, lessonId, materialId]
  );
  return rows[0] || null;
}

async function getStudentLessonMaterial(studentId, lessonId, materialId) {
  const { rows } = await q(
    `SELECT m.* FROM academy_lesson_materials m
       JOIN academy_lesson_plans p ON p.id = m.lesson_plan_id
      WHERE p.id = $2 AND m.id = $3 AND EXISTS (
        SELECT 1 FROM academy_enrollments e
         WHERE e.student_id = $1 AND e.course_id = p.course_id
           AND (p.session_id IS NULL OR e.session_id = p.session_id)
           AND e.status IN ('enrolled', 'active')
      )`,
    [studentId, lessonId, materialId]
  );
  return rows[0] || null;
}

async function listInstructorLessonMaterialKeys(staffId, lessonId) {
  const { rows } = await q(
    `SELECT m.storage_key FROM academy_lesson_materials m
       JOIN academy_lesson_plans p ON p.id = m.lesson_plan_id
       JOIN academy_courses c ON c.id = p.course_id
      WHERE c.instructor_staff_id = $1 AND p.id = $2
        AND m.kind = 'file'`,
    [staffId, lessonId]
  );
  return rows.map((row) => row.storage_key);
}

async function deleteInstructorLessonMaterial(staffId, lessonId, materialId) {
  const { rows } = await q(
    `DELETE FROM academy_lesson_materials m
      USING academy_lesson_plans p, academy_courses c
      WHERE m.id = $3 AND m.lesson_plan_id = p.id AND p.id = $2
        AND c.id = p.course_id AND c.instructor_staff_id = $1
      RETURNING m.storage_key`,
    [staffId, lessonId, materialId]
  );
  return rows[0] || null;
}

function mapEnrollment(r) {
  return {
    id: r.id,
    studentId: r.student_id,
    courseId: r.course_id,
    sessionId: r.session_id,
    status: r.status,
    createdAt: iso(r.created_at),
  };
}

function mapAssignment(r) {
  return {
    id: r.id,
    courseId: r.course_id,
    sessionId: r.session_id,
    title: r.title,
    instructions: r.instructions || '',
    dueAt: r.due_at,
    maxScore: r.max_score != null ? Number(r.max_score) : 100,
    attachment: r.attachment || '',
    createdAt: iso(r.created_at),
  };
}

function mapSubmission(r) {
  return {
    id: r.id,
    assignmentId: r.assignment_id,
    studentId: r.student_id,
    text: r.text || '',
    file: r.file || '',
    submittedAt: r.submitted_at,
    score: r.score,
    feedback: r.feedback || '',
    gradedBy: r.graded_by || '',
    gradedAt: r.graded_at,
  };
}

function mapGrade(r) {
  let ca = 0, exam = 0, total = 0, points = 0;
  if (r.ca != null) ca = Number(r.ca);
  if (r.exam != null) exam = Number(r.exam);
  if (r.total != null) total = Number(r.total);
  if (r.points != null) points = Number(r.points);
  const scale = [
    { letter: 'A', min: 80, point: 5 },
    { letter: 'B', min: 70, point: 4 },
    { letter: 'C', min: 60, point: 3 },
    { letter: 'D', min: 50, point: 2 },
    { letter: 'E', min: 45, point: 1 },
    { letter: 'F', min: 0,  point: 0 },
  ];
  let letter = 'F';
  for (const s of scale) { if (total >= s.min) { letter = s.letter; points = s.point; break; } }
  return { ca, exam, total, letter, points };
}

function iso(v) {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return new Date(v).toISOString();
}

// ── academy timetable ─────────────────────────────────────────────────────────
async function listTimetable({ sessionId, courseId } = {}) {
  let sql = 'SELECT * FROM academy_timetable WHERE 1=1';
  let params = [];
  if (sessionId) {
    sql += ` AND session_id = $${params.length + 1}`;
    params.push(sessionId);
  }
  if (courseId) {
    sql += ` AND course_id = $${params.length + 1}`;
    params.push(courseId);
  }
  sql += ' ORDER BY day_of_week, start_time';
  const { rows } = await q(sql, params);
  return rows;
}

async function getTimetable(id) {
  const { rows } = await q(
    'SELECT * FROM academy_timetable WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function createTimetable(t) {
  const { rows } = await q(
    `INSERT INTO academy_timetable
      (id, session_id, course_id, day_of_week, start_time, end_time, venue, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      t.id || newId('actm'),
      t.sessionId,
      t.courseId,
      t.dayOfWeek,
      t.startTime,
      t.endTime,
      t.venue || null,
      t.createdBy || null,
    ]
  );
  return rows[0];
}

async function updateTimetable(id, t) {
  const { rows } = await q(
    `UPDATE academy_timetable
         SET day_of_week = COALESCE($2, day_of_week),
             course_id = COALESCE($3, course_id),
             start_time = COALESCE($4, start_time),
             end_time = COALESCE($5, end_time),
             venue = COALESCE($6, venue)
       WHERE id = $1 RETURNING *`,
    [
      id,
      t.dayOfWeek,
      t.courseId,
      t.startTime,
      t.endTime,
      t.venue,
    ]
  );
  return rows[0] ? rows[0] : null;
}

async function deleteTimetable(id) {
  await q('DELETE FROM academy_timetable WHERE id = $1', [id]);
}

// ── academy exams ─────────────────────────────────────────────────────────────
async function listExams({ sessionId, courseId } = {}) {
  let sql = 'SELECT * FROM academy_exams WHERE 1=1';
  let params = [];
  if (sessionId) {
    sql += ` AND session_id = $${params.length + 1}`;
    params.push(sessionId);
  }
  if (courseId) {
    sql += ` AND course_id = $${params.length + 1}`;
    params.push(courseId);
  }
  sql += ' ORDER BY date, start_time';
  const { rows } = await q(sql, params);
  return rows;
}

async function getExam(id) {
  const { rows } = await q(
    'SELECT * FROM academy_exams WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function createExam(e) {
  const { rows } = await q(
    `INSERT INTO academy_exams
      (id, session_id, course_id, title, date, start_time, end_time, venue, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      e.id || newId('acex'),
      e.sessionId,
      e.courseId,
      e.title,
      e.date,
      e.startTime,
      e.endTime,
      e.venue || null,
      e.createdBy || null,
    ]
  );
  return rows[0];
}

async function updateExam(id, e) {
  const { rows } = await q(
    `UPDATE academy_exams
         SET title = COALESCE($2, title),
             date = COALESCE($3, date),
             start_time = COALESCE($4, start_time),
             end_time = COALESCE($5, end_time),
             venue = COALESCE($6, venue)
       WHERE id = $1 RETURNING *`,
    [
      id,
      e.title,
      e.date,
      e.startTime,
      e.endTime,
      e.venue,
    ]
  );
  return rows[0] ? rows[0] : null;
}

async function deleteExam(id) {
  await q('DELETE FROM academy_exams WHERE id = $1', [id]);
}

// ── academy invoices ──────────────────────────────────────────────────────────
async function listInvoices({ studentId, sessionId } = {}) {
  let sql = 'SELECT * FROM academy_invoices WHERE 1=1';
  let params = [];
  if (studentId) {
    sql += ` AND student_id = $${params.length + 1}`;
    params.push(studentId);
  }
  if (sessionId) {
    sql += ` AND session_id = $${params.length + 1}`;
    params.push(sessionId);
  }
  sql += ' ORDER BY due_date';
  const { rows } = await q(sql, params);
  return rows;
}

async function getInvoice(id) {
  const { rows } = await q(
    'SELECT * FROM academy_invoices WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function createInvoice(i) {
  const { rows } = await q(
    `INSERT INTO academy_invoices
      (id, student_id, session_id, title, amount, due_date, paid, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      i.id || newId('acin'),
      i.studentId,
      i.sessionId,
      i.title,
      i.amount,
      i.dueDate,
      i.paid === true,
      i.paid === true ? 'paid' : 'unpaid',
      i.createdBy || null,
    ]
  );
  return rows[0];
}

async function updateInvoice(id, i) {
  const { rows } = await q(
    `UPDATE academy_invoices
         SET title = COALESCE($2, title),
             amount = COALESCE($3, amount),
             due_date = COALESCE($4, due_date),
             paid = COALESCE($5, paid),
             status = CASE WHEN COALESCE($5, paid) THEN 'paid' ELSE 'unpaid' END
       WHERE id = $1 RETURNING *`,
    [
      id,
      i.title,
      i.amount,
      i.dueDate,
      i.paid,
    ]
  );
  return rows[0] ? rows[0] : null;
}

async function deleteInvoice(id) {
  await q('DELETE FROM academy_invoices WHERE id = $1', [id]);
}

async function listStudentPayments(studentId) {
  const [submissions, payments] = await Promise.all([
    q(
      `SELECT submission.*, invoice.title AS invoice_title,
              invoice.amount AS invoice_amount, invoice.due_date
         FROM academy_payment_submissions submission
         JOIN academy_invoices invoice ON invoice.id = submission.invoice_id
        WHERE submission.student_id = $1
        ORDER BY submission.submitted_at DESC`,
      [studentId]
    ),
    q(
      `SELECT payment.id, payment.invoice_id, payment.amount, payment.method,
              payment.reference, payment.note, payment.paid_at,
              invoice.title AS invoice_title
         FROM academy_payments payment
         JOIN academy_invoices invoice ON invoice.id = payment.invoice_id
        WHERE payment.student_id = $1
        ORDER BY payment.paid_at DESC`,
      [studentId]
    ),
  ]);
  return {
    submissions: submissions.rows,
    payments: payments.rows,
  };
}

async function createStudentPaymentSubmission(studentId, { invoiceId, method, reference, note }) {
  const { rows } = await q(
    `INSERT INTO academy_payment_submissions
      (id, student_id, invoice_id, method, reference, note)
     SELECT $1, invoice.student_id, invoice.id, $3, $4, $5
       FROM academy_invoices invoice
      WHERE invoice.id = $2 AND invoice.student_id = $6 AND invoice.paid = false
     RETURNING *`,
    [newId('acps'), invoiceId, method, reference, note || '', studentId]
  );
  return rows[0] || null;
}

async function listAdminPaymentSubmissions(status = 'pending') {
  const params = [];
  const statusFilter = status ? 'WHERE submission.status = $1' : '';
  if (status) params.push(status);
  const { rows } = await q(
    `SELECT submission.*, invoice.title AS invoice_title,
            invoice.amount AS invoice_amount, invoice.due_date,
            student.student_id AS student_number, student.first_name,
            student.middle_name, student.last_name, student.email, student.phone
       FROM academy_payment_submissions submission
       JOIN academy_invoices invoice ON invoice.id = submission.invoice_id
       JOIN academy_students student ON student.id = submission.student_id
       ${statusFilter}
      ORDER BY submission.submitted_at DESC
      LIMIT 500`,
    params
  );
  return rows;
}

async function reviewStudentPaymentSubmission(id, reviewerId, { approve, reviewNote = '' }) {
  return transaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM academy_payment_submissions WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const submission = rows[0];
    if (!submission) return null;
    if (submission.status !== 'pending') {
      const error = new Error('This payment submission has already been reviewed.');
      error.code = 'PAYMENT_SUBMISSION_REVIEWED';
      throw error;
    }

    if (approve) {
      const { rows: invoices } = await client.query(
        'SELECT * FROM academy_invoices WHERE id = $1 AND student_id = $2 FOR UPDATE',
        [submission.invoice_id, submission.student_id]
      );
      const invoice = invoices[0];
      if (!invoice || invoice.paid) {
        const error = new Error('The invoice is no longer available for payment.');
        error.code = 'INVOICE_ALREADY_PAID';
        throw error;
      }
      await client.query(
        `INSERT INTO academy_payments
          (id, student_id, invoice_id, amount, method, reference, note, recorded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          newId('acpy'), submission.student_id, submission.invoice_id,
          invoice.amount, submission.method, submission.reference,
          submission.note || null, reviewerId,
        ]
      );
      await client.query(
        `UPDATE academy_invoices SET paid = true, status = 'paid' WHERE id = $1`,
        [submission.invoice_id]
      );
    }

    const { rows: updated } = await client.query(
      `UPDATE academy_payment_submissions
          SET status = $2, review_note = $3, reviewed_by = $4, reviewed_at = now()
        WHERE id = $1 RETURNING *`,
      [id, approve ? 'approved' : 'rejected', reviewNote, reviewerId]
    );
    return updated[0];
  });
}

async function getStudentPaymentReceipt(studentId, paymentId) {
  const { rows } = await q(
    `SELECT payment.id, payment.amount, payment.method, payment.reference,
            payment.note, payment.paid_at, invoice.title AS invoice_title,
            invoice.session_id, session.name AS session_name,
            student.student_id AS student_number, student.first_name,
            student.middle_name, student.last_name, student.email,
            program.name AS program_name
       FROM academy_payments payment
       JOIN academy_invoices invoice ON invoice.id = payment.invoice_id
       JOIN academy_students student ON student.id = payment.student_id
       LEFT JOIN academy_sessions session ON session.id = invoice.session_id
       LEFT JOIN academy_programs program ON program.id = student.program_id
      WHERE payment.id = $1 AND payment.student_id = $2`,
    [paymentId, studentId]
  );
  return rows[0] || null;
}

// ── notifications log (audit of every email/SMS sent to a student) ──────────
async function logNotification(n) {
  const { rows } = await q(
    `INSERT INTO academy_notifications
      (id, student_id, channel, type, status, error, payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      n.id || newId('anot'), n.studentId || null, n.channel, n.type,
      n.status || 'sent', n.error || null,
      n.payload ? JSON.stringify(n.payload) : null,
    ]
  );
  return mapNotification(rows[0]);
}

async function createStudentPortalNotification({ studentId, type, title, message, metadata }) {
  const { rows } = await q(
    `INSERT INTO academy_student_notifications
      (id, student_id, type, title, message, metadata)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [
      newId('apn'), studentId, type, title, message,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
  return mapStudentPortalNotification(rows[0]);
}

async function countUnreadStudentPortalNotifications(studentId) {
  const { rows } = await q(
    `SELECT COUNT(*) AS unread_count
       FROM academy_student_notifications
      WHERE student_id = $1 AND is_read = false`,
    [studentId]
  );
  return Number(rows[0]?.unread_count) || 0;
}

function mapStudentPortalNotification(row) {
  let metadata = row.metadata;
  if (typeof metadata === 'string') {
    try { metadata = JSON.parse(metadata); } catch { metadata = null; }
  }
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    metadata: metadata || null,
    isRead: !!row.is_read,
    createdAt: iso(row.created_at),
  };
}

async function listStudentPortalNotifications(studentId, limit = 100) {
  const { rows } = await q(
    `SELECT * FROM academy_student_notifications
      WHERE student_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [studentId, Math.max(1, Math.min(Number(limit) || 100, 200))]
  );
  return rows.map(mapStudentPortalNotification);
}

async function markStudentPortalNotificationRead(studentId, { id, all = false }) {
  if (all) {
    const { rowCount } = await q(
      `UPDATE academy_student_notifications SET is_read = true
        WHERE student_id = $1 AND is_read = false`,
      [studentId]
    );
    return rowCount;
  }
  const { rows } = await q(
    `UPDATE academy_student_notifications SET is_read = true
      WHERE student_id = $1 AND id = $2 RETURNING *`,
    [studentId, id]
  );
  return rows[0] ? mapStudentPortalNotification(rows[0]) : null;
}

function mapSupportMessage(row) {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    senderId: row.sender_id,
    senderRole: row.sender_role,
    message: row.message,
    createdAt: iso(row.created_at),
  };
}

async function getSupportMessages(ticketIds) {
  const { rows } = await q(
    `SELECT * FROM academy_support_messages
      WHERE ticket_id = ANY($1::text[]) ORDER BY created_at`,
    [ticketIds]
  );
  return rows.map(mapSupportMessage);
}

async function listStudentSupportTickets(studentId) {
  const { rows } = await q(
    `SELECT * FROM academy_support_tickets
      WHERE student_id = $1 ORDER BY updated_at DESC`,
    [studentId]
  );
  const messages = await getSupportMessages(rows.map((ticket) => ticket.id));
  const grouped = new Map();
  for (const message of messages) {
    if (!grouped.has(message.ticketId)) grouped.set(message.ticketId, []);
    grouped.get(message.ticketId).push(message);
  }
  return rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    status: row.status,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    messages: grouped.get(row.id) || [],
  }));
}

async function listAdminSupportTickets(status = '') {
  const params = [];
  const statusFilter = status ? 'WHERE ticket.status = $1' : '';
  if (status) params.push(status);
  const { rows } = await q(
    `SELECT ticket.*, student.student_id AS student_number,
            student.first_name, student.middle_name, student.last_name,
            student.email
       FROM academy_support_tickets ticket
       JOIN academy_students student ON student.id = ticket.student_id
       ${statusFilter}
      ORDER BY CASE ticket.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
               ticket.updated_at DESC
      LIMIT 500`,
    params
  );
  const messages = await getSupportMessages(rows.map((ticket) => ticket.id));
  const grouped = new Map();
  for (const message of messages) {
    if (!grouped.has(message.ticketId)) grouped.set(message.ticketId, []);
    grouped.get(message.ticketId).push(message);
  }
  return rows.map((row) => ({
    id: row.id,
    studentId: row.student_id,
    studentNumber: row.student_number || '',
    studentName: [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' '),
    studentEmail: row.email || '',
    subject: row.subject,
    status: row.status,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    messages: grouped.get(row.id) || [],
  }));
}

async function createStudentSupportTicket(studentId, { subject, message }) {
  return transaction(async (client) => {
    const ticketId = newId('atkt');
    const { rows } = await client.query(
      `INSERT INTO academy_support_tickets (id, student_id, subject)
       VALUES ($1,$2,$3) RETURNING *`,
      [ticketId, studentId, subject]
    );
    const { rows: messages } = await client.query(
      `INSERT INTO academy_support_messages
        (id, ticket_id, sender_id, sender_role, message)
       VALUES ($1,$2,$3,'student',$4) RETURNING *`,
      [newId('atkm'), ticketId, studentId, message]
    );
    return {
      id: rows[0].id,
      subject: rows[0].subject,
      status: rows[0].status,
      createdAt: iso(rows[0].created_at),
      updatedAt: iso(rows[0].updated_at),
      messages: [mapSupportMessage(messages[0])],
    };
  });
}

async function addSupportMessage({ ticketId, senderId, senderRole, message }) {
  return transaction(async (client) => {
    const { rows: tickets } = await client.query(
      `SELECT * FROM academy_support_tickets
        WHERE id = $1 ${senderRole === 'student' ? 'AND student_id = $2' : ''}
        FOR UPDATE`,
      senderRole === 'student' ? [ticketId, senderId] : [ticketId]
    );
    const ticket = tickets[0];
    if (!ticket) return null;
    if (ticket.status === 'resolved' && senderRole === 'admin') {
      const error = new Error('Resolved support tickets cannot be replied to.');
      error.code = 'SUPPORT_TICKET_RESOLVED';
      throw error;
    }
    const { rows } = await client.query(
      `INSERT INTO academy_support_messages
        (id, ticket_id, sender_id, sender_role, message)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [newId('atkm'), ticketId, senderId, senderRole, message]
    );
    await client.query(
      `UPDATE academy_support_tickets
          SET status = CASE WHEN $2 = 'student' AND status = 'resolved'
                            THEN 'open'
                            WHEN $2 = 'admin' AND status = 'open'
                            THEN 'in_progress' ELSE status END,
              updated_at = now()
        WHERE id = $1`,
      [ticketId, senderRole]
    );
    return {
      ...mapSupportMessage(rows[0]),
      studentId: ticket.student_id,
      subject: ticket.subject,
    };
  });
}

async function updateAdminSupportTicketStatus(ticketId, status) {
  const { rows } = await q(
    `UPDATE academy_support_tickets
        SET status = $2, updated_at = now()
      WHERE id = $1 RETURNING *`,
    [ticketId, status]
  );
  return rows[0] || null;
}

async function listNotifications(studentId) {
  const { rows } = await q(
    'SELECT * FROM academy_notifications WHERE student_id = $1 ORDER BY created_at DESC',
    [studentId]
  );
  return rows.map(mapNotification);
}

async function getNotificationStatuses(studentId, type, eventId) {
  const { rows } = await q(
    `SELECT DISTINCT ON (channel) channel, status, error, created_at
       FROM academy_notifications
      WHERE student_id = $1 AND type = $2 AND payload->>'eventId' = $3
      ORDER BY channel, created_at DESC`,
    [studentId, type, eventId]
  );
  return rows;
}

async function listInvoiceReminderCandidates() {
  const { rows } = await q(
    `SELECT student.*, invoice.id AS invoice_id, invoice.title AS invoice_title,
            invoice.amount AS invoice_amount, invoice.due_date,
            CASE WHEN invoice.due_date = to_char(CURRENT_DATE, 'YYYY-MM-DD')
                 THEN 'invoice_due_today' ELSE 'invoice_overdue' END AS reminder_type
       FROM academy_invoices invoice
       JOIN academy_students student ON student.id = invoice.student_id
      WHERE invoice.paid = false
        AND invoice.due_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        AND invoice.due_date <= to_char(CURRENT_DATE, 'YYYY-MM-DD')
        AND student.status = 'active'
      ORDER BY invoice.due_date, student.last_name, student.first_name`
  );
  return rows.map((row) => ({
    student: mapStudent(row),
    invoiceId: row.invoice_id,
    title: row.invoice_title || 'Academy fee',
    amount: Number(row.invoice_amount) || 0,
    dueDate: dateOnly(row.due_date),
    type: row.reminder_type,
    eventId: `${row.invoice_id}:${dateOnly(row.due_date)}`,
  }));
}

async function listAssignmentReminderCandidates() {
  const { rows } = await q(
    `SELECT DISTINCT student.*, assignment.id AS assignment_id,
            assignment.title AS assignment_title, assignment.due_at,
            CASE WHEN assignment.due_at <= now()
                 THEN 'assignment_overdue_reminder'
                 ELSE 'assignment_deadline_reminder' END AS reminder_type,
            course.title AS course_title
       FROM academy_assignments assignment
       JOIN academy_courses course ON course.id = assignment.course_id
       JOIN academy_enrollments enrollment
         ON enrollment.course_id = assignment.course_id
        AND enrollment.session_id = assignment.session_id
        AND enrollment.status IN ('enrolled', 'active')
       JOIN academy_students student ON student.id = enrollment.student_id
      WHERE student.status = 'active'
        AND assignment.due_at BETWEEN now() - interval '7 days'
                                  AND now() + interval '24 hours'
        AND NOT EXISTS (
          SELECT 1
            FROM academy_submissions submission
           WHERE submission.assignment_id = assignment.id
             AND submission.student_id = student.id
        )
      ORDER BY assignment.due_at, student.last_name, student.first_name`
  );
  return rows.map((row) => ({
    student: mapStudent(row),
    assignmentId: row.assignment_id,
    title: row.assignment_title || 'Assignment',
    courseName: row.course_title || 'your course',
    type: row.reminder_type,
    dueAt: row.due_at instanceof Date ? row.due_at.toISOString() : String(row.due_at),
    eventId: `${row.assignment_id}:${row.due_at instanceof Date ? row.due_at.toISOString() : String(row.due_at)}`,
  }));
}

async function listFailedAdmissionSms() {
  const { rows } = await q(
    `SELECT s.*, latest.failed_channels, latest.failure_error, latest.failed_at
       FROM academy_students s
       JOIN LATERAL (
         SELECT string_agg(channel, ', ' ORDER BY channel) AS failed_channels,
                string_agg(channel || ': ' || COALESCE(error, 'Delivery failed'), '; ' ORDER BY channel) AS failure_error,
                max(created_at) AS failed_at
           FROM (
             SELECT DISTINCT ON (channel) channel, status, error, created_at
               FROM academy_notifications
              WHERE student_id = s.id AND type = 'admission_approved'
              ORDER BY channel, created_at DESC
           ) latest
          WHERE status = 'failed'
       ) latest ON true
      WHERE s.status = 'active'
        AND s.must_change_password = true
        AND latest.failed_channels IS NOT NULL
      ORDER BY latest.failed_at DESC
      LIMIT 100`
  );
  return rows.map((row) => ({
    ...mapStudent(row),
    failedChannels: row.failed_channels || '',
    notificationError: row.failure_error || '',
    notificationFailedAt: iso(row.failed_at),
  }));
}

async function listAnnouncements({ publishedOnly = false } = {}) {
  const { rows } = publishedOnly
    ? await q('SELECT * FROM academy_announcements WHERE published = true ORDER BY created_at DESC')
    : await q('SELECT * FROM academy_announcements ORDER BY created_at DESC');
  return rows;
}

async function createAnnouncement(announcement) {
  const { rows } = await q(
    `INSERT INTO academy_announcements
      (id, title, body, session_id, published, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      newId('acan'),
      announcement.title,
      announcement.body,
      announcement.sessionId || null,
      announcement.published !== false,
      announcement.createdBy || null,
    ]
  );
  return rows[0];
}

// ── academy settings ─────────────────────────────────────────────────────────
async function getAcademySetting(key) {
  const { rows } = await q('SELECT value FROM academy_settings WHERE key = $1', [key]);
  if (!rows[0]) return null;
  let value = rows[0].value;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { /* keep raw */ }
  }
  return value;
}

async function setAcademySetting(key, value) {
  const { rows } = await q(
    `INSERT INTO academy_settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value RETURNING value`,
    [key, JSON.stringify(value)]
  );
  return { key, value: rows[0].value };
}

// ── academy defaults seeding ─────────────────────────────────────────────────
const DEFAULT_GRADING = {
  weights: { ca: 30, exam: 70 }, // percentage split of the total score
  scale: [
    { letter: 'A', min: 80, point: 5 },
    { letter: 'B', min: 70, point: 4 },
    { letter: 'C', min: 60, point: 3 },
    { letter: 'D', min: 50, point: 2 },
    { letter: 'E', min: 45, point: 1 },
    { letter: 'F', min: 0,  point: 0 },
  ],
};

async function seedAcademy(log = () => {}) {
  // grading scale + weights (configurable in Academy Admin → Settings)
  if (!(await getAcademySetting('grading'))) {
    await setAcademySetting('grading', DEFAULT_GRADING);
    log('[seed] academy grading scale seeded (5.0-point scale, 30/70 CA-exam weights)');
  }
  // Student ID prefix
  if (!(await getAcademySetting('id_prefix'))) {
    await setAcademySetting('id_prefix', 'MITA');
    log('[seed] academy Student ID prefix seeded (MITA)');
  }
  // initial staff (academy admin) — from env, or data/academy-staff.json
  const staff = await listStaff();
  if (staff.length === 0) {
    const bcrypt = require('bcryptjs');
    let email = process.env.ACADEMY_ADMIN_EMAIL || 'admin@mita.edu.gh';
    let password = process.env.ACADEMY_ADMIN_PASSWORD || 'academy123';
    let name = 'Academy Administrator';
    const seeded = require('fs').existsSync(require('path').join(__dirname, 'data', 'academy-staff.json'))
      ? JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'data', 'academy-staff.json'), 'utf8'))
      : [];
    if (Array.isArray(seeded) && seeded.length > 0) {
      for (const s of seeded) {
        if (!s.email) continue;
        await createStaff({
          name: s.name || 'Staff',
          email: s.email,
          role: s.role || 'instructor',
          password: s.password || newId('tmp'),
        });
      }
      log(`[seed] academy staff seeded from data/academy-staff.json (${seeded.length})`);
    } else {
      await createStaff({ name, email, role: 'admin', password });
      log(`[seed] academy admin staff seeded (${email} / from ACADEMY_ADMIN_PASSWORD or 'academy123')`);
    }
    void bcrypt;
  }
}

async function getAcademyAdminReports(sessionId = '') {
 const [summaryResult, coursesResult, studentsResult] = await Promise.all([
   q(
     `SELECT
        (SELECT COUNT(*) FROM academy_students WHERE status = 'active') AS active_students,
        (SELECT COUNT(DISTINCT enrollment.student_id)
           FROM academy_enrollments enrollment
          WHERE enrollment.status IN ('enrolled', 'active')
            AND ($1 = '' OR enrollment.session_id = $1)) AS enrolled_students,
        (SELECT COUNT(DISTINCT course.id)
           FROM academy_courses course
           JOIN academy_enrollments enrollment ON enrollment.course_id = course.id
          WHERE enrollment.status IN ('enrolled', 'active')
            AND ($1 = '' OR enrollment.session_id = $1)) AS active_courses,
        (SELECT ROUND(AVG(grade.total)::numeric, 1)
           FROM academy_grades grade
           JOIN academy_enrollments enrollment ON enrollment.id = grade.enrollment_id
          WHERE enrollment.status IN ('enrolled', 'active')
            AND ($1 = '' OR enrollment.session_id = $1)) AS average_grade,
        (SELECT COUNT(*) FROM academy_attendance attendance
          WHERE $1 = '' OR attendance.session_id = $1) AS attendance_records,
        (SELECT COUNT(*) FROM academy_attendance attendance
          WHERE attendance.status = 'present'
            AND ($1 = '' OR attendance.session_id = $1)) AS present_records,
        (SELECT COALESCE(SUM(invoice.amount), 0) FROM academy_invoices invoice
          WHERE invoice.paid = true AND ($1 = '' OR invoice.session_id = $1)) AS paid_fees,
        (SELECT COALESCE(SUM(invoice.amount), 0) FROM academy_invoices invoice
          WHERE invoice.paid = false AND ($1 = '' OR invoice.session_id = $1)) AS outstanding_fees,
        (SELECT COUNT(*) FROM academy_payment_submissions submission
          JOIN academy_invoices invoice ON invoice.id = submission.invoice_id
          WHERE submission.status = 'pending'
            AND ($1 = '' OR invoice.session_id = $1)) AS pending_payments,
        (SELECT COUNT(*) FROM academy_support_tickets
          WHERE status IN ('open', 'in_progress')) AS open_support_tickets,
        (SELECT COUNT(*) FROM academy_student_scholarships) AS awarded_scholarships`,
     [sessionId]
   ),
   q(
     `SELECT course.id, course.code, course.title,
             (SELECT COUNT(DISTINCT enrollment.student_id)
                FROM academy_enrollments enrollment
               WHERE enrollment.course_id = course.id
                 AND enrollment.status IN ('enrolled', 'active')
                 AND ($1 = '' OR enrollment.session_id = $1)) AS enrollment_count,
             (SELECT ROUND(AVG(grade.total)::numeric, 1)
                FROM academy_grades grade
                JOIN academy_enrollments enrollment ON enrollment.id = grade.enrollment_id
               WHERE enrollment.course_id = course.id
                 AND enrollment.status IN ('enrolled', 'active')
                 AND ($1 = '' OR enrollment.session_id = $1)) AS average_grade,
             (SELECT COUNT(*)
                FROM academy_attendance attendance
               WHERE attendance.course_id = course.id
                 AND ($1 = '' OR attendance.session_id = $1)) AS attendance_count,
             (SELECT COUNT(*)
                FROM academy_attendance attendance
               WHERE attendance.course_id = course.id
                 AND attendance.status = 'present'
                 AND ($1 = '' OR attendance.session_id = $1)) AS present_count
        FROM academy_courses course
       ORDER BY course.title`,
     [sessionId]
   ),
   q(
     `SELECT student.id, student.student_id, student.first_name,
             student.middle_name, student.last_name, student.email,
             program.name AS program_name,
             COALESCE(enrollment_stats.course_count, 0) AS course_count,
             enrollment_stats.average_grade,
             COALESCE(attendance_stats.attendance_count, 0) AS attendance_count,
             COALESCE(attendance_stats.present_count, 0) AS present_count,
             COALESCE(invoice_stats.outstanding_amount, 0) AS outstanding_amount
        FROM academy_students student
        LEFT JOIN academy_programs program ON program.id = student.program_id
        LEFT JOIN LATERAL (
          SELECT COUNT(DISTINCT enrollment.course_id) AS course_count,
                 ROUND(AVG(grade.total)::numeric, 1) AS average_grade
            FROM academy_enrollments enrollment
            LEFT JOIN academy_grades grade ON grade.enrollment_id = enrollment.id
           WHERE enrollment.student_id = student.id
             AND enrollment.status IN ('enrolled', 'active')
             AND ($1 = '' OR enrollment.session_id = $1)
        ) enrollment_stats ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS attendance_count,
                 COUNT(*) FILTER (WHERE attendance.status = 'present') AS present_count
            FROM academy_attendance attendance
           WHERE attendance.student_id = student.id
             AND ($1 = '' OR attendance.session_id = $1)
        ) attendance_stats ON true
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(invoice.amount), 0) AS outstanding_amount
            FROM academy_invoices invoice
           WHERE invoice.student_id = student.id AND invoice.paid = false
             AND ($1 = '' OR invoice.session_id = $1)
        ) invoice_stats ON true
       WHERE student.status = 'active'
       ORDER BY student.last_name, student.first_name`,
     [sessionId]
   ),
 ]);
 const summary = summaryResult.rows[0] || {};
 return {
   summary: Object.fromEntries(
     Object.entries(summary).map(([key, value]) => [key, value == null ? 0 : Number(value)])
   ),
   courses: coursesResult.rows.map((row) => ({
     ...row,
     enrollment_count: Number(row.enrollment_count) || 0,
     average_grade: row.average_grade == null ? null : Number(row.average_grade),
     attendance_count: Number(row.attendance_count) || 0,
     present_count: Number(row.present_count) || 0,
   })),
   students: studentsResult.rows.map((row) => ({
     ...row,
     course_count: Number(row.course_count) || 0,
     average_grade: row.average_grade == null ? null : Number(row.average_grade),
     attendance_count: Number(row.attendance_count) || 0,
     present_count: Number(row.present_count) || 0,
     outstanding_amount: Number(row.outstanding_amount) || 0,
   })),
 };
}

module.exports = {
  q,
  ensureAcademyReady,
  reserveAcademyLoginAttempts,
  clearAcademyLoginAttempts,
  newId,
  // students
  listStudents, listAdminStudents, getStudent, getStudentByStudentId, getStudentByEmail,
  getStudentAuthByStudentId, getStudentCredentials, createPendingStudent, updateStudent, setStudentStatus,
  admitStudent, updateStudentPassword, nextSeq, deleteStudent,
  // staff
  listStaff, getStaff, getStaffByEmail, getStaffAuthByEmail, getStaffCredentials,
  createStaff, updateStaff, updateStaffPassword, deleteStaff,
  createInstructorInvitation, rotateInstructorInvitation, acceptInstructorInvitation,
  // programs and scholarships
  listPrograms, getProgram, createProgram, updateProgram, deleteProgram,
  listScholarships, getScholarship, createScholarship, updateScholarship, setScholarshipActive,
  getStudentScholarship, getStudentScholarshipApplication, listScholarshipApplications,
  createScholarshipApplication, reviewScholarshipApplication, assignStudentScholarship,
  // courses
  createCourse, listCourses, getCourse, setInstructorCourses, isCourseAssignedToInstructor,
  listInstructorRoster, listStudentsForCourseSession, listStudentsForSession,
  // sessions
  listSessions, createAcademySession, listEnrollmentsBySession, getStudentPortalData,
  // enrollments
  getEnrollment, createEnrollment, updateEnrollment, deleteEnrollment,
  // assignments
  listAssignments, getAssignment, createAssignment, updateAssignment, deleteAssignment,
  listInstructorAssignments, listStudentAssignments,
  createInstructorAssignment, updateInstructorAssignment,
  deleteInstructorAssignment,
  // submissions
  listSubmissions, getSubmission, createSubmission, updateSubmission, deleteSubmission,
  saveStudentSubmission, listInstructorSubmissions, updateInstructorSubmission,
  getInstructorSubmissionMaxScore,
  // grades
  calculateGrade, upsertGrade, getGrade, listInstructorGradebook, upsertInstructorGrade,
  listInstructorCourseProgress,
  // instructor attendance and lesson plans
  listStudentAttendance, listInstructorAttendance, saveInstructorAttendance,
  listInstructorLessonPlans, listStudentLessons, setStudentLessonProgress, createInstructorLessonPlan,
  updateInstructorLessonPlan, deleteInstructorLessonPlan,
  createInstructorLessonMaterial, listInstructorLessonMaterials,
  getInstructorLessonMaterial, getStudentLessonMaterial,
  listInstructorLessonMaterialKeys, deleteInstructorLessonMaterial,
  listInstructorQuizzes, createInstructorQuiz, updateInstructorQuiz, setInstructorQuizPublished,
  listStudentQuizzes, startStudentQuizAttempt, saveStudentQuizAnswers,
  submitStudentQuizAttempt, listStudentQuizResults,
  // timetable
  listTimetable, getTimetable, createTimetable, updateTimetable, deleteTimetable,
  // exams
  listExams, getExam, createExam, updateExam, deleteExam,
  // invoices
  listInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice,
  listStudentPayments, createStudentPaymentSubmission,
  listAdminPaymentSubmissions, reviewStudentPaymentSubmission, getStudentPaymentReceipt,
  // notifications
  logNotification, listNotifications, getNotificationStatuses,
  createStudentPortalNotification, listStudentPortalNotifications,
  countUnreadStudentPortalNotifications, markStudentPortalNotificationRead,
  // student support
  listStudentSupportTickets, listAdminSupportTickets,
  createStudentSupportTicket, addSupportMessage, updateAdminSupportTicketStatus,
  // administrator reports
  getAcademyAdminReports,
  listInvoiceReminderCandidates, listAssignmentReminderCandidates,
  listFailedAdmissionSms, listAnnouncements, createAnnouncement,
  // certificates and settings
  getStudentCertificate, createStudentCertificate,
  getAcademySetting, setAcademySetting,
};
