function isStudentEligibleForCourse(student, course) {
  return Boolean(
    student &&
    student.status === 'active' &&
    student.programId &&
    course &&
    course.published === true &&
    course.programId === student.programId
  );
}

function getCurrentCourseSession(sessions) {
  return Array.isArray(sessions)
    ? sessions.find((session) => session && session.is_current === true) || null
    : null;
}

module.exports = {
  isStudentEligibleForCourse,
  getCurrentCourseSession,
};
