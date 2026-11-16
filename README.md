# Menos iT Consult — Website

Official website for **Menos iT Consult**, an IT consulting company based in Agona, Western Region, Ghana. Built with **Next.js (React)** for the frontend + API route handlers, backed by shared Node.js data/mail/storage modules, and a React admin dashboard.

---

## Project Structure

```
Menos-iT-Consult/
├── app/                          # Next.js App Router
│   ├── layout.jsx                # Root layout (html/body, fonts, metadata)
│   ├── globals.css               # Imports all site styles from app/styles/
│   ├── styles/                   # Site CSS (base, home, about, services, …)
│   ├── not-found.jsx             # 404 page
│   ├── middleware.ts             # /admin auth gate (signed-cookie check)
│   ├── (site)/                   # Public site (route group with site chrome)
│   │   ├── layout.jsx            # Nav, footer, WhatsApp bubble, cookie banner, effects
│   │   ├── template.jsx          # <main class="page-transition"> wrapper
│   │   ├── page.jsx              # Home
│   │   ├── about/ services/ portfolio/ testimonials/ contact/
│   │   ├── blog/                 # Blog list + blog/[slug] article page
│   │   └── privacy/ terms/ cookies/
│   ├── components/               # Shared React components (Nav, Footer, Reveal, Stat, …)
│   ├── admin/                    # Admin dashboard (React SPA, standalone layout)
│   │   ├── login/                # /admin/login
│   │   ├── views/                # Dashboard, Blogs, Messages, Newsletter, …
│   │   └── admin.css
│   └── api/                      # REST API (Next.js Route Handlers)
│       ├── auth/                 # login, logout, me, password
│       ├── blogs/                # public list + slug + CRUD + publish/unpublish
│       ├── messages/ contact/ newsletter/ content/ images/
│       ├── manage/               # admin CRUD (testimonials, projects, settings, uploads)
│       └── health/
├── lib/                          # Shared JS helpers (auth, blog-format, use-settings, …)
├── public/assets/                # Static images / icons (served by Next.js)
├── package.json                  # Root deps + scripts (dev/build/start)
├── vercel.json                   # Vercel config (Next.js framework)
└── backend/                      # Shared backend modules (reused by app/api route handlers)
    ├── server.js                 # Standalone Express API server (self-host / PM2 only)
    ├── db.js                     # PostgreSQL data-access layer (self-bootstrapping)
    ├── mailer.js                 # Nodemailer (Gmail SMTP)
    ├── r2.js                     # Cloudflare R2 image uploads
    ├── migrate.js                # Seed PostgreSQL from data/*.json
    ├── routes/                   # Original Express routers (reference; mirrored in app/api)
    └── data/                     # Seed data / flat-file fallbacks
```

---

## Getting Started (local)

```bash
npm install
npm run dev
```

The full site — public pages, admin dashboard **and** the API (Next.js route
handlers) — runs at **http://localhost:3000**.

> A PostgreSQL database (`POSTGRES_URL`) is required for data-backed features
> (blog, messages, newsletter, content, images). Without it the site still
> renders with built-in static content and the contact form falls back to
> flat-file storage, mirroring production behaviour.

Optional: run the legacy standalone API server (Express) for self-hosting:

```bash
cd backend && npm install
node server.js    # API only, on PORT (default 3000)
```

### Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `POSTGRES_URL` | for data features | PostgreSQL connection string (tables + seed data are created automatically on first request) |
| `SESSION_SECRET` | yes | Signs the admin auth cookie |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | for email | Nodemailer / Gmail SMTP |
| `RECIPIENT_EMAIL` | for email | Where contact-form enquiries are delivered |
| `ADMIN_PASSWORD` | for first boot | Seeded into the `admin` table |

> **Gmail App Password:** Google Account → Security → 2-Step Verification → App passwords

---

## URLs

| URL | Description |
|-----|-------------|
| `/` | Home page |
| `/about` | About page |
| `/services` | Services page |
| `/portfolio` | Portfolio page |
| `/testimonials` | Testimonials page |
| `/contact` | Contact page |
| `/blog` | Blog listing page |
| `/blog/:slug` | Individual blog post |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/cookies` | Cookie policy |
| `/admin` | Admin dashboard (redirects to `/admin/login` when signed out) |
| `/admin/login` | Admin login page |
| `/api/health` | API health check |

---

## Admin Dashboard

Access at `/admin` (redirects to `/admin/login` when signed out). The gate is
`app/middleware.ts`, which verifies the signed `admin_auth` cookie server-side;
the API enforces auth on every write endpoint as well.

**Default login:** `admin` / `admin123` (change this before going live)

| Section | What you can do |
|---------|----------------|
| Dashboard | Overview stats — posts, messages, subscribers |
| Blog Posts | Create, edit, delete, publish/unpublish posts (markdown editor with live preview) |
| Messages | Read and manage contact form submissions |
| Newsletter | View/remove subscribers, send email tips |
| Testimonials | Create, edit, publish/unpublish, delete client reviews — shown on `/testimonials` |
| Projects | Create, edit, publish/unpublish, delete portfolio case studies — shown on `/portfolio` |
| Settings | Change admin password; edit site stats, contact info, trusted companies |

### Site content pipeline

Admin-managed content reaches the public site through read-only content
routes (`app/api/content/*`):

- `GET /api/content/testimonials` — published testimonials
- `GET /api/content/projects` — published projects
- `GET /api/content/settings` — site settings (stats counters, contact info, trusted logos)

React client components (`TestimonialsGrid`, `PortfolioGrid`, `Stat`,
`ContactText`, `TrustedLogos`, …) fetch these at runtime. If the API is
unreachable or returns nothing published, the pages keep their built-in static
content, so the site never breaks without a database.

---

## API Endpoints

Same surface as before, now served by Next.js route handlers under
`app/api/**/route.js` (single origin, no rewrites):

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login (sets a signed httpOnly cookie) |
| POST | `/api/auth/logout` | Logout (clears the cookie) |
| GET | `/api/auth/me` | Check auth state |
| PUT | `/api/auth/password` | Change password (auth) |

### Blogs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/blogs` | Published posts (public) |
| GET | `/api/blogs/slug/:slug` | Single published post by slug (public) |
| GET | `/api/blogs/:id` | Single post (public) |
| POST | `/api/blogs` | Create post (auth) |
| PUT | `/api/blogs/:id` | Update post (auth) |
| DELETE | `/api/blogs/:id` | Delete post (auth) |
| PATCH | `/api/blogs/:id/publish` | Publish post (auth) |
| PATCH | `/api/blogs/:id/unpublish` | Unpublish post (auth) |

### Messages / Newsletter / Contact / Content / Images / Manage
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contact` | Submit contact form (public) |
| GET/PATCH/DELETE | `/api/messages(/:id)(/read)` | Manage messages (auth) |
| POST | `/api/newsletter` | Subscribe (public) |
| GET/DELETE | `/api/newsletter/subscribers(/:email)` | Subscribers (auth) |
| POST | `/api/newsletter/send` | Send email tip (auth) |
| GET | `/api/content/{testimonials,projects,settings}` | Public read-only content |
| GET | `/api/images/:id` | Uploaded image bytes (public) |
| CRUD | `/api/manage/{testimonials,projects,settings,upload...}` | Admin CRUD (auth) |

---

## Deployment — Vercel (recommended)

The app deploys as a standard **Next.js project** — no rewrites, no single
function. Vercel automatically serves the static pages from the edge, the
dynamic routes (`/blog/[slug]`, `/admin/*`) from SSR functions, and every
`app/api/**/route.js` as a Vercel Function. Auth is a stateless signed cookie
(survives cold starts) and every write goes to **PostgreSQL** (the Vercel
filesystem is read-only).

### 1. Create a PostgreSQL database
Use **Vercel Postgres** (or any Postgres provider) and copy the connection
string.

### 2. Add environment variables (on Vercel)
Set these in **Project → Settings → Environment Variables**:

| Variable | Value |
|----------|-------|
| `POSTGRES_URL` | the PostgreSQL connection string (required) |
| `SESSION_SECRET` | a long random string (required — signs admin cookies) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | your Gmail address |
| `SMTP_PASS` | Gmail App Password |
| `RECIPIENT_EMAIL` | where enquiries are delivered |
| `ADMIN_PASSWORD` | the admin password to seed (see step 4) |

### 3. Deploy

```bash
npm i -g vercel
vercel          # links & deploys a preview
vercel --prod   # production
```

### 4. Database
No migration step is required — the app creates and seeds the schema
automatically on the first request after `POSTGRES_URL` is set. To seed ahead
of time instead:

```bash
cd backend
set POSTGRES_URL=postgresql://...
set ADMIN_PASSWORD=your-secure-password
node migrate.js
```

> **Login at `https://your-site.vercel.app/admin`** with `admin` / the
> `ADMIN_PASSWORD` you seeded.

---

## Deployment (self-hosted VM)

1. Create a VM (Ubuntu 22.04+), install Node.js 20+ and PostgreSQL
2. Clone the repo and run `npm install` at the project root
3. Set `POSTGRES_URL`, `SESSION_SECRET`, SMTP vars, `ADMIN_PASSWORD`
4. Build and run the Next.js app behind Nginx/PM2:
   ```bash
   npm run build
   pm2 start npm --name menos-it -- start   # Next.js server (site + API)
   ```
   Or run only the API with the legacy Express server:
   `pm2 start backend/server.js --name menos-it-api`
5. Proxy port 80 → 3000 with Nginx; add SSL with Certbot

---

## Tech Stack

- **Frontend:** React 19 + Next.js 15 (App Router), plain CSS (no framework)
- **Admin:** React SPA under `/admin` with server-side cookie gate
- **API:** Next.js Route Handlers (Node runtime); legacy Express server kept for self-hosting
- **Auth:** Stateless httpOnly signed cookie (cookie-signature) + bcryptjs
- **Email:** Nodemailer (Gmail SMTP)
- **Storage:** PostgreSQL (`pg` driver); seed data in `backend/data/*.json`; images in Cloudflare R2 / Postgres
- **Deployment:** Vercel (Next.js) or a self-hosted VM behind Nginx/PM2
- **Font:** Inter (Google Fonts, degrades to system-ui offline)

---

## Contact

**Menos iT Consult**
Agona, Western Region, Ghana
minnahmat50@gmail.com
