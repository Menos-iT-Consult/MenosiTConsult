const academy = require('../backend/academy-db');
const auth = require('./academy-auth');

function instructorOwnsCourse(staff, course) {
  return !!staff &&
    staff.role === 'instructor' &&
    staff.status === 'active' &&
    !!course &&
    course.instructorStaffId === staff.id;
}

async function getActiveStaff(request) {
  const staffId = auth.getStaffId(request);
  if (!staffId) return { error: 'Not signed in.', status: 401 };
  const staff = await academy.getStaff(staffId);
  if (!staff || staff.status !== 'active') {
    return { error: 'Not signed in.', status: 401 };
  }
  return { staff };
}

async function requireAdministrator(request) {
  const result = await getActiveStaff(request);
  if (result.error) return result;
  if (result.staff.role !== 'admin') {
    return { error: 'Only academy administrators can perform this action.', status: 403 };
  }
  return result;
}

async function requireInstructor(request) {
  const result = await getActiveStaff(request);
  if (result.error) return result;
  if (result.staff.role !== 'instructor') {
    return { error: 'An active instructor account is required.', status: 403 };
  }
  return result;
}

async function requireAssignedCourse(request, courseId) {
  const result = await requireInstructor(request);
  if (result.error) return result;
  const course = await academy.getCourse(courseId);
  if (!instructorOwnsCourse(result.staff, course)) {
    return { error: 'Course not found or not assigned to you.', status: 404 };
  }
  return { staff: result.staff, course };
}

module.exports = {
  getActiveStaff,
  requireAdministrator,
  requireInstructor,
  requireAssignedCourse,
  instructorOwnsCourse,
};
