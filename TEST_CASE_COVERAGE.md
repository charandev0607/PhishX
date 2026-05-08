# Project Test Case Coverage

This file tracks how the current master test document maps onto the implementation and the available execution paths in the repo.

Primary references:

- Master list: `MASTER_TEST_CASES_70.md` (currently documents 78 listed test cases across 17 modules)
- API automation: `server/src/scripts/smoke-api.mjs`
- Manual/API execution notes: `POSTMAN_TC1_TO_TC7.md`
- Latest observed smoke outputs: `ACTUAL_API_TEST_OUTPUTS.md`

## Coverage Summary by Module

| Module | TC Count | Coverage in Project |
|---|---:|---|
| User Registration | 7 | Automated in `smoke-api.mjs` |
| User Login | 7 | Automated in `smoke-api.mjs` |
| URL Analysis | 7 | Automated in `smoke-api.mjs` |
| Email Analysis | 6 | Automated in `smoke-api.mjs` |
| Incident Management | 6 | Automated in `smoke-api.mjs` |
| Admin User Management | 6 | Automated in `smoke-api.mjs` |
| Admin Policy Management | 6 | Automated in `smoke-api.mjs` |
| ML Feedback & Metrics | 6 | Automated in `smoke-api.mjs` |
| Real-Time Dashboard | 2 | API behavior automated; live UI refresh remains manual/observational |
| Monitor Threat Feed | 2 | Automated in `smoke-api.mjs` |
| Report Suspicious Link | 2 | Automated in `smoke-api.mjs` |
| Generate Reports | 1 | Automated in `smoke-api.mjs` |
| Collect Incident Data | 3 | Covered by the incident list/filter/auth smoke checks; tracked separately here for traceability |
| Update Threat Intelligence View | 3 | Covered by threat-feed and new-incident flows; tracked separately here for traceability |
| Blocked Attempts Statistics | 3 | Covered by report-link and blocked-attempts checks; tracked separately here for traceability |
| System Health & Real-Time Events | 5 | Automated in `smoke-api.mjs` |
| Security & Rate Limiting | 6 | Mostly automated; rate-limit stress remains opt-in |

## Count Reconciliation

- Master document total: `78` listed test cases
- Latest smoke-suite total: `72` passed assertions

These numbers differ because the master document now splits several behaviors into separate traceability-oriented cases:

- `Collect Incident Data`
- `Update Threat Intelligence View`
- `Blocked Attempts Statistics`

Those suites largely map to endpoint behaviors that are already exercised by the smoke suite rather than representing entirely new backend features.

## How to Run Coverage

1. Ensure the backend can start successfully.
2. Ensure admin credentials exist in `server/.env`:
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
3. Run the smoke suite:
   - `npm run smoke -w server`
4. Run the full API workflow from the repo root:
   - `npm run test:api`

## Optional Checks

- Rate-limit stress:
  - `SMOKE_RUN_RATE_LIMIT_TEST=true npm run smoke -w server`
- ML retrain execution path:
  - `SMOKE_RUN_ML_RETRAIN_TEST=true npm run smoke -w server`

## Notes

- The smoke suite is the authoritative automated API signal currently present in the repository.
- Some dashboard and threat-view validations are inherently time-based or UI-observational, so they should still be manually verified in addition to smoke coverage.
- The master document uses the pasted business-facing wording as the source of truth for documentation, even where the current implementation uses `end_user` and `ml_engineer` role names internally.
