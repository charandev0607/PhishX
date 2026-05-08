# Actual API Test Outputs

Source run command:

- `npm run test:api`

## Latest Observed Automated Result

- `72 passed, 0 failed`
- Exit code: `0`

## Relationship to the Master Test Document

The master test document now tracks `78` listed test cases across `17` modules.

The automated smoke/API output still reports `72` passing assertions because:

- some master cases are documentation-level traceability splits of the same endpoint behavior
- some validations are phrased as UI or timing observations rather than distinct backend assertions
- the smoke suite remains the current executable API baseline in the repository

## Key Endpoint Outputs Observed

The following are actual statuses from the latest automated run output.

### Auth

- `POST /api/v1/auth/signup` (valid): `201`
- `POST /api/v1/auth/signup` (invalid email): `400`
- `POST /api/v1/auth/signup` (short password): `400`
- `POST /api/v1/auth/signup` (empty body): `400`
- `POST /api/v1/auth/signup` (duplicate): `409`
- `POST /api/v1/auth/login` (valid): `200`
- `POST /api/v1/auth/login` (wrong password): `401`
- `POST /api/v1/auth/refresh` (valid): `200`
- `POST /api/v1/auth/refresh` (rotated/invalid): `401`
- `POST /api/v1/auth/logout`: `200`
- `POST /api/v1/auth/login` after lock scenario: `423`

### URL Analysis

- `POST /api/v1/url-analyze` (no auth): `401`
- `POST /api/v1/url-analyze` (valid/legit URL): `201`
- `POST /api/v1/url-analyze` (invalid URI): `400`
- `POST /api/v1/url-analyze` (missing url field): `400`
- `POST /api/v1/url-analyze` (XSS-like input): `201`
- `POST /api/v1/url-analyze` (HTTP URL): `201`
- `POST /api/v1/url-analyze` (lookalike-ish): `201`

### Email Analysis

- `POST /api/v1/email-analyze` (safe email): `201`
- `POST /api/v1/email-analyze` (urgency text): `201`
- `POST /api/v1/email-analyze` (credential language): `201`
- `POST /api/v1/email-analyze` (missing subject): `400`

### Incidents

- `GET /api/v1/incidents` (no auth): `401`
- `GET /api/v1/incidents?page=1&limit=5`: `200`
- `GET /api/v1/incidents?type=url`: `200`
- `GET /api/v1/incidents?minScore=70&maxScore=100`: `200`
- `GET /api/v1/incidents?startDate=...&endDate=...`: `200`

### ML Feedback & Metrics

- `POST /api/v1/ml/feedback` (unknown ObjectId): `404`
- `POST /api/v1/ml/feedback` (valid): `201`
- `POST /api/v1/ml/feedback` (duplicate): `409`
- `GET /api/v1/ml/metrics?days=7`: `200`

### Events & Health

- `GET /api/v1/system/health`: `200`
- `GET /api/v1/security/csrf-token`: `200`
- `GET /api/v1/events/poll` (no auth): `401`
- `GET /api/v1/events/poll` (auth): `200`
- `GET /api/v1/events/poll?since=...`: `200`

### Admin - Users

- `GET /api/v1/admin/users` (admin): `200`
- `GET /api/v1/admin/users` (analyst): `403`
- `GET /api/v1/admin/users?role=analyst`: `200`
- `GET /api/v1/admin/users?search=...`: `200`
- `PATCH /api/v1/admin/users/:id/role` (invalid role): `400`
- `PATCH /api/v1/admin/users/:id/role` (valid): `200`
- `PATCH /api/v1/admin/users/000000000000000000000000/role`: `404`

### Admin - Policies

- `GET /api/v1/admin/policies`: `200`
- `PUT /api/v1/admin/policies` (invalid threshold 150): `400`
- `PUT /api/v1/admin/policies` (valid update): `200`
- `PUT /api/v1/admin/policies` (empty body): `400`
- `GET /api/v1/admin/policies` (persistence check): `200`

### Dashboard / Threat Feed / Reporting

- `GET /api/v1/dashboard`: `200`
- `GET /api/v1/threat-feed` (admin): `200`
- `GET /api/v1/threat-feed` (ml_engineer): `200`
- `POST /api/v1/report-link`: `201`
- `GET /api/v1/stats/blocked-attempts`: `200`
- `POST /api/v1/reports/generate`: `200`

## Final Observed Summary

- Backend API smoke suite completed successfully.
- All automated assertions passed.
- Latest observed automated total: `72 passed, 0 failed`.
