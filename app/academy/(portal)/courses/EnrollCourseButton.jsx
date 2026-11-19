'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EnrollCourseButton({ courseId, onEnrolled }) {
  const router = useRouter();
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');

  async function enroll() {
    setEnrolling(true);
    setError('');
    try {
      const response = await fetch('/api/academy/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseId }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.assign('/academy/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not enroll in this course.');
      if (onEnrolled) {
        onEnrolled();
      } else {
        router.push(`/academy/courses/${encodeURIComponent(courseId)}`);
      }
    } catch (enrollError) {
      setError(enrollError.message || 'Could not enroll in this course.');
    } finally {
      setEnrolling(false);
    }
  }

  return (
    <div className="ap-course-enroll-control">
      <button
        className="ap-button ap-button-primary"
        type="button"
        onClick={enroll}
        disabled={enrolling}
      >
        {enrolling ? 'Enrolling…' : 'Enroll course'}
      </button>
      {error && <p className="ap-error" role="alert">{error}</p>}
    </div>
  );
}
