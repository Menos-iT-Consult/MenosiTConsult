import { NextResponse } from 'next/server';

const academy = require('../../../../backend/academy-db');
const { noDbErrorResponse } = require('../../../../lib/api-helpers');
const { isCountry, isGender } = require('../../../../lib/academy-registration');

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
  const payload = await request.json().catch(() => ({}));
  const body = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
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
  const country = text('country');
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
    ['Region or state', region],
    ['Country of residence', country],
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
  if (phone.replace(/\D/g, '').length < 9) {
    return NextResponse.json({ error: 'Please provide a valid phone number (needed for your admission SMS).' }, { status: 400 });
  }
  if (guardianPhone && guardianPhone.replace(/\D/g, '').length < 9) {
    return NextResponse.json({ error: 'Please provide a valid emergency contact phone number.' }, { status: 400 });
  }
  if (!isCountry(nationality)) {
    return NextResponse.json({ error: 'Please choose a valid country.' }, { status: 400 });
  }
  if (!isCountry(country)) {
    return NextResponse.json({ error: 'Please choose a valid country of residence.' }, { status: 400 });
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
    ['Country of residence', country, 100],
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
  if (body.confirmAccuracy !== true || body.privacyConsent !== true) {
    return NextResponse.json({ error: 'Please confirm your information and consent before submitting.' }, { status: 400 });
  }

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

    const student = await academy.createPendingStudent({
      firstName,
      middleName,
      lastName,
      dob: dateOfBirth,
      gender,
      nationality,
      email,
      phone,
      address,
      city,
      region,
      country,
      guardianName,
      guardianRelationship,
      guardianPhone,
      highestQualification,
      institution,
      fieldOfStudy,
      graduationYear,
      studyReason,
      programId,
    });

    return NextResponse.json({
      success: true,
      application: {
        firstName: student.firstName,
        lastName: student.lastName,
        program: program.name,
      },
      message:
        'Application received. Once the admissions office reviews it, you will get your Student ID by SMS.',
    });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy register error:', err);
    return NextResponse.json({ error: 'Could not submit your application. Please try again.' }, { status: 500 });
  }
}
