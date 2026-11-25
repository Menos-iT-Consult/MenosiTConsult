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
| `ACADEMY_DATABASE_URL` | for Academy features | Separate PostgreSQL database connection for all Academy tables/settings; never falls back to `POSTGRES_URL` |
| `SESSION_SECRET` | yes | Signs the admin auth cookie |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | for main-site email | Nodemailer / Gmail SMTP credentials for contact and newsletter mail |
| `SMTP_FROM` | optional | Visible From address for main-site email; defaults to `support@menositconsult.com` |
| `ACADEMY_SMTP_HOST` / `ACADEMY_SMTP_PORT` / `ACADEMY_SMTP_USER` / `ACADEMY_SMTP_PASS` | for Academy email | Independent Nodemailer transport for Academy contact messages and instructor invitations; does not fall back to main-site SMTP |
| `ACADEMY_SMTP_FROM` | optional | Visible From address for Academy email; defaults to `academy@menositconsult.com` |
| `ACADEMY_MNOTIFY_API_KEY` | for Academy SMS | Private API key for the Academy's mNotify SMS integration |
| `ACADEMY_MNOTIFY_SENDER` | for Academy SMS | mNotify-approved sender ID, up to 11 characters |
| `SITE_URL` | optional | Main website base URL used in main-site emails; defaults to `https://menositconsult.com` |
| `ACADEMY_SITE_URL` | optional | Academy base URL used in Academy application, admission, and instructor invitation links; defaults to `https://academy.menositconsult.com` |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | for main-site media | Main-site Cloudflare R2 credentials and bucket |
| `ACADEMY_R2_BUCKET` | optional | Separate Academy R2 bucket; must differ from `R2_BUCKET` and does not fall back to it |
| `ACADEMY_R2_PUBLIC_BASE` | optional | Public base URL for Academy media in its separate bucket |
| `ACADEMY_CERTIFICATE_R2_BUCKET` | for Academy certificates and course files | Dedicated private R2 bucket for certificate PDFs and instructor-uploaded course materials; must differ from both media buckets and must not have public access enabled |
| `RECIPIENT_EMAIL` | for email | Where contact-form enquiries are delivered |
| `ADMIN_PASSWORD` | for first boot | Seeded into the `admin` table |
| `ACADEMY_ADMIN_EMAIL` / `ACADEMY_ADMIN_PASSWORD` | before first Academy request | Credentials for the first Academy administrator, seeded only when no Academy staff accounts exist |

> **Gmail App Password:** Google Account → Security → 2-Step Verification → App passwords
>
> For local Next.js development, set these in the repository-root `.env.local`.
> `backend/.env` is loaded by the legacy Express server, not by Next.js. The
> Academy schema and starter data are created automatically on the first
> Academy request, or can be prepared with `node backend/migrate-academy.js`.
> The Academy database starts fresh; existing Academy records in the main
> database are left untouched and are not copied.

## MITA Academy portals

Academy administrators sign in at `/academy/admin/login` and manage instructors
at `/academy/admin/instructors` and review student applications at
`/academy/admin/admissions`. Approving an application activates the student
account, issues a Student ID, and sends that ID and its temporary password to
the applicant by mNotify SMS. The student must change the password at first
sign-in. Failed SMS deliveries are recorded and can be retried from the
admissions page without approving the student again.
Student, staff, and main-administrator sign-ins lock an account after five
failed attempts and limit each client IP to 30 attempts in a 15-minute window.
A successful sign-in clears the account and IP counters. Lockout state is stored
in the Academy database so limits apply across app instances.
Administrators add and publish programs, set each program's tuition per
semester in GHS, and create fixed-amount or percentage scholarship programs at
`/academy/admin/programs`. Scholarships are assigned by an administrator on
each student's details page; one award applies at a time, and discounts are
capped at the semester fee. Student registration details and recorded consent
are available from the student directory.

Set `ACADEMY_MNOTIFY_API_KEY` and an mNotify-approved
`ACADEMY_MNOTIFY_SENDER` before approving applications; missing SMS settings
block approval. The sender ID must be 11 characters or fewer. Admission SMS
uses mNotify's Quick SMS endpoint for Ghana numbers; international recipients
require an approved mNotify international template and are not currently sent
through this flow. See the [mNotify/BMS API documentation](https://developer.bms.africa/).

Admins can also create courses, issue instructor accounts, create academic
sessions, assign courses, and deactivate or reactivate active instructors.

An issued instructor account starts pending. The Academy sends a single-use
setup link by email and SMS; it expires after seven days, and setting a
password activates the account. Instructor invitations require a Ghana mobile
number, Academy SMTP settings, and Academy mNotify settings. If either channel
fails, the pending account remains in place and an administrator can resend
the invitation (which replaces the previous link). The main-site `SMTP_*`
settings are not used for Academy mail. Instructors
sign in at `/instructor/login` and can access only courses assigned to their
account. Their course workspaces include student rosters, assignments and
submission review, gradebooks, attendance, lesson planning, and a Lessons &
content area for adding HTTPS resources and private PDF, TXT, DOCX, PPTX, and
XLSX files (up to 4 MB each). Uploaded course files are served only to students
enrolled in the matching course session and the assigned instructor. Student
lesson progress is tracked in the course portal.

Cloudflare Email Routing can forward replies sent to
`academy@menositconsult.com`, but it does not send outbound mail. The Academy's
SMTP provider must authorize this From address (and the domain's SPF/DKIM
records must match that provider) for invitation messages to be delivered
reliably. Set `ACADEMY_SMTP_FROM` in the deployment environment if a different
verified Academy address should be used.

Main-site email uses the separately authenticated `SMTP_*` transport and
displays `support@menositconsult.com` as its From address by default
(`SMTP_FROM` can override it). As with Academy mail, the outbound SMTP provider
must authorize this address; Cloudflare Email Routing alone only forwards
incoming replies.

Main-site image uploads target `R2_BUCKET`; Academy media storage targets
`ACADEMY_R2_BUCKET`, rejects using the same bucket name, and never falls back
to the main bucket. The storage adapter shares the R2 account credentials, so
the R2 token must have access to both media buckets. Academy certificate
templates and issued PDFs use the separate `ACADEMY_CERTIFICATE_R2_BUCKET`;
private course files also use this bucket; keep it private and grant the shared
R2 credentials access to it.
Certificate templates must contain fillable text fields named `student_name`,
`program_name`, `issue_date`, and `certificate_number`. Replacing a template
affects future issuances only.

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
| `/academy/admin/login` | MITA Academy administrator login |
| `/academy/admin/admissions` | Review applications, approve admissions, and retry failed SMS |
| `/academy/admin/programs` | Add programs, set semester fees, and manage scholarships |
| `/academy/admin/students` | Student directory with full registration details |
| `/academy/admin/instructors` | Academy instructor accounts and course assignments |
| `/instructor/login` | MITA Academy instructor login |
| `/instructor/dashboard` | Instructor teaching dashboard |
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
| `ACADEMY_DATABASE_URL` | the connection string for a separate Academy PostgreSQL database |
| `SESSION_SECRET` | a long random string (required — signs admin cookies) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | your Gmail address |
| `SMTP_PASS` | Gmail App Password |
| `SMTP_FROM` | `support@menositconsult.com` |
| `RECIPIENT_EMAIL` | where enquiries are delivered |
| `ACADEMY_MNOTIFY_API_KEY` | private mNotify API key for admission SMS |
| `ACADEMY_MNOTIFY_SENDER` | mNotify-approved sender ID, up to 11 characters |
| `ADMIN_PASSWORD` | the admin password to seed (see step 4) |
| `ACADEMY_ADMIN_EMAIL` | `academy@menositconsult.com` or your chosen first-admin email |
| `ACADEMY_ADMIN_PASSWORD` | a unique, strong password for the first Academy admin |

### 3. Deploy

```bash
npm i -g vercel
vercel          # links & deploys a preview
vercel --prod   # production
```

### 4. Connect the custom domain

The production site uses **https://menositconsult.com** as its primary domain,
and MITA Academy uses **https://academy.menositconsult.com**. In **Vercel →
Project → Settings → Domains**, add both `menositconsult.com` and
`academy.menositconsult.com` and configure the DNS records Vercel displays at
your domain registrar. Requests to the Academy subdomain root open the Academy
landing page; student and admin portal paths remain under `/academy`, and
instructor paths remain under `/instructor`.

Set `SITE_URL=https://menositconsult.com` and
`ACADEMY_SITE_URL=https://academy.menositconsult.com` for Production, then
redeploy. The variables keep main-site email links on the main domain and
Academy application, admission, and instructor invitation links on the Academy
subdomain.

### Academy homepage media

The homepage uses illustrative stock media, not footage or photos of MITA
students. Video: [Legacy of Fire on Pexels](https://www.pexels.com/video/students-engaged-in-computer-lab-learning-31667523/).
Photo: [Monstera Production on Pexels](https://www.pexels.com/photo/black-man-writing-in-notebook-while-doing-homework-6238107/).
Both are used under the [Pexels License](https://www.pexels.com/license/), which
allows free use without required attribution.

### 5. Database
No migration step is required — the app creates and seeds the schema
automatically on the first request after `POSTGRES_URL` is set. To seed ahead
of time instead:

```bash
cd backend
set POSTGRES_URL=postgresql://...
set ADMIN_PASSWORD=your-secure-password
node migrate.js
```

> **Login at `https://menositconsult.com/admin`** with `admin` / the
> `ADMIN_PASSWORD` you seeded.

---

## Deployment (self-hosted VM)

1. Create a VM (Ubuntu 22.04+), install Node.js 20+ and PostgreSQL
2. Clone the repo and run `npm install` at the project root
3. Set `POSTGRES_URL`, `ACADEMY_DATABASE_URL`, `SESSION_SECRET`, SMTP vars,
   `ACADEMY_MNOTIFY_API_KEY`, `ACADEMY_MNOTIFY_SENDER`, `ADMIN_PASSWORD`,
   `ACADEMY_ADMIN_EMAIL` and `ACADEMY_ADMIN_PASSWORD`
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
