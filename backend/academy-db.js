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
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapStaff(r) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
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

async function getStudent(id) {
  const { rows } = await q('SELECT * FROM academy_students WHERE id = $1', [id]);
  return rows[0] ? mapStudent(rows[0]) : null;
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
      (id, first_name, middle_name, last_name, email, phone, program_id, status,
       dob, gender, nationality, address, city, region, country,
       guardian_name, guardian_relationship, guardian_phone,
       highest_qualification, institution, field_of_study, graduation_year, study_reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
     RETURNING *`,
    [
      s.id || newId('astu'), s.firstName, s.middleName || '', s.lastName, s.email,
      s.phone || '', s.programId || null, s.dob || '', s.gender || '', s.nationality || '',
      s.address || '', s.city || '', s.region || '', s.country || '',
      s.guardianName || '', s.guardianRelationship || '', s.guardianPhone || '',
      s.highestQualification || '', s.institution || '', s.fieldOfStudy || '',
      s.graduationYear || '', s.studyReason || '',
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
            status = COALESCE($5, status)
      WHERE id = $1 RETURNING *`,
    [id, s.name, s.email, s.role, s.status]
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

async function createInstructorInvitation({ name, email, tokenHash, expiresAt }) {
  return transaction(async (client) => {
    const staffId = newId('astf');
    const { rows } = await client.query(
      `INSERT INTO academy_staff (id, name, email, role, status, password_hash)
       VALUES ($1, $2, $3, 'instructor', 'pending', NULL)
       RETURNING *`,
      [staffId, name, email]
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

async function listCourses({ instructorStaffId } = {}) {
  const params = [];
  let where = '';
  if (instructorStaffId) {
    params.push(instructorStaffId);
    where = 'WHERE c.instructor_staff_id = $1';
  }
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
                sub.id AS submission_id, sub.submitted_at, sub.score, sub.feedback
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
        `SELECT id, session_id, title, amount, due_date, status
           FROM academy_invoices
          WHERE student_id = $1
          ORDER BY due_date NULLS LAST`,
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

async function createStudentSubmission(studentId, submission) {
  const { rows } = await q(
    `INSERT INTO academy_submissions
      (id, assignment_id, student_id, text, file)
     SELECT $1, a.id, e.student_id, $4, $5
       FROM academy_assignments a
       JOIN academy_enrollments e
         ON e.student_id = $2 AND e.course_id = a.course_id
        AND e.session_id = a.session_id AND e.status IN ('enrolled', 'active')
      WHERE a.id = $3
     RETURNING *`,
    [
      newId('acms'), studentId, submission.assignmentId,
      submission.text || null, submission.file || null,
    ]
  );
  return rows[0] ? mapSubmission(rows[0]) : null;
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
    `SELECT p.* FROM academy_lesson_plans p
       JOIN academy_courses c ON c.id = p.course_id
      WHERE c.instructor_staff_id = $1 AND p.course_id = $2
      ORDER BY p.lesson_date NULLS LAST, p.created_at DESC`,
    [staffId, courseId]
  );
  return rows.map(mapLessonPlan);
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
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
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
      (id, student_id, session_id, title, amount, due_date, paid, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      i.id || newId('acin'),
      i.studentId,
      i.sessionId,
      i.title,
      i.amount,
      i.dueDate,
      i.paid !== undefined ? i.paid : false,
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
             paid = COALESCE($5, paid)
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

async function listNotifications(studentId) {
  const { rows } = await q(
    'SELECT * FROM academy_notifications WHERE student_id = $1 ORDER BY created_at DESC',
    [studentId]
  );
  return rows.map(mapNotification);
}

async function listFailedAdmissionSms() {
  const { rows } = await q(
    `SELECT s.*, latest.error AS sms_error, latest.created_at AS sms_failed_at
       FROM academy_students s
       JOIN LATERAL (
         SELECT status, error, created_at
           FROM academy_notifications
          WHERE student_id = s.id AND channel = 'sms' AND type = 'admission_approved'
          ORDER BY created_at DESC
          LIMIT 1
       ) latest ON true
      WHERE s.status = 'active'
        AND s.must_change_password = true
        AND latest.status = 'failed'
      ORDER BY latest.created_at DESC
      LIMIT 100`
  );
  return rows.map((row) => ({
    ...mapStudent(row),
    smsError: row.sms_error || '',
    smsFailedAt: iso(row.sms_failed_at),
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

const SAMPLE_PROGRAMS = [
  {
    code: 'NET',
    name: 'Network Engineering',
    description:
      'Design, build and maintain business networks — structured cabling, routing & switching, wireless and network troubleshooting.',
    durationSemesters: 4,
  },
  {
    code: 'SEC',
    name: 'Cybersecurity',
    description:
      'Protect organisations against modern threats — security audits, endpoint protection, incident response and safe online practice.',
    durationSemesters: 4,
  },
  {
    code: 'CLD',
    name: 'Cloud Computing',
    description:
      'Deploy and manage cloud infrastructure — migrations, backups, productivity suites and cost-effective cloud operations.',
    durationSemesters: 4,
  },
];

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
  // sample published programs so registration works out of the box
  const programs = await listPrograms();
  if (programs.length === 0) {
    for (const p of SAMPLE_PROGRAMS) await createProgram(p);
    log(`[seed] academy sample programs seeded (${SAMPLE_PROGRAMS.length})`);
  }
}

module.exports = {
  q,
  ensureAcademyReady,
  newId,
  // students
  listStudents, getStudent, getStudentByStudentId, getStudentByEmail,
  getStudentAuthByStudentId, getStudentCredentials, createPendingStudent, updateStudent, setStudentStatus,
  admitStudent, updateStudentPassword, nextSeq, deleteStudent,
  // staff
  listStaff, getStaff, getStaffByEmail, getStaffAuthByEmail, getStaffCredentials,
  createStaff, updateStaff, updateStaffPassword, deleteStaff,
  createInstructorInvitation, rotateInstructorInvitation, acceptInstructorInvitation,
  // programs
  listPrograms, getProgram, createProgram, updateProgram, deleteProgram,
  // courses
  createCourse, listCourses, getCourse, setInstructorCourses, isCourseAssignedToInstructor,
  listInstructorRoster,
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
  createStudentSubmission, listInstructorSubmissions, updateInstructorSubmission,
  getInstructorSubmissionMaxScore,
  // grades
  calculateGrade, upsertGrade, getGrade, listInstructorGradebook, upsertInstructorGrade,
  // instructor attendance and lesson plans
  listInstructorAttendance, saveInstructorAttendance,
  listInstructorLessonPlans, createInstructorLessonPlan,
  updateInstructorLessonPlan, deleteInstructorLessonPlan,
  // timetable
  listTimetable, getTimetable, createTimetable, updateTimetable, deleteTimetable,
  // exams
  listExams, getExam, createExam, updateExam, deleteExam,
  // invoices
  listInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice,
  // notifications
  logNotification, listNotifications, listFailedAdmissionSms, listAnnouncements, createAnnouncement,
  // settings
  getAcademySetting, setAcademySetting,
};
