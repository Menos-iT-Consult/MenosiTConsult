require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express       = require('express');
const cors          = require('cors');
const cookieParser  = require('cookie-parser');
const db            = require('./db');

const contactRoute    = require('./routes/contact');
const newsletterRoute = require('./routes/newsletter');
const authRoute       = require('./routes/auth');
const blogsRoute      = require('./routes/blogs');
const messagesRoute   = require('./routes/messages');
const contentRoute    = require('./routes/content');
const manageRoute     = require('./routes/manage');
const imagesRoute     = require('./routes/images');

/**
 * Backend API server (self-hosted / PM2 usage).
 *
 * The website frontend and the admin dashboard now live in the Next.js app
 * (see app/ — `npm run dev` / `npm run build`). This Express app serves ONLY
 * the /api/* routes. It is also re-exported by api/index.js for Vercel's
 * zero-config Node.js runtime.
 */
const app  = express();
app.set('trust proxy', 1); // behind Nginx/Vercel - respect X-Forwarded-* headers
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: (origin, cb) => cb(null, true),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}));
// JSON body — raised to 2 MB so base64-encoded image payloads (from the admin
// content editor's image upload) are accepted by the API layer.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// -- Stateless auth -----------------------------------------------------------
// httpOnly *signed* cookie carries the admin flag; nothing expires between
// Vercel cold starts. Signing key is SESSION_SECRET.
app.use(cookieParser(process.env.SESSION_SECRET));

// Data-backed API routes need Postgres. Return an actionable 503 (instead of a
// generic 500 from deep inside a route) when POSTGRES_URL is missing. Once it
// IS set, tables and seed data are created automatically on the first request
// (see db.js), so this middleware then becomes a no-op.
const requireDb = (_req, res, next) => {
  if (!db.pool) {
    return res.status(503).json({
      error:
        'Database not configured. Add POSTGRES_URL (Vercel → Settings → Environment Variables) and redeploy — tables and seed data are created automatically on first request.',
    });
  }
  next();
};

// -- API routes ----------------------------------------------------------------
app.use('/api/auth',       authRoute);
app.use('/api/contact',    contactRoute);   // enquiries never blocked by DB state — persists to Postgres (or flat-file fallback) AND emails the admin
app.use('/api/newsletter', requireDb, newsletterRoute);
app.use('/api/blogs',      requireDb, blogsRoute);
app.use('/api/messages',   requireDb, messagesRoute);
app.use('/api/content',    requireDb, contentRoute);   // public read-only site content
app.use('/api/manage',     manageRoute);              // admin CRUD — requireAuth inside router runs BEFORE any DB check
app.use('/api/images',     requireDb, imagesRoute);    // uploaded image bytes (from Postgres)
app.get('/api/health', async (_req, res) => {
  let dbState = 'not_configured';
  if (db.pool) {
    try {
      await db.pool.query('SELECT 1');
      dbState = 'connected';
    } catch {
      dbState = 'unreachable';
    }
  }
  res.json({ status: 'ok', db: dbState });
});

// Only start the HTTP server when run directly (`node server.js` / PM2).
// When imported by api/index.js for Vercel, we just export the app (handler).
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  Menos iT Consult API - http://localhost:${PORT}`);
    console.log(`  API health          - http://localhost:${PORT}/api/health\n`);
  });
}

module.exports = app;
