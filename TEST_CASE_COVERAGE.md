# Project Test Case Coverage

This file tracks how the 70 master test cases are covered inside the project.

Primary references:

- Master list: `MASTER_TEST_CASES_70.md` (contains 70 total test cases)
- API automation: `server/src/scripts/smoke-api.mjs`
- Postman/manual execution guide: `POSTMAN_TC1_TO_TC7.md`

## Coverage Summary by Module

| Module | TC Count | Coverage in Project |
|---|---:|---|
| User Registration | 7 | Automated in `smoke-api.mjs` |
| User Login | 7 | Automated in `smoke-api.mjs` |
| URL Analysis | 8 | Automated in `smoke-api.mjs` |
| Email + Webpage Analysis | 8 | Automated in `smoke-api.mjs` |
| Incident Management | 6 | Automated in `smoke-api.mjs` |
| Admin User Management | 6 | Automated in `smoke-api.mjs` (requires admin env) |
| Admin Policy Management | 6 | Automated in `smoke-api.mjs` (requires admin env) |
| ML Feedback & Metrics | 6 | Automated in `smoke-api.mjs` |
| System Health & Real-Time Events | 5 | Automated in `smoke-api.mjs` |
| Security & Rate Limiting | 6 | Automated in `smoke-api.mjs` (`10.TC1` optional via `SMOKE_RUN_RATE_LIMIT_TEST=true`) |
| Real-Time Dashboard | 2 | API coverage automated; UI refresh behavior verified via manual/Postman flow |
| Monitor Threat Feed | 2 | Automated in `smoke-api.mjs` |
| Report Suspicious Link | 2 | Automated in `smoke-api.mjs` |
| Generate Reports | 1 | Automated in `smoke-api.mjs` |

## How to Run Full Project Coverage

1. Ensure backend and database are running.
2. Set admin credentials in `server/.env` for admin-only checks:
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
3. Run smoke checks:
   - `npm run smoke -w server`
4. For rate-limit stress testcase (`10.TC1`), run:
   - `SMOKE_RUN_RATE_LIMIT_TEST=true npm run smoke -w server`

## Notes

- The smoke suite intentionally keeps load low by default; rate-limit stress is opt-in.
- Dashboard live-refresh timing validation is inherently UI behavior and should be verified from the dashboard flow in addition to API checks.
- ML baseline readiness is enforced by smoke checks that verify required dataset files exist before API validations.
- Optional ML retraining execution check is available via `SMOKE_RUN_ML_RETRAIN_TEST=true`.
- Runtime ML readiness is available at `GET /api/v1/ml/readiness` for `admin`, `analyst`, and `ml_engineer`.
