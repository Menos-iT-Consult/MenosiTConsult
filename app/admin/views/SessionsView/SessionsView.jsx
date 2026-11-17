import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { NextResponse } from 'next/server';

function SessionsView() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState('create'); // 'create' or 'edit'
  const [session, setSession = useState({
    name: '',
    start_date: '',
    end_date: '',
    is_current: false,
  });
  const searchParams = useSearchParams();

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true);
      try {
        const res = await fetch('/api/academy/sessions?withEnrollments=true', {
          credentials: 'include',
        });
        const data = await res.json();
        setSessions(data);
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let data;
      if (mode === 'create') {
        const res = await fetch('/api/academy/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(session),
        });
        data = await res.json();
      } else {
        const res = await fetch(`/api/academy/sessions/${session.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(session),
        });
        data = await res.json();
      }
      setShowModal(false);
      setMode('create');
      setSession({
        name: '',
        start_date: '',
        end_date: '',
        is_current: false,
      });
      fetchSessions();
    } catch (err) {
      console.error('Failed to save session:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-root">
      <div style={{ padding: '24px' }}>
        <h2>Academy Sessions Management</h2>

        <div style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/admin/academy/sessions/new" className="ap-link">
            New Session
          </Link>
          <span>|</span>
          <button
            onClick={() => setMode('create'), setShowModal(true)}
            style={{ background: 'var(--blue)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}
          >
            Create Session
          </button>
        </div>

        {loading ? (
          <p>Loading sessions...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Session Name</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Dates</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Current</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Enrollments</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1pxsolid #eee' }}>
                    <td style={{ padding: '12px' }}>{s.name}</td>
                    <td style={{ padding: '12px' }}>
                      {s.start_date ? new Date(s.start_date).toLocaleDateString() : '—'} 
                      to {s.end_date ? new Date(s.end_date).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className="ap-chip ap-chip-{s.is_current ? 'active' : 'pending'}">
                        {s.is_current ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{s.enrollmentCount || 0}</td>
                    <td style={{ padding: '12px' }}>
                      <Link
                        href={`/academy/academy/sessions/${s.id}/edit`}
                        style={{ marginRight: '8px', color: 'var(--blue)' }}
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => {
                          // Delete confirmation
                          if (window.confirm('Delete this session?')) {
                            fetch(`/api/academy/sessions/${s.id}`, {
                              method: 'DELETE',
                              credentials: 'include',
                            }).then(() => fetchSessions());
                          }
                        }}
                        style={{ color: '#dc3545', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal for Create/Edit Session */}
        {showModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 32,
                width: 400,
                maxWidth: '90%',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 24 }}>
                {mode === 'create' ? 'Create New Session' : 'Edit Session'}
              </h3>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label>Session Name <span style={{ color: 'red' }}>*</span></label>
                    <input
                      value={session.name}
                      onChange={(e) => setSession({ ...session, name: e.target.value })}
                      required
                      style={{ padding: '10px', border: '1px solid #ccc', borderRadius: 8 }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label>Start Date (YYYY-MM-DD)</label>
                    <input
                      type="date"
                      value={session.start_date || ''}
                      onChange={(e) => setSession({ ...session, start_date: e.target.value })}
                      style={{ padding: '10px', border: '1px solid #ccc', borderRadius: 8 }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label>End Date (YYYY-MM-DD)</label>
                    <input
                      type="date"
                      value={session.end_date || ''}
                      onChange={(e) => setSession({ ...session, end_date: e.target.value })}
                      style={{ padding: '10px', border: '1px solid #ccc', borderRadius: 8 }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={session.is_current}
                        onChange={(e) => setSession({ ...session, is_current: e.target.checked })}
                        style={{ transform: 'scale(1.2)' }}
                      />
                      Mark as Current Session
                    </label>
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 500,
                      }}
                    >
                      {mode === 'create' ? 'Create' : 'Update'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      style={{ marginLeft: '12px', padding: '10px 16px', border: '1px solid #ccc', borderRadius: 8, background: '#fff', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )
        }
      </div>
    </div>
  );
}

export default SessionsView;