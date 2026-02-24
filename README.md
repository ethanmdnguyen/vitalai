# VitalAI — AI-Powered Personal Health Co-Pilot

VitalAI is a full-stack web application that uses Google Gemini to act as your personal trainer and nutritionist. It generates personalised weekly workout and meal plans based on your profile, lets you log daily health metrics (calories, macros, sleep, energy, weight, workouts), tracks your streak and progress on an interactive dashboard, and delivers a weekly AI review that celebrates your wins and gives actionable coaching for the week ahead.

![Dashboard](docs/screenshot.png)

## Prerequisites

- **Node.js 18+**
- **PostgreSQL 14+**
- **Gemini API key** — free at [aistudio.google.com](https://aistudio.google.com)

## Setup

**1. Clone the repo**

```bash
git clone https://github.com/ethanmdnguyen/vitalai.git
cd vitalai
```

**2. Install backend dependencies**

```bash
cd backend
npm install
```

**3. Install frontend dependencies**

```bash
cd ../frontend
npm install
```

**4. Create `backend/.env` from the example**

```bash
cd ../backend
cp .env.example .env
```

Open `backend/.env` and fill in your values:

| Variable | Description |
|---|---|
| `PORT` | Port the API server listens on (default: `3000`) |
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://postgres:password@localhost:5432/vitalai` |
| `JWT_SECRET` | Long random string for signing JWTs |
| `GEMINI_API_KEY` | Your Gemini API key from aistudio.google.com |

**5. Run database migrations**

```bash
# First create the database in PostgreSQL if it doesn't exist:
psql -U postgres -c "CREATE DATABASE vitalai;"

# Then run migrations to create all tables:
node db/migrate.js
```

**6. Start the backend**

```bash
npm run dev
# API running at http://localhost:3000
```

**7. Start the frontend**

```bash
cd ../frontend
npm run dev
# App running at http://localhost:5173
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v3, React Router v6, Recharts, Axios |
| Backend | Node.js, Express, JWT, bcryptjs |
| Database | PostgreSQL (pg) |
| AI | Google Gemini (`@google/generative-ai`, model: `gemini-2.5-flash`) |

## npm Scripts

### Backend (`/backend`)

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-reload on file changes) |
| `npm start` | Start without auto-reload |
| `npm test` | Run Jest integration test suite (29 tests) |
| `node db/migrate.js` | Run database migrations |

### Frontend (`/frontend`)

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Build optimised production bundle |
| `npm run preview` | Serve the production build locally |

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Sign in, returns JWT |
| GET/PUT | `/api/profile` | ✓ | Get or save health profile |
| POST | `/api/plans/generate` | ✓ | Generate AI weekly plan |
| GET | `/api/plans/current` | ✓ | Fetch latest plan |
| POST | `/api/logs` | ✓ | Save or update today's log |
| GET | `/api/logs/today` | ✓ | Fetch today's log |
| GET | `/api/dashboard` | ✓ | Aggregated stats and chart data |
| POST | `/api/reviews/generate` | ✓ | Generate AI weekly review |
| GET | `/api/reviews` | ✓ | List past reviews |
