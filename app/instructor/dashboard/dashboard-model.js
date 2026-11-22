const TEACHING_TOOLS = [
  { key: 'assignments', title: 'Assignments', description: 'Create work and review submissions', icon: 'A' },
  { key: 'quizzes', title: 'Quizzes', description: 'Build and publish assessments', icon: 'Q' },
  { key: 'attendance', title: 'Attendance', description: 'Record attendance for a class session', icon: '✓' },
  { key: 'gradebook', title: 'Gradebook', description: 'Enter coursework and exam grades', icon: 'G' },
  { key: 'lessons', title: 'Lesson plans', description: 'Plan lessons and learning objectives', icon: 'L' },
  { key: 'lessons', title: 'Course materials', description: 'Share files and links with students', icon: 'M' },
];

function courseToolHref(courseId, tool) {
  return `/instructor/courses/${encodeURIComponent(courseId)}?tool=${encodeURIComponent(tool)}`;
}

function buildInstructorDashboardModel({
  courses = [],
  assignments = [],
  submissions = [],
  progress = [],
}, now = Date.now()) {
  const pendingSubmissions = submissions.filter((submission) => submission.score == null);
  const allUpcomingAssignments = assignments
    .filter((assignment) => {
      const dueAt = Date.parse(assignment.dueAt);
      return assignment.dueAt && Number.isFinite(dueAt) && dueAt >= now;
    })
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));

  const dueThisWeekCount = assignments.filter((assignment) => {
    const dueAt = Date.parse(assignment.dueAt);
    return assignment.dueAt && Number.isFinite(dueAt) &&
      dueAt >= now && dueAt <= now + 7 * 24 * 60 * 60 * 1000;
  }).length;

  const progressByCourse = new Map(progress.map((course) => [course.courseId, course]));

  return {
    pendingSubmissions,
    reviewQueue: pendingSubmissions.slice(0, 5),
    upcomingAssignments: allUpcomingAssignments.slice(0, 5),
    allUpcomingAssignments,
    dueThisWeekCount,
    enrollmentCount: progress.reduce(
      (total, course) => total + (Number(course.rosterCount) || 0),
      0
    ),
    progressByCourse,
  };
}

module.exports = {
  TEACHING_TOOLS,
  courseToolHref,
  buildInstructorDashboardModel,
};
