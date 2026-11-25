const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateAcademyContactMessage(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: 'Contact details are required.' };
  }

  if (String(value.company || '').trim()) {
    return { error: 'Unable to process this message.' };
  }

  const message = {
    name: String(value.name || '').trim(),
    email: String(value.email || '').trim(),
    phone: String(value.phone || '').trim(),
    subject: String(value.subject || '').trim(),
    message: String(value.message || '').trim(),
  };

  if (message.name.length < 2 || message.name.length > 120) {
    return { error: 'Enter your name (2 to 120 characters).' };
  }
  if (message.email.length > 254 || !EMAIL_PATTERN.test(message.email)) {
    return { error: 'Enter a valid email address.' };
  }
  if (message.phone.length > 40) {
    return { error: 'Phone number must be 40 characters or fewer.' };
  }
  if (!message.subject || message.subject.length > 160) {
    return { error: 'Enter a subject of 160 characters or fewer.' };
  }
  if (message.message.length < 10 || message.message.length > 5000) {
    return { error: 'Message must be between 10 and 5,000 characters.' };
  }

  return { message };
}

module.exports = { validateAcademyContactMessage };
