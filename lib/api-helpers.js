const { NextResponse } = require('next/server');

// Exact string from backend/server.js requireDb middleware.
const DB_NOT_CONFIGURED_ERROR =
  'Database not configured. Add POSTGRES_URL (Vercel → Settings → Environment Variables) and redeploy — tables and seed data are created automatically on first request.';

function requireDbResponse() {
  return NextResponse.json({ error: DB_NOT_CONFIGURED_ERROR }, { status: 503 });
}

// Mirrors the per-route `if (err.noDb)` catches: 503 with the db.js
// noDbError message (DB configured but unreachable / bootstrap failed).
function noDbErrorResponse(err) {
  if (err && err.noDb) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
  return null;
}

module.exports = { requireDbResponse, noDbErrorResponse, DB_NOT_CONFIGURED_ERROR };
