import { NextResponse } from 'next/server';

const academy = require('../../../../backend/academy-db');
const storage = require('../../../../backend/academy-r2');
const { noDbErrorResponse } = require('../../../../lib/api-helpers');
const { getAcademySiteUrl } = require('../../../../lib/academy-site-url');
const { ADMISSIONS_SETTING_KEY, isAdmissionsOpen } = require('../../../../lib/academy-admissions');
const { sendStudentNotification } = require('../../../../lib/academy-notifications');
const { validatePassportPhoto } = require('../../../../lib/academy-passport-photo');
const {
  getCountryRegions,
  isCountry,
  isGender,
  isRegionForCountry,
  normalizePhoneNumber,
} = require('../../../../lib/academy-registration');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const QUALIFICATIONS = new Set([
  'Secondary school',
  'Professional certificate',
  'Diploma',
  "Bachelor's degree",
  "Master's degree",
  'Doctoral degree',
  'Other',
]);

// Public: submit an application to the IT Academy.
// Creates a 'pending' student; staff admission issues credentials and sends
// the Student ID and temporary password to the applicant by SMS.
export async function POST(request) {
  try {
    if (!isAdmissionsOpen(await academy.getAcademySetting(ADMISSIONS_SETTING_KEY))) {
      return NextResponse.json(
        { error: 'Admissions are currently closed. Please check back later.' },
        { status: 403 }
      );
    }
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy admissions availability check error:', error);
    return NextResponse.json(
      { error: 'Could not verify whether admissions are open. Please try again later.' },
      { status: 500 }
    );
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data;')) {
    return NextResponse.json({ error: 'Submit the application with its required passport photo.' }, { status: 400 });
  }
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > 6 * 1024 * 1024) {
    return NextResponse.json({ error: 'The application upload is too large.' }, { status: 413 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'The application upload could not be read.' }, { status: 400 });
  }
  const application = formData.get('application');
  let payload = {};
  if (typeof application === 'string') {
    try {
      payload = JSON.parse(application);
    } catch {
      return NextResponse.json({ error: 'The application details are invalid.' }, { status: 400 });
    }
  }
  const body = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  const photoFile = formData.get('passportPhoto');
  if (!photoFile || typeof photoFile.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'A passport photo is required.' }, { status: 400 });
  }
  if (!storage.certificateStorageEnabled()) {
    return NextResponse.json({ error: 'Private Academy photo storage is not configured.' }, { status: 503 });
  }
  let photoBytes;
  try {
    photoBytes = Buffer.from(await photoFile.arrayBuffer());
  } catch {
    return NextResponse.json({ error: 'The passport photo could not be read.' }, { status: 400 });
  }
  const photoError = validatePassportPhoto(photoBytes, photoFile.type);
  if (photoError) {
    return NextResponse.json({ error: photoError }, { status: 400 });
  }
  const text = (key) => (typeof body[key] === 'string' ? body[key].trim() : '');
  const firstName = text('firstName');
  const middleName = text('middleName');
  const lastName = text('lastName');
  const dateOfBirth = text('dateOfBirth');
  const gender = text('gender');
  const nationality = text('nationality');
  const email = text('email');
  const phone = text('phone');
  const address = text('address');
  const city = text('city');
  const region = text('region');
  const guardianName = text('guardianName');
  const guardianRelationship = text('guardianRelationship');
  const guardianPhone = text('guardianPhone');
  const highestQualification = text('highestQualification');
  const institution = text('institution');
  const fieldOfStudy = text('fieldOfStudy');
  const graduationYear = text('graduationYear');
  const studyReason = text('studyReason');
  const programId = text('programId');

  const missing = [
    ['First name', firstName],
    ['Last name', lastName],
    ['Date of birth', dateOfBirth],
    ['Country', nationality],
    ['Gender', gender],
    ['Email', email],
    ['Phone number', phone],
    ['Residential address', address],
    ['City or town', city],
    ['Highest qualification', highestQualification],
    ['School, college, or institution', institution],
    ['Program', programId],
    ['Study statement', studyReason],
  ].filter(([, v]) => !v).map(([label]) => label);

  if (missing.length) {
    return NextResponse.json({ error: `${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} required.` }, { status: 400 });
  }
  const dob = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
    Number.isNaN(dob.getTime()) ||
    dob.toISOString().slice(0, 10) !== dateOfBirth ||
    dob > new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z')
  ) {
    return NextResponse.json({ error: 'Please provide a valid date of birth.' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
  }
  if (!isCountry(nationality)) {
    return NextResponse.json({ error: 'Please choose a valid country.' }, { status: 400 });
  }
  const normalizedPhone = normalizePhoneNumber(phone, nationality);
  if (!normalizedPhone) {
    return NextResponse.json({ error: 'Please provide a valid phone number for the selected country.' }, { status: 400 });
  }
  const normalizedGuardianPhone = guardianPhone
    ? normalizePhoneNumber(guardianPhone, nationality)
    : '';
  if (guardianPhone && !normalizedGuardianPhone) {
    return NextResponse.json({ error: 'Please provide a valid emergency contact phone number for the selected country.' }, { status: 400 });
  }
  if (getCountryRegions(nationality).length && !region) {
    return NextResponse.json({ error: 'Please choose a region or state.' }, { status: 400 });
  }
  if (!isRegionForCountry(nationality, region)) {
    return NextResponse.json({ error: 'Please choose a valid region or state for the selected country.' }, { status: 400 });
  }
  if (!isGender(gender)) {
    return NextResponse.json({ error: 'Please choose Male or Female.' }, { status: 400 });
  }
  if (!QUALIFICATIONS.has(highestQualification)) {
    return NextResponse.json({ error: 'Please choose a valid qualification.' }, { status: 400 });
  }
  if (graduationYear && (!/^\d{4}$/.test(graduationYear) || Number(graduationYear) < 1950 || Number(graduationYear) > new Date().getFullYear() + 10)) {
    return NextResponse.json({ error: 'Please provide a valid year of completion.' }, { status: 400 });
  }
  if (studyReason.length < 20 || studyReason.length > 1000) {
    return NextResponse.json({ error: 'Your study statement must be between 20 and 1,000 characters.' }, { status: 400 });
  }
  const maxLengths = [
    ['First name', firstName, 100],
    ['Middle name', middleName, 100],
    ['Last name', lastName, 100],
    ['Country', nationality, 100],
    ['Email', email, 254],
    ['Phone number', phone, 30],
    ['Residential address', address, 300],
    ['City or town', city, 100],
    ['Region or state', region, 100],
    ['Emergency contact name', guardianName, 150],
    ['Emergency contact relationship', guardianRelationship, 80],
    ['Emergency contact phone', guardianPhone, 30],
    ['Institution', institution, 200],
    ['Field of study', fieldOfStudy, 150],
  ];
  const tooLong = maxLengths.find(([, value, max]) => value.length > max);
  if (tooLong) {
    return NextResponse.json({ error: `${tooLong[0]} must be ${tooLong[2]} characters or fewer.` }, { status: 400 });
  }
  if (body.confirmAccuracy !== true || body.termsAccepted !== true || body.privacyConsent !== true) {
    return NextResponse.json({ error: 'Please confirm your information and accept the Academy Terms and Conditions and Privacy Policy.' }, { status: 400 });
  }

  let photoKey = '';
  try {
    const program = await academy.getProgram(programId);
    if (!program || !program.published) {
      return NextResponse.json({ error: 'Please choose one of the available programs.' }, { status: 400 });
    }

    const existing = await academy.getStudentByEmail(email);
    if (existing) {
      return NextResponse.json(
        {
          error:
            existing.status === 'pending'
              ? 'You have already submitted an application with this email — our admissions office will contact you shortly.'
              : 'This email is already registered. Try signing in instead, or contact the academy office.',
        },
        { status: 409 }
      );
    }

    const storedPhoto = await storage.putPrivatePhoto(photoBytes, photoFile.type);
    photoKey = storedPhoto.key;
    const student = await academy.createPendingStudent({
      firstName,
      middleName,
      lastName,
      photo: photoKey,
      dob: dateOfBirth,
      gender,
      nationality,
      email,
      phone: normalizedPhone,
      address,
      city,
      region,
      country: '',
      guardianName,
      guardianRelationship,
      guardianPhone: normalizedGuardianPhone,
      highestQualification,
      institution,
      fieldOfStudy,
      graduationYear,
      studyReason,
      programId,
      confirmAccuracy: body.confirmAccuracy,
      termsAccepted: body.termsAccepted,
      privacyConsent: body.privacyConsent,
    });
    photoKey = '';

    const portalUrl = new URL('/student', getAcademySiteUrl(request)).toString();
    const name = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
    const notifications = await sendStudentNotification(student, {
      type: 'application_received',
      subject: 'MITA Academy application received',
      emailMessage: `Hello ${name},\n\nWe have received your application to ${program.name}. The admissions team will review it and contact you with an update.\n\nYou can return to the Academy portal at ${portalUrl}.`,
      smsMessage: `MITA Academy: We received your application to ${program.name}. The admissions team will contact you after review.`,
    });
    const confirmation = notifications.email.sent && notifications.sms.sent
      ? 'Email and SMS confirmations were sent.'
      : 'Your application was received, but one or more confirmations could not be sent. The Academy will still review it.';
    return NextResponse.json({
      success: true,
      application: {
        firstName: student.firstName,
        lastName: student.lastName,
        program: program.name,
      },
      notifications,
      message: `Application received. ${confirmation} Once the admissions office reviews it, you will receive your admission decision and portal details.`,
    });
  } catch (err) {
    if (photoKey) {
      try {
        await storage.deletePrivatePhoto(photoKey);
      } catch (cleanupError) {
        console.error('Failed to clean up passport photo after application failure:', cleanupError);
      }
    }
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy register error:', err);
    return NextResponse.json({ error: 'Could not submit your application. Please try again.' }, { status: 500 });
  }
}
