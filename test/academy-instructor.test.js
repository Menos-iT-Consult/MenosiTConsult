const test = require('node:test');
const assert = require('node:assert/strict');
const {
  INVITATION_LIFETIME_MS,
  createInstructorInvitationToken,
  hashInstructorInvitationToken,
  isInstructorInvitationRedeemable,
} = require('../lib/academy-invitations');
const { instructorOwnsCourse } = require('../lib/academy-staff');

test('instructor setup tokens are random, hashed, and expire after seven days', () => {
  const now = new Date('2025-01-01T00:00:00.000Z');
  const first = createInstructorInvitationToken(now);
  const second = createInstructorInvitationToken(now);

  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.notEqual(first.token, second.token);
  assert.equal(first.tokenHash, hashInstructorInvitationToken(first.token));
  assert.notEqual(first.tokenHash, first.token);
  assert.equal(new Date(first.expiresAt).getTime() - now.getTime(), INVITATION_LIFETIME_MS);
  assert.equal(hashInstructorInvitationToken('not-a-token'), null);
});

test('only an unexpired, unused pending instructor invitation can be accepted', () => {
  const now = new Date('2025-01-02T00:00:00.000Z');
  const valid = {
    role: 'instructor',
    status: 'pending',
    consumedAt: null,
    expiresAt: '2025-01-03T00:00:00.000Z',
  };

  assert.equal(isInstructorInvitationRedeemable(valid, now), true);
  assert.equal(isInstructorInvitationRedeemable({ ...valid, consumedAt: now }, now), false);
  assert.equal(isInstructorInvitationRedeemable({ ...valid, expiresAt: now }, now), false);
  assert.equal(isInstructorInvitationRedeemable({ ...valid, status: 'inactive' }, now), false);
  assert.equal(isInstructorInvitationRedeemable({ ...valid, status: 'active' }, now), false);
  assert.equal(isInstructorInvitationRedeemable({ ...valid, role: 'admin' }, now), false);
});

test('instructors can access only their own active course assignments', () => {
  const instructor = { id: 'staff-1', role: 'instructor', status: 'active' };
  assert.equal(instructorOwnsCourse(instructor, { instructorStaffId: 'staff-1' }), true);
  assert.equal(instructorOwnsCourse(instructor, { instructorStaffId: 'staff-2' }), false);
  assert.equal(instructorOwnsCourse({ ...instructor, status: 'inactive' }, { instructorStaffId: 'staff-1' }), false);
  assert.equal(instructorOwnsCourse({ ...instructor, role: 'admin' }, { instructorStaffId: 'staff-1' }), false);
  assert.equal(instructorOwnsCourse(instructor, null), false);
});

test('Academy invitation uses its custom From address and separate SMTP transport', async () => {
  const mailer = require('../backend/mailer');
  const names = [
    'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM',
    'ACADEMY_SMTP_HOST', 'ACADEMY_SMTP_PORT', 'ACADEMY_SMTP_USER',
    'ACADEMY_SMTP_PASS', 'ACADEMY_SMTP_FROM',
  ];
  const originalEnvironment = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  const academySmtp = {
    ACADEMY_SMTP_HOST: 'academy.example.test',
    ACADEMY_SMTP_PORT: '465',
    ACADEMY_SMTP_USER: 'smtp-account@example.test',
    ACADEMY_SMTP_PASS: 'placeholder',
    ACADEMY_SMTP_FROM: 'academy@menositconsult.com',
  };
  let capturedMessage;
  let capturedMainMessage;
  let mainTransporter;
  let academyTransporter;
  let originalMainSendMail;
  let originalAcademySendMail;

  try {
    process.env.SMTP_HOST = 'main.example.test';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'main@example.test';
    process.env.SMTP_PASS = 'placeholder';
    process.env.SMTP_FROM = 'support@menositconsult.com';
    Object.assign(process.env, academySmtp);

    mainTransporter = mailer.getTransporter();
    academyTransporter = mailer.getAcademyTransporter();
    originalMainSendMail = mainTransporter.sendMail;
    originalAcademySendMail = academyTransporter.sendMail;
    mainTransporter.sendMail = async (message) => {
      capturedMainMessage = message;
      return { messageId: 'main-test-message' };
    };
    academyTransporter.sendMail = async (message) => {
      capturedMessage = message;
      return { messageId: 'test-message' };
    };

    try {
      const result = await mailer.sendInstructorInvitationEmail({
        to: 'instructor@example.test',
        name: 'Test Instructor',
        setupUrl: 'https://academy.example.test/instructor/setup?token=sample',
      });
      assert.deepEqual(result, { ok: true });
      assert.equal(capturedMessage.from, '"MITA Academy" <academy@menositconsult.com>');
      const welcomeResult = await mailer.sendWelcomeEmail({ email: 'subscriber@example.test' });
      assert.equal(welcomeResult.sent, true);
      assert.equal(capturedMainMessage.from, '"Menos iT Consult" <support@menositconsult.com>');
      assert.equal(mainTransporter.options.host, 'main.example.test');
      assert.equal(academyTransporter.options.host, 'academy.example.test');
      assert.notEqual(mainTransporter, academyTransporter);
    } finally {
      if (mainTransporter && originalMainSendMail) mainTransporter.sendMail = originalMainSendMail;
      if (academyTransporter && originalAcademySendMail) academyTransporter.sendMail = originalAcademySendMail;
    }
  } finally {
    for (const name of names) {
      if (originalEnvironment[name] == null) delete process.env[name];
      else process.env[name] = originalEnvironment[name];
    }
  }
});

test('Academy R2 requires its own bucket and rejects the main-site bucket', async () => {
  const academyR2 = require('../backend/academy-r2');
  const names = [
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET',
    'ACADEMY_R2_BUCKET',
    'ACADEMY_R2_PUBLIC_BASE',
  ];
  const originalEnvironment = Object.fromEntries(names.map((name) => [name, process.env[name]]));

  try {
    process.env.R2_ACCESS_KEY_ID = 'test-access';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    process.env.R2_BUCKET = 'main-media';
    process.env.ACADEMY_R2_BUCKET = 'academy-media';
    process.env.ACADEMY_R2_PUBLIC_BASE = 'https://academy-media.example.test/';
    assert.equal(academyR2.r2Enabled(), true);
    assert.equal(academyR2.publicBase(), 'https://academy-media.example.test');

    process.env.ACADEMY_R2_BUCKET = 'MAIN-MEDIA';
    assert.equal(academyR2.r2Enabled(), false);
    await assert.rejects(
      academyR2.putImage(Buffer.from('test'), 'image/png'),
      /ACADEMY_R2_BUCKET must be different from R2_BUCKET/
    );

    delete process.env.ACADEMY_R2_BUCKET;
    assert.equal(academyR2.r2Enabled(), false);
    await assert.rejects(
      academyR2.putImage(Buffer.from('test'), 'image/png'),
      /Academy R2 is not configured/
    );
  } finally {
    for (const name of names) {
      if (originalEnvironment[name] == null) delete process.env[name];
      else process.env[name] = originalEnvironment[name];
    }
  }
});
