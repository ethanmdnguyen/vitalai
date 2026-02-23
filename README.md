# VitalAI — Personal Health Co-Pilot

A full-stack web app that uses Claude AI to generate personalized weekly workout and meal plans, track daily health logs, and deliver weekly progress reviews.

## Project Structure

```
vitalai/
├── backend/          # Node.js + Express API
│   ├── index.js
│   ├── src/
│   │   ├── routes/
│   │   │   └── health.js
│   │   └── middleware/
│   │       └── errorHandler.js
│   ├── db/
│   │   ├── schema.sql
│   │   └── migrate.js
│   └── tests/
│       └── health.test.js
├── frontend/         # React + Vite + Tailwind
│   ├── index.html
│   └── src/
│       ├── api/
│       │   └── client.js
│       ├── pages/
│       │   └── Home.jsx
│       ├── App.jsx
│       └── main.jsx
└── README.md
```

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Setup

### 1. Clone and install dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure environment variables

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and fill in:

| Variable | Description |
|---|---|
| `PORT` | Port the API server listens on (default: `3000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWTs (use a long random string) |
| `ANTHROPIC_API_KEY` | Your Anthropic API key from console.anthropic.com |

### 3. Create the database

```bash
# In PostgreSQL, create the database:
psql -U postgres -c "CREATE DATABASE vitalai;"

# Run migrations to create all tables:
cd backend
node db/migrate.js
```

### 4. Start the servers

```bash
# Terminal 1 — Backend (development with auto-reload)
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

- Backend API: http://localhost:3000
- Frontend: http://localhost:5173

## Available Commands

### Backend

| Command | Description |
|---|---|
| `npm run dev` | Start backend with nodemon (auto-reload) |
| `npm start` | Start backend without auto-reload |
| `npm test` | Run Jest test suite |
| `node db/migrate.js` | Run database migrations |

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check — returns `{ status: "ok", timestamp }` |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v3, React Router v6, Recharts |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| Auth | JWT + bcryptjs |
| AI | Anthropic Claude (`@anthropic-ai/sdk`) |
