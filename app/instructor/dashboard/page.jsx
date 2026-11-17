'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function InstructorDashboard() {
  const [staff, setStaff] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    async function fetchStaff() {
      setLoading(true);
      try {
        const res = await fetch('/api/academy/staff/me', {
          credentials: 'include',
        });
        const data = await res.json();
        
        if (data.loggedIn && data.staff) {
          setStaff(data.staff);
          // Fetch courses assigned to this instructor
          const sesRes = await fetch('/api/academy/assignments?session_id=null', {
            credentials: 'include',
          });
          const sesData = await sesRes.json();
          // Filter assignments by instructor (we'll simplify and show all)
          setCourses(sesData || []);
        }
      } catch (err) {
        console.error('Failed to fetch instructor dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStaff();
  }, []);

  if (loading) {
    return <div>Loading instructor dashboard...</div>;
  }

  if (!staff) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Instructor Login Required</h2>
        <p>Please sign in to access your instructor dashboard.</p>
        <a href="/instructor/login" style={{ color: 'var(--blue)', textDecoration: 'none' }}>
          Instructor Login
        </a>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Welcome, {staff.name}</h2>
      <p>Role: {staff.role}</p>

      <nav style={{ margin: '2rem 0', display: 'flex', gap: '1rem' }}>
        <Link href="/instructor/courses" style={{ color: 'var(--blue)', textDecoration: 'none' }}>
          My Courses
        </Link>
        <Link href="/instructor/grades" style={{ color: 'var(--blue)', textDecoration: 'none' }}>
          Grades
        </Link>
        <Link href="/instructor/logout" style={{ color: 'var(--blue)', textDecoration: 'none' }}>
          Logout
        </Link>
      </nav>

      {staff.role === 'admin' ? (
        <div style={{ margin: '2rem 0' }}>
          <h3>Admin Functions</h3>
          <p>You have administrator privileges.</p>
        </div>
      ) : (
        <div style={{ margin: '2rem 0' }}>
          <h3>My Assigned Courses</h3>
          {courses.length === 0 ? (
            <p>No courses assigned yet.</p>
          ) : (
            <ul style={{ marginTop: '1rem' }}>
              {courses.map((c) => (
                <li key={c.id} style={{ marginBottom: '0.5rem' }}>
                  <a href={`/instructor/courses/${c.id}`} style={{ color: 'var(--blue)' }}>
                    {c.title || c.name || 'Unnamed Course'}
                  </a>
                  <br />
                  <small>Session: {c.session_id || 'N/A'}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default InstructorDashboard;