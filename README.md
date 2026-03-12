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

The application is built using a modern decoupled architecture:

### 🖥️ Frontend (React + Vite)
Located in the `/frontend` directory, it handles the interactive UI.
- Displays the **Browser Extension simulation** workflow.
- Features the **Admin Dashboard** for security oversight.
- Features the **ML Engineer Dashboard** for managing AI model training states.

### ⚙️ Backend (Python)
Located in the `/backend` directory, it is structured to support a robust API (e.g., FastAPI, Flask) and ML serving pipeline.
- `models/`: Contains Pydantic schemas reflecting UML entities (`IncidentReport`, `ModelPerformanceMetrics`, etc.).
- `routes/`: Targeted for API endpoints.
- `controllers/`: For request handling and business logic execution.
- `services/`: Where ML model invocation, threat intel aggregation, and external API calls reside.
- `utils/`: Reusable helper functions (e.g., logging, security validators).
- `config/`: Application environment settings and database configurations.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- Python (3.9+)

### Running the Frontend UI
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
The backend currently contains architectural scaffolding and schema definitions. To view the UML schemas:
```bash
cd backend
python -m pip install pydantic
# Review the schemas located in backend/models/schemas.py
```

---

## 🛡️ Target Audience
- **End Users**: Protected automatically via the Browser Extension.
- **Security Admins**: Monitor network safety and generate reports.
- **ML Engineers**: Iteratively improve the detection models and threat repositories.
