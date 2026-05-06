# PhishX: Real-Time AI/ML-Based Phishing Detection and Prevention System

PhishX is a comprehensive security tool designed to detect and block phishing attempts in real-time. Utilizing advanced Machine Learning models, it analyzes URLs, detects suspicious patterns, and provides actionable intelligence across multiple user roles.

---

## 🎯 Key Features (Based on System UML)
- **Browser Extension Integration**: Scans URLs and emails proactively for threats.
- **AI/ML Model Analysis**: Breaks down threats using visual similarity, lexical heuristics, and domain analysis.
- **Incident Reporting & Data Storage**: Comprehensive tracking of blocked attempts and threat vectors.
- **Admin Dashboard**: View real-time threat feeds, generate incident reports, and monitor active threats.
- **ML Engineer Dashboard**: Manage and update Threat Intelligence, evaluate model performance metrics, and review blocked attempt statistics.

---

## 🏗️ Project Architecture

The application is organized as a monorepo with separate frontend and backend apps:

### 🖥️ Frontend (React + Vite)
Located in the `/client` directory, it handles the interactive UI.
- Displays the **Browser Extension simulation** workflow.
- Features the **Admin Dashboard** for security oversight.
- Features the **ML Engineer Dashboard** for managing AI model training states.

### ⚙️ Backend (Node.js + Express)
Located in the `/server` directory, it is an Express API for threat ingestion and analytics endpoints.
- `src/models/`: MongoDB models and schema-driven entities (users, incidents, audit logs, sessions).
- `src/routes/`: Versioned API routes.
- `src/controllers/`: Request handlers for auth, analysis, incidents.
- `src/services/`: Detection logic, scoring, retention, session and realtime support.
- `src/utils/`: Reusable helpers (feature extraction, domain similarity, SSL checks, logging).
- `src/config/`: Database configuration.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20.19+)

### Install Monorepo Dependencies
```bash
npm install
```

### Running the Frontend UI
```bash
npm run dev
```

Other root-level scripts:
```bash
npm run build
npm run lint
npm run preview
```

### Backend Setup
Create env file before starting server:
```bash
cp server/.env.example server/.env
```

Run the Express backend:
```bash
npm run server:dev
```

Useful API endpoints:
```bash
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/url-analyze
POST /api/v1/email-analyze
GET /api/v1/incidents
GET /api/v1/events/poll
GET /api/v1/system/health
GET /api/v1/security/csrf-token
```

---

## 🛡️ Target Audience
- **End Users**: Protected automatically via the Browser Extension.
- **Security Admins**: Monitor network safety and generate reports.
- **ML Engineers**: Iteratively improve the detection models and threat repositories.
