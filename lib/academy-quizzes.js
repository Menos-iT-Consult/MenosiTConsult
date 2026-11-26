function normalizeQuizInput(body) {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  const courseId = typeof body?.courseId === 'string' ? body.courseId.trim() : '';
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
  const durationMinutes = Number(body?.durationMinutes);
  const maxAttempts = Number(body?.maxAttempts);
  if (
    !title || title.length > 160 || description.length > 3000 ||
    !courseId || courseId.length > 200 || !sessionId || sessionId.length > 200 ||
    !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 240 ||
    !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10 ||
    !Array.isArray(body?.questions) || body.questions.length < 1 || body.questions.length > 50
  ) return null;

  const questions = [];
  for (let index = 0; index < body.questions.length; index += 1) {
    const raw = body.questions[index];
    const prompt = typeof raw?.prompt === 'string' ? raw.prompt.trim() : '';
    if (!prompt || prompt.length > 1000 || !Array.isArray(raw.options) ||
        raw.options.length < 2 || raw.options.length > 6) return null;
    const options = raw.options.map((option) => typeof option === 'string' ? option.trim() : '');
    if (options.some((option) => !option || option.length > 300) ||
        new Set(options.map((option) => option.toLowerCase())).size !== options.length ||
        !Number.isInteger(Number(raw.correctIndex)) ||
        Number(raw.correctIndex) < 0 || Number(raw.correctIndex) >= options.length) return null;
    questions.push({
      id: `q${index + 1}`,
      sourceQuestionId: typeof raw.sourceQuestionId === 'string' &&
        raw.sourceQuestionId.length <= 200 ? raw.sourceQuestionId : '',
      prompt,
      options: options.map((text, optionIndex) => ({ id: `o${optionIndex + 1}`, text })),
      correctOptionId: `o${Number(raw.correctIndex) + 1}`,
    });
  }

  const opensAt = normalizeDateTime(body.opensAt);
  const closesAt = normalizeDateTime(body.closesAt);
  if (opensAt === false || closesAt === false ||
      (opensAt && closesAt && new Date(opensAt) >= new Date(closesAt))) return null;
  return {
    title,
    description,
    courseId,
    sessionId,
    durationMinutes,
    maxAttempts,
    opensAt: opensAt || null,
    closesAt: closesAt || null,
    published: body.published === true,
    questions,
  };
}

function normalizeDateTime(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.length > 40) return false;
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? false : timestamp.toISOString();
}

function sanitizeAnswers(questions, answers) {
  if (!Array.isArray(questions) || !answers || typeof answers !== 'object' || Array.isArray(answers)) return null;
  const questionIds = new Set(questions.map((question) => question.id));
  if (Object.keys(answers).some((id) => !questionIds.has(id))) return null;
  const sanitized = {};
  for (const [questionId, optionId] of Object.entries(answers)) {
    if (typeof optionId !== 'string' ||
        !questions.some((question) => question.id === questionId &&
          question.options.some((option) => option.id === optionId))) return null;
    sanitized[questionId] = optionId;
  }
  return sanitized;
}

function scoreQuizAttempt(questions, answers) {
  const normalizedAnswers = sanitizeAnswers(questions, answers);
  if (!normalizedAnswers) return null;
  const correctCount = questions.reduce(
    (count, question) => count + (normalizedAnswers[question.id] === question.correctOptionId ? 1 : 0),
    0
  );
  return {
    answers: normalizedAnswers,
    correctCount,
    totalQuestions: questions.length,
    score: Math.round((correctCount / questions.length) * 10000) / 100,
  };
}

function publicQuizQuestion(question, quizId) {
  return {
    id: question.id,
    prompt: question.prompt,
    options: question.options.map(({ id, text }) => ({ id, text })),
    attachments: Array.isArray(question.attachments)
      ? question.attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        fileSize: Number(attachment.fileSize) || 0,
        ...(attachment.contentType ? { contentType: attachment.contentType } : {}),
        downloadUrl: attachment.downloadUrl ||
          `/api/academy/quizzes/${encodeURIComponent(quizId)}/attachments/${encodeURIComponent(attachment.id)}`,
      }))
      : [],
  };
}

module.exports = {
  normalizeQuizInput,
  sanitizeAnswers,
  scoreQuizAttempt,
  publicQuizQuestion,
};
