import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const staffAuth = require('../../../../../lib/academy-staff');
const { serializeCsv } = require('../../../../../lib/csv-export');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

const REPORT_COLUMNS = {
  students: [
    { key: 'student_id', label: 'Student ID' },
    { key: 'first_name', label: 'First name' },
    { key: 'middle_name', label: 'Middle name' },
    { key: 'last_name', label: 'Last name' },
    { key: 'email', label: 'Email' },
    { key: 'program_name', label: 'Program' },
    { key: 'course_count', label: 'Enrolled courses' },
    { key: 'average_grade', label: 'Average grade' },
    { key: 'attendance_count', label: 'Attendance records' },
    { key: 'present_count', label: 'Present' },
    { key: 'outstanding_amount', label: 'Outstanding fees (GHS)' },
  ],
  courses: [
    { key: 'code', label: 'Course code' },
    { key: 'title', label: 'Course' },
    { key: 'enrollment_count', label: 'Students enrolled' },
    { key: 'average_grade', label: 'Average grade' },
    { key: 'attendance_count', label: 'Attendance records' },
    { key: 'present_count', label: 'Present' },
  ],
};

export async function GET(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id') || '';
    const format = searchParams.get('format') || '';
    const dataset = searchParams.get('dataset') || 'students';
    if (sessionId.length > 200 || (format && format !== 'csv') || !REPORT_COLUMNS[dataset]) {
      return NextResponse.json({ error: 'Invalid report filters.' }, { status: 400 });
    }
    const [report, sessions] = await Promise.all([
      academy.getAcademyAdminReports(sessionId),
      academy.listSessions(),
    ]);
    if (format === 'csv') {
      const csv = serializeCsv(report[dataset], REPORT_COLUMNS[dataset]);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="mita-${dataset}-report.csv"`,
          'Cache-Control': 'private, no-store',
        },
      });
    }
    return NextResponse.json({ ...report, sessions }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy admin reports error:', error);
    return NextResponse.json({ error: 'Could not load Academy reports.' }, { status: 500 });
  }
}
