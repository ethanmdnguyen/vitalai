# VitalAI — AI-Powered Personal Health Co-Pilot

VitalAI is a full-stack web application that uses Google Gemini to act as your personal trainer and nutritionist. It generates personalised weekly workout and meal plans based on your detailed profile, lets you log daily health metrics with per-meal tracking and workout detail, tracks your streak and progress on an interactive dashboard, maintains a smart grocery list, and delivers a weekly AI review that celebrates your wins and gives actionable coaching for the week ahead.

![Dashboard](docs/screenshot.png)

## Features

- **Detailed Onboarding** — multi-step profile setup covering fitness level, body composition, injuries, preferred workout types, dietary restrictions, primary & secondary goals, goal intensity, and upcoming events
- **AI Weekly Plan** — Gemini generates a personalised workout + meal plan using all profile fields; rich goal summary includes intensity targets and event training context
- **Interactive Plan Editor** — drag-and-drop exercise reordering, inline name/sets/reps editing, AI exercise swap (3 alternatives), AI meal swap (3 alternatives), save meals to My Meals library
- **Grocery List** — one-click generation from your meal plan with AI-powered categorisation (Produce, Proteins, Dairy & Eggs, Grains & Carbs, Pantry), check-off items, copy list to clipboard
- **Enhanced Log Today** — meal-by-meal accordion logging (From Plan / My Meals / Custom), per-meal calorie + macro totals bar, workout detail section (exercise checkboxes + skip reason), water quick-add (+250 ml / +500 ml)
- **Progress Dashboard** — streak counter, weekly adherence chart, weight trend chart, macro averages
- **Weekly AI Review** — structured coaching review with Overview, Wins, Improve, Next Week, and Motivation sections
- **Settings** — account management, unit preference (metric/imperial), danger zone (delete account)

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
| Frontend | React 18, Vite, Tailwind CSS v3, React Router v6, Recharts, Axios, @hello-pangea/dnd, react-markdown |
| Backend | Node.js, Express, JWT, bcryptjs |
| Database | PostgreSQL (pg) |
| AI | Google Gemini (`@google/generative-ai`, model: `gemini-2.5-flash`) |

## npm Scripts

### Backend (`/backend`)

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-reload on file changes) |
| `npm start` | Start without auto-reload |
| `npm test` | Run Jest integration test suite (63 tests across 11 suites) |
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
| PATCH | `/api/plans/current` | ✓ | Update workout or meal plan |
| POST | `/api/plans/swap-exercise` | ✓ | Get 3 AI exercise alternatives |
| POST | `/api/plans/swap-meal` | ✓ | Get 3 AI meal alternatives |
| POST | `/api/meals` | ✓ | Save meal to My Meals library |
| GET | `/api/meals` | ✓ | List saved meals |
| DELETE | `/api/meals/:id` | ✓ | Delete a saved meal |
| POST | `/api/grocery/generate` | ✓ | Generate AI-categorised grocery list |
| GET | `/api/grocery` | ✓ | Fetch grouped grocery items |
| PATCH | `/api/grocery/:id` | ✓ | Toggle item checked status |
| PATCH | `/api/grocery` | ✓ | Uncheck all items |
| DELETE | `/api/grocery` | ✓ | Clear all grocery items |
| POST | `/api/logs` | ✓ | Save or update today's log |
| GET | `/api/logs/today` | ✓ | Fetch today's log |
| GET | `/api/dashboard` | ✓ | Aggregated stats and chart data |
| POST | `/api/reviews/generate` | ✓ | Generate AI weekly review |
| GET | `/api/reviews` | ✓ | List past reviews |
| GET/PUT | `/api/user/settings` | ✓ | Get or update account settings |
| DELETE | `/api/user/account` | ✓ | Delete account |
