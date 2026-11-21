const PAYMENT_METHODS = new Set(['Mobile Money', 'Bank transfer', 'Cash', 'Other']);

function normalizeSupportTicketInput(body) {
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (subject.length < 5 || subject.length > 120 || message.length < 10 || message.length > 4000) {
    return null;
  }
  return { subject, message };
}

function normalizeSupportMessage(body) {
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  return message.length >= 2 && message.length <= 4000 ? message : '';
}

function normalizePaymentSubmissionInput(body) {
  const invoiceId = typeof body?.invoiceId === 'string' ? body.invoiceId.trim() : '';
  const method = typeof body?.method === 'string' ? body.method.trim() : '';
  const reference = typeof body?.reference === 'string' ? body.reference.trim() : '';
  const note = typeof body?.note === 'string' ? body.note.trim() : '';
  if (
    !invoiceId || invoiceId.length > 200 ||
    !PAYMENT_METHODS.has(method) ||
    reference.length < 4 || reference.length > 120 ||
    note.length > 1000
  ) return null;
  return { invoiceId, method, reference, note };
}

function courseLessonProgress(lessons) {
  const courses = new Map();
  for (const lesson of Array.isArray(lessons) ? lessons : []) {
    if (!courses.has(lesson.courseId)) {
      courses.set(lesson.courseId, {
        courseId: lesson.courseId,
        courseTitle: lesson.courseTitle || 'Course',
        total: 0,
        completed: 0,
        nextLesson: null,
      });
    }
    const course = courses.get(lesson.courseId);
    course.total += 1;
    if (lesson.completed) course.completed += 1;
    else if (!course.nextLesson) course.nextLesson = lesson;
  }
  return [...courses.values()].map((course) => ({
    ...course,
    percentage: course.total ? Math.round((course.completed / course.total) * 100) : 0,
  }));
}

function getNextClass(entries, now = new Date()) {
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => {
      const day = String(entry.day_of_week || '').trim().toLowerCase();
      const dayIndex = day ? weekdays.findIndex((weekday) => weekday === day || weekday.startsWith(day)) : -1;
      const match = String(entry.start_time || '').match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
      if (dayIndex < 0 || !match) return null;
      let hours = Number(match[1]);
      const minutes = Number(match[2]);
      if (minutes > 59 || hours > 23 || (!match[3] && hours > 23)) return null;
      if (match[3]) {
        if (hours < 1 || hours > 12) return null;
        hours = hours % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
      }
      const classMinutes = hours * 60 + minutes;
      let daysUntil = (dayIndex - now.getDay() + 7) % 7;
      if (daysUntil === 0 && classMinutes <= currentMinutes) daysUntil = 7;
      return {
        ...entry,
        daysUntil,
        classMinutes,
        dayLabel: daysUntil === 0
          ? 'Today'
          : daysUntil === 1
            ? 'Tomorrow'
            : weekdays[(now.getDay() + daysUntil) % 7].replace(/^./, (letter) => letter.toUpperCase()),
      };
    })
    .filter(Boolean)
    .sort((first, second) => first.daysUntil - second.daysUntil || first.classMinutes - second.classMinutes)[0] || null;
}

module.exports = {
  normalizeSupportTicketInput,
  normalizeSupportMessage,
  normalizePaymentSubmissionInput,
  courseLessonProgress,
  getNextClass,
};
