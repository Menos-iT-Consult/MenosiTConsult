const test = require('node:test');
const assert = require('node:assert/strict');
const {
  INVITATION_LIFETIME_MS,
  createInstructorInvitationToken,
  hashInstructorInvitationToken,
  isInstructorInvitationRedeemable,
} = require('../lib/academy-invitations');
const { instructorOwnsCourse } = require('../lib/academy-staff');
const {
  deliverInstructorInvitation,
  invitationSmsMessage,
} = require('../lib/academy-invitation-delivery');

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

test('instructor invitations send the same setup link by email and SMS and log both deliveries', async () => {
  const calls = [];
  const logs = [];
  const delivery = await deliverInstructorInvitation({
    id: 'staff-1',
    name: 'Test Instructor',
    email: 'instructor@example.test',
    phone: '0241234567',
  }, 'https://academy.example.test/instructor/setup?token=single-use-token', {
    emailSender: async (message) => {
      calls.push(['email', message]);
      return { ok: true };
    },
    smsSender: async (message) => {
      calls.push(['sms', message]);
      return { ok: true, campaignId: 'campaign-1' };
    },
    log: async (entry) => logs.push(entry),
  });

  assert.equal(delivery.email.sent, true);
  assert.equal(delivery.sms.sent, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][1].setupUrl, 'https://academy.example.test/instructor/setup?token=single-use-token');
  assert.match(calls[1][1].message, /single-use-token/);
  assert.equal(logs.length, 2);
  assert.deepEqual(logs.map((entry) => entry.channel), ['email', 'sms']);
  assert.equal(invitationSmsMessage('Instructor\nName', 'https://academy.example.test/setup').includes('\n'), false);
});

test('instructor invitation attempts SMS and records its result when email delivery fails', async () => {
  const attempted = [];
  const logs = [];
  const delivery = await deliverInstructorInvitation({
    id: 'staff-1',
    name: 'Test Instructor',
    email: 'instructor@example.test',
    phone: '0241234567',
  }, 'https://academy.example.test/instructor/setup?token=single-use-token', {
    emailSender: async () => {
      attempted.push('email');
      return { ok: false, error: 'SMTP unavailable' };
    },
    smsSender: async () => {
      attempted.push('sms');
      return { ok: true };
    },
    log: async (entry) => logs.push(entry),
  });

  assert.deepEqual(attempted, ['email', 'sms']);
  assert.equal(delivery.email.sent, false);
  assert.equal(delivery.sms.sent, true);
  assert.deepEqual(logs.map(({ channel, status }) => [channel, status]), [
    ['email', 'failed'],
    ['sms', 'sent'],
  ]);
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
    'ACADEMY_CERTIFICATE_R2_BUCKET',
  ];
  const originalEnvironment = Object.fromEntries(names.map((name) => [name, process.env[name]]));

  try {
    process.env.R2_ACCESS_KEY_ID = 'test-access';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    process.env.R2_BUCKET = 'main-media';
    process.env.ACADEMY_R2_BUCKET = 'academy-media';
    process.env.ACADEMY_CERTIFICATE_R2_BUCKET = 'academy-private-certificates';
    process.env.ACADEMY_R2_PUBLIC_BASE = 'https://academy-media.example.test/';
    assert.equal(academyR2.r2Enabled(), true);
    assert.equal(academyR2.certificateStorageEnabled(), true);
    assert.equal(academyR2.publicBase(), 'https://academy-media.example.test');
    const mediaKey = 'academy/media/2026/student-photo.jpg';
    assert.equal(academyR2.getAcademyMediaKey(mediaKey), mediaKey);
    assert.equal(
      academyR2.getAcademyMediaKey(`https://academy-media.example.test/${mediaKey}?cache=1`),
      mediaKey
    );
    assert.equal(academyR2.getAcademyMediaKey(`https://other.example.test/${mediaKey}`), mediaKey);
    assert.equal(academyR2.getAcademyMediaKey('academy/media/2026/../student.jpg'), '');
    assert.equal(academyR2.getAcademyMediaMime('academy/media/2026/photo.jpeg'), 'image/jpeg');

    process.env.ACADEMY_R2_PUBLIC_BASE = '';
    assert.equal(
      academyR2.getAcademyMediaKey(`https://legacy-media.example.test/${mediaKey}?cache=1`),
      mediaKey
    );
    assert.equal(academyR2.getAcademyMediaKey(`/${mediaKey}`), mediaKey);
    assert.equal(academyR2.getAcademyMediaKey(`http://legacy-media.example.test/${mediaKey}`), '');
    assert.equal(
      academyR2.getAcademyMediaKey('https://legacy-media.example.test/academy/media/2026/../student.jpg'),
      ''
    );
    process.env.ACADEMY_R2_PUBLIC_BASE = 'https://academy-media.example.test/';

    process.env.ACADEMY_CERTIFICATE_R2_BUCKET = 'ACADEMY-MEDIA';
    assert.equal(academyR2.certificateStorageEnabled(), false);
    process.env.ACADEMY_CERTIFICATE_R2_BUCKET = 'MAIN-MEDIA';
    assert.equal(academyR2.certificateStorageEnabled(), false);
    process.env.ACADEMY_CERTIFICATE_R2_BUCKET = 'academy-private-certificates';

    await assert.rejects(
      academyR2.getPrivatePdfBytes('../public/certificate.pdf'),
      /Invalid private Academy PDF key/
    );
    await assert.rejects(
      academyR2.deletePrivatePdf('academy/private/certificates/issued/2026/not-a-pdf.pdf'),
      /Invalid private Academy PDF key/
    );
    assert.equal(
      academyR2.isPrivatePhotoKey('academy/private/student-photos/2026/0123456789abcdef0123456789abcdef01234567.jpg'),
      true
    );
    assert.equal(
      academyR2.isPrivatePhotoKey('academy/private/student-photos/2026/0123456789abcdef0123456789abcdef01234567.jpeg'),
      true
    );
    const privatePhotoKey = 'academy/private/student-photos/2026/0123456789abcdef0123456789abcdef01234567.jpg';
    assert.equal(academyR2.getPrivatePhotoKey(privatePhotoKey), privatePhotoKey);
    assert.equal(
      academyR2.getPrivatePhotoKey(`https://legacy-storage.example.test/${privatePhotoKey}?download=1`),
      privatePhotoKey
    );
    assert.equal(academyR2.getPrivatePhotoKey(`/${privatePhotoKey}`), privatePhotoKey);
    assert.equal(academyR2.getPrivatePhotoKey(`http://legacy-storage.example.test/${privatePhotoKey}`), '');
    assert.equal(academyR2.isPrivatePhotoKey('academy/media/2026/student.jpg'), false);
    await assert.rejects(
      academyR2.getPrivatePhoto('academy/media/2026/student.jpg'),
      /Invalid private Academy passport photo key/
    );
    assert.equal(
      academyR2.isPrivateCourseMaterialKey('academy/private/course-content/2026/0123456789abcdef0123456789abcdef01234567.pdf'),
      true
    );
    assert.equal(
      academyR2.isPrivateCourseMaterialKey('academy/private/course-content/2026/../../student.pdf'),
      false
    );
    await assert.rejects(
      academyR2.getPrivateCourseMaterial('academy/media/2026/student.pdf'),
      /Invalid private Academy course material key/
    );

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
