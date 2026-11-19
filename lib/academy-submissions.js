const MAX_SUBMISSION_TEXT_LENGTH = 20000;
const MAX_SUBMISSION_URL_LENGTH = 2048;

function validateStudentSubmission(text, resourceUrl) {
  const cleanText = String(text || '').trim();
  const cleanUrl = String(resourceUrl || '').trim();

  if (cleanText.length > MAX_SUBMISSION_TEXT_LENGTH) {
    return 'Text responses must be 20,000 characters or fewer.';
  }
  if (cleanUrl.length > MAX_SUBMISSION_URL_LENGTH) {
    return 'Resource URLs must be 2,048 characters or fewer.';
  }
  if (!cleanText && !cleanUrl) {
    return 'Add a text response or a resource URL before submitting.';
  }
  if (cleanUrl) {
    try {
      const url = new URL(cleanUrl);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
        return 'Resource URLs must use HTTP or HTTPS and cannot contain credentials.';
      }
    } catch {
      return 'Enter a valid HTTP or HTTPS resource URL.';
    }
  }

  return null;
}

module.exports = {
  MAX_SUBMISSION_TEXT_LENGTH,
  MAX_SUBMISSION_URL_LENGTH,
  validateStudentSubmission,
};
