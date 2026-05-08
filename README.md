# PhishX

PhishX is a full-stack phishing detection and prevention platform built as a monorepo. It combines a React frontend, an Express backend, and a Python ML inference service to analyze URLs, emails, and webpage content in near real time.

The project includes role-based dashboards for end users, security admins, and ML engineers, along with incident monitoring, policy management, reporting, retraining hooks, and health telemetry.

## Core Features

- Real-time phishing analysis for URLs, emails, and webpage text
- Browser-extension-style analysis UI in the frontend
- Role-based authentication for `admin`, `end_user`, and `ml_engineer`
- Admin dashboard for threat visibility, policy control, and reporting
- ML engineer dashboard for model readiness, metrics, feedback, and retraining flows
- Incident tracking, blocked-attempt statistics, and suspicious link reporting
- Socket-driven health updates and polling-based event feeds
- Secure backend defaults with rate limiting, CORS, Helmet, HPP, XSS sanitization, and Mongo sanitization

## Architecture

### Frontend

Located in `client/`

- React 19 + Vite
- Simulated browser extension workflow
- Auth flow with session persistence
- Threat details view
- Admin dashboard
- ML engineer dashboard

### Backend

Located in `server/`

- Node.js + Express
- MongoDB with optional in-memory fallback for local development
- JWT auth with refresh-token flow
- REST API for auth, analysis, incidents, monitoring, admin, ML, and security
- Socket.IO support for live health updates

### ML Service

Located in `MLPipeline/`

- FastAPI inference service
- Models for:
  - URL classification
  - Email phishing classification
  - Webpage text/signal classification
- Local retraining scripts and stored model artifacts

## Monorepo Structure

```text
PhishX/
|- client/        # React frontend
|- server/        # Express API
|- MLPipeline/    # Python ML pipeline and inference service
|- README.md
|- package.json
|- start-all.ps1
```

## Prerequisites

- Node.js 20.19+ or newer
- Python 3.10+ or newer
- npm
- MongoDB only if you do not want to use the local memory fallback

## Installation

### 1. Install JavaScript dependencies

```bash
npm install
```

This installs the workspace dependencies for the root, `client`, and `server`.

### 2. Install Python dependencies

```bash
pip install -r MLPipeline/requirements.txt
```

## Environment Setup

Create the backend environment file:

```bash
copy server\.env.example server\.env
```

Minimum required values in `server/.env`:

```env
JWT_ACCESS_SECRET=replace-with-strong-access-secret
JWT_REFRESH_SECRET=replace-with-strong-refresh-secret
```

Commonly used defaults already provided in `server/.env.example`:

- `PORT=5000`
- `CLIENT_ORIGIN=http://localhost:5173`
- `ML_SERVICE_URL=http://127.0.0.1:8010`
- `MONGO_URI=mongodb://127.0.0.1:27017/phishx`
- `ADMIN_EMAIL=admin@phishx.local`
- `ADMIN_PASSWORD=ChangeMeStrong123!`

## Running the Project

### Start all services together

```bash
npm run dev
```

This starts:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- ML service: `http://127.0.0.1:8010`

### Alternative Windows launcher

```powershell
./start-all.ps1
```

### Start services individually

```bash
npm run client:dev
npm run server:dev
npm run ml:dev
```

## Available Scripts

Root workspace scripts:

```bash
npm run dev
npm run build
npm run lint
npm run preview
npm run seed
npm run smoke
npm run test
npm run test:api
```

Notes:

- `server:dev` and `server:start` enable `MONGO_MEMORY_FALLBACK=true`, so local development can run without a standalone MongoDB instance.
- If `RESEND_API_KEY` is missing or the `resend` package is unavailable, OTP email sending falls back to a mock console flow instead of crashing the server.

## Main API Surface

Base URL: `http://localhost:5000/api/v1`

### Authentication

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/forgot-password-otp`
- `POST /auth/verify-otp`
- `POST /auth/reset-password-otp`

### Analysis

- `POST /url-analyze`
- `POST /email-analyze`
- `POST /webpage-analyze`
- `GET /events/poll`
- `GET /system/health`

### Incidents and Monitoring

- `GET /incidents`
- `GET /dashboard`
- `GET /threat-feed`
- `POST /report-link`
- `GET /stats/blocked-attempts`
- `POST /reports/generate`

### Admin

- `GET /admin/users`
- `PATCH /admin/users/:userId/role`
- `GET /admin/policies`
- `PUT /admin/policies`

### ML Operations

- `POST /ml/feedback`
- `GET /ml/metrics`
- `GET /ml/readiness`
- `POST /ml/retrain`

### Security

- `GET /security/csrf-token`

## ML Service Endpoints

Base URL: `http://127.0.0.1:8010`

- `GET /health`
- `POST /score/url`
- `POST /score/email`
- `POST /score/webpage`
- `POST /retrain`

## Testing

The repository includes a documented 70-test-case coverage set across 14 modules.

Relevant files:

- [MASTER_TEST_CASES_70.md](C:/Users/welcome/Desktop/PhisX/PhishX/MASTER_TEST_CASES_70.md)
- [ACTUAL_API_TEST_OUTPUTS.md](C:/Users/welcome/Desktop/PhisX/PhishX/ACTUAL_API_TEST_OUTPUTS.md)
- [POSTMAN_TC1_TO_TC7.md](C:/Users/welcome/Desktop/PhisX/PhishX/POSTMAN_TC1_TO_TC7.md)
- [POSTMAN_TC8_TO_TC14.md](C:/Users/welcome/Desktop/PhisX/PhishX/POSTMAN_TC8_TO_TC14.md)
- [TEST_CASE_COVERAGE.md](C:/Users/welcome/Desktop/PhisX/PhishX/TEST_CASE_COVERAGE.md)

Run the main automated checks with:

```bash
npm run test
```

Run the API smoke flow only with:

```bash
npm run test:api
```

## Tech Stack

- Frontend: React, Vite, React Router, Recharts, Socket.IO Client, jsPDF
- Backend: Node.js, Express, Mongoose, JWT, Socket.IO
- Security: Helmet, CORS, rate limiting, HPP, XSS sanitization, Mongo sanitize
- ML: FastAPI, scikit-learn, joblib, NumPy, pandas, tldextract

## Current Dev Notes

- Local backend startup has been hardened so missing `resend` installation does not block development.
- The ML service can bootstrap model artifacts by running retraining scripts if required artifacts are missing.
- The frontend app title and UI branding currently surface `Sentinel AI` in the authenticated shell, while the project repository and backend remain named `PhishX`.
