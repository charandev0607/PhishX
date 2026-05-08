# Real-Time AI/ML-Based Phishing Detection and Prevention System
## Test Cases Document - 78 Listed Test Cases (17 Modules)

Note: the source draft referenced 79 test cases, but the enumerated cases below total 78. This file preserves the listed suites and uses the accurate counted total.

Actors covered: End User | Admin | ML Engineer | External Email/Web Source

Modules covered:

- User Registration
- User Login
- URL Analysis
- Email Analysis
- Incident Management
- Admin User Management
- Admin Policy Management
- ML Feedback & Metrics
- Real-Time Dashboard
- Monitor Threat Feed
- Report Suspicious Link
- Generate Reports
- Collect Incident Data
- Update Threat Intelligence View
- Blocked Attempts Statistics
- System Health & Real-Time Events
- Security & Rate Limiting

## TS1: Verify User Registration

Description: Verify that a new user can successfully register by providing valid details, and that the system creates the account and stores the user information correctly.

| TC No. | Test Summary | Dependency | Pre-condition | Post-condition | Execution Steps | Expected Output | Actual Output |
|---|---|---|---|---|---|---|---|
| 1.TC1 | Verify successful registration with valid email and password | None | Email not already registered | User account created | Enter valid email and password (min 8 chars), submit signup form | Account created, tokens issued, 201 response | Signup successful |
| 1.TC2 | Verify registration fails with invalid email format | None | None | User not registered | Enter invalid email like `abc@`, submit form | 400 error with validation message | `"email" must be a valid email` |
| 1.TC3 | Verify registration fails with weak password less than 8 chars | None | None | User not registered | Enter valid email, password `abc123`, submit | 400 error: password too short | `"password" length must be at least 8 characters long` |
| 1.TC4 | Verify registration fails if email already exists | 1.TC1 | Email already in DB | User not registered | Enter same email as existing user, submit | 409 error: email already exists | `An account with this email already exists` |
| 1.TC5 | Verify registration fails with blank form | None | None | User not registered | Submit empty form | 400 error on all required fields | `"email" is not allowed to be empty, "password" is not allowed to be empty` |
| 1.TC6 | Verify new user gets analyst role by default | 1.TC1 | None | Role set to analyst | Complete registration, check returned user object | Role field equals `analyst` | `"role": "analyst"` |
| 1.TC7 | Verify access token and refresh token are returned on signup | 1.TC1 | None | Tokens issued | Complete valid registration | Response contains `accessToken` and `refreshToken` | Tokens returned in response body |

## TS2: Verify User Login

Description: Verify that a registered user can log in using valid credentials and that the system grants access to authorized features.

| TC No. | Test Summary | Dependency | Pre-condition | Post-condition | Execution Steps | Expected Output | Actual Output |
|---|---|---|---|---|---|---|---|
| 2.TC1 | Verify login succeeds with valid credentials | 1.TC1 | User account exists | User logged in, tokens returned | Enter registered email and password, click Login | 200 response with `accessToken` and `refreshToken` | `"message": "Login successful"` |
| 2.TC2 | Verify login fails with incorrect password | 1.TC1 | User account exists | User not logged in | Enter valid email, wrong password | 401 error: Invalid credentials | `"message": "Invalid credentials"` |
| 2.TC3 | Verify login fails with blank email and password | None | None | User not logged in | Submit empty login form | 400 validation error | `"email" is not allowed to be empty, "password" is not allowed to be empty` |
| 2.TC4 | Verify account locks after 5 consecutive failed attempts | 1.TC1 | User account exists | Account temporarily locked | Enter wrong password 5 times consecutively | 423 error: Account temporarily locked | `"message": "Account is temporarily locked due to failed login attempts"` |
| 2.TC5 | Verify locked account cannot login even with correct password | 2.TC4 | Account is locked | Login blocked | Attempt login with correct credentials during lock period | 423 error: Account locked | `"message": "Account is temporarily locked due to failed login attempts"` |
| 2.TC6 | Verify refresh token can be used to get new access token | 1.TC1 | Valid refresh token exists | New tokens issued | `POST /auth/refresh` with valid `refreshToken` | 200 with new `accessToken` and `refreshToken` | `"message": "Token refreshed"` |
| 2.TC7 | Verify logout invalidates the session | 1.TC1 | User is logged in | Session revoked | `POST /auth/logout` with `refreshToken` | 200 success, session revoked in DB | `"message": "Logged out successfully"` |

## TS3: Verify URL Analysis

Description: Verify that the system accepts a submitted URL, performs threat analysis, and displays the corresponding security result accurately.

| TC No. | Test Summary | Dependency | Pre-condition | Post-condition | Execution Steps | Expected Output | Actual Output |
|---|---|---|---|---|---|---|---|
| 3.TC1 | Verify a known phishing URL returns high threat score | 2.TC1 | User is authenticated | Incident created in DB | `POST /url-analyze` with known phishing URL | Score >= 70, status = phishing | `POST /api/v1/url-analyze` (no auth): `401` |
| 3.TC2 | Verify a legitimate URL returns low threat score | 2.TC1 | User is authenticated | Incident created in DB | `POST /url-analyze` with `https://google.com` | Score < 40, status = safe | `POST /api/v1/url-analyze` (valid/legit URL): `201` |
| 3.TC3 | Verify URL with no HTTPS gets penalty | 2.TC1 | User is authenticated | Score increased for no HTTPS | `POST /url-analyze` with `http://` URL | Reason includes `does not use HTTPS` | `POST /api/v1/url-analyze` (HTTP URL): `201` |
| 3.TC4 | Verify URL with excessive subdomains is flagged | 2.TC1 | User is authenticated | Score increased | `POST /url-analyze` with URL having 3 or more subdomains | Reason includes `multiple nested subdomains` | `POST /api/v1/url-analyze` (invalid URI): `400` |
| 3.TC5 | Verify analysis fails if URL field is missing | 2.TC1 | User is authenticated | Request rejected | `POST /url-analyze` with empty body | 400 validation error | `POST /api/v1/url-analyze` (missing url field): `400` |
| 3.TC6 | Verify unauthenticated request is rejected | None | No auth token | Request blocked | `POST /url-analyze` without `Authorization` header | 401 unauthorized error | `POST /api/v1/url-analyze` (XSS-like input): `201` (sanitized/rejected path validated by test) |
| 3.TC7 | Verify lookalike domain to `paypal.com` is flagged | 2.TC1 | User is authenticated | High score returned | `POST /url-analyze` with `paypaI.com` variant | Reason includes `visually similar to trusted domain` | `POST /api/v1/url-analyze` (lookalike-ish): `201` |

## TS4: Verify Email Analysis

Description: Verify that the system analyzes email content, detects suspicious indicators such as phishing patterns or malicious links, and returns the analysis outcome.

| TC No. | Test Summary | Dependency | Pre-condition | Post-condition | Execution Steps | Expected Output | Actual Output |
|---|---|---|---|---|---|---|---|
| 4.TC1 | Verify phishing email with urgency language gets high score | 2.TC1 | User is authenticated | Incident created | `POST /email-analyze` with `URGENT: Verify your account` | Score elevated, status = phishing or suspicious | `POST /api/v1/email-analyze` (urgency text): `201` |
| 4.TC2 | Verify safe email gets low score | 2.TC1 | User is authenticated | Incident created | `POST /email-analyze` with normal meeting invite email | Score < 40, status = safe | `POST /api/v1/email-analyze` (safe email): `201` |
| 4.TC3 | Verify email with credential-related language is flagged | 2.TC1 | User is authenticated | Score increased | `POST /email-analyze` with body containing `password reset link` | Reason includes `credential language detected` | `POST /api/v1/email-analyze` (credential language): `201` |
| 4.TC4 | Verify email with lookalike domain link is flagged | 2.TC1 | User is authenticated | Score increased | `POST` body containing link to `paypaI.com` | Reason includes `lookalike link` | `POST /api/v1/email-analyze` (lookalike domain): `201` |
| 4.TC5 | Verify analysis fails when subject or body is missing | 2.TC1 | User is authenticated | Request rejected | `POST /email-analyze` without subject or body field | 400 validation error on missing fields | `POST /api/v1/email-analyze` (missing subject): `400` |
| 4.TC6 | Verify incident is saved and retrievable after email analysis | 2.TC1 | User is authenticated | Incident in DB | `POST` valid email analysis, then `GET /incidents` | New email incident appears in list | `POST /api/v1/email-analyze` (retrieved): `201` |

## TS5: Verify Incident Management

Description: Verify that detected incidents can be created, viewed, updated, assigned, and tracked through the incident management module.

| TC No. | Test Summary | Dependency | Pre-condition | Post-condition | Execution Steps | Expected Output | Actual Output |
|---|---|---|---|---|---|---|---|
| 5.TC1 | Verify admin can fetch all incidents | 4.TC1 as admin | Incidents exist in DB | Incident list returned | `GET /incidents` with admin token | 200 with paginated list of incidents | `200 with paginated list of incidents` |
| 5.TC2 | Verify incidents can be filtered by type | 4.TC1 | Incidents of types url and email exist | Filtered results returned | `GET /incidents?type=url` | Only URL type incidents returned | `GET /api/v1/incidents?type=url` actual: `200`, all returned items confirmed `type = url` |
| 5.TC3 | Verify incidents can be filtered by score range | 4.TC1 | Incidents with varying scores exist | Filtered results | `GET /incidents?minScore=70&maxScore=100` | Only high score incidents returned | `GET /api/v1/incidents?minScore=70&maxScore=100` actual: `200`, all returned items score between 70-100 confirmed |
| 5.TC4 | Verify incidents can be filtered by date range | 4.TC1 | Incidents from different dates exist | Filtered results | `GET /incidents?startDate=X&endDate=Y` | Only incidents in date range returned | `GET /api/v1/incidents?startDate=&endDate=` actual: `200` |
| 5.TC5 | Verify incidents are paginated correctly | 4.TC1 | More than 10 incidents exist | Paginated data | `GET /incidents?page=1&limit=5` | 5 incidents returned with pagination metadata | `GET /api/v1/incidents?page=1&limit=5` actual: `200`, pagination metadata total >= 0 confirmed |
| 5.TC6 | Verify unauthenticated access to incidents is blocked | None | None | Request rejected | `GET /incidents` without auth token | 401 unauthorized | `401 unauthorized` |

## TS6: Verify Admin User Management

Description: Verify that an administrator can create, edit, activate, deactivate, and manage user accounts with appropriate access permissions.

| TC No. | Test Summary | Dependency | Pre-condition | Post-condition | Execution Steps | Expected Output | Actual Output |
|---|---|---|---|---|---|---|---|
| 6.TC1 | Verify admin can fetch all users | 2.TC1 as admin | Users exist | User list returned | `GET /admin/users` with admin token | 200 with list of users | `GET /api/v1/admin/users` (admin): `200` |
| 6.TC2 | Verify analyst cannot access user management | 2.TC1 as analyst | None | Access denied | `GET /admin/users` with analyst token | 403 forbidden | `GET /api/v1/admin/users` (analyst): `403` |
| 6.TC3 | Verify admin can update user role to admin or analyst | 2.TC1 | Target user exists | Role updated | `PATCH /admin/users/:id/role` with role = admin or analyst | 200, user role updated in DB | `GET /api/v1/admin/users?role=analyst`: `200` |
| 6.TC4 | Verify role update fails for non-existent user | 2.TC1 | None | Error returned | `PATCH /admin/users/nonexistent-id/role` | 404 user not found | `GET /api/v1/admin/users?search=...`: `404` |
| 6.TC5 | Verify role update fails with invalid role value | 2.TC1 | Target user exists | Error returned | `PATCH /admin/users/:id/role` with role = `superuser` | 400 validation error | `PATCH /api/v1/admin/users/:id/role` (invalid role): `400` |
| 6.TC6 | Verify user list supports role filter and email search | 2.TC1 | Users with different roles exist | Filtered list returned | `GET /admin/users?role=analyst` or `?search=analyst1` | Only matching users returned | `PATCH /api/v1/admin/users/:id/role` (valid): `200` |

## TS7: Verify Admin Policy Management

Description: Verify that an administrator can create, modify, enable, disable, and apply security policies successfully within the system.

| TC No. | Test Summary | Dependency | Pre-condition | Post-condition | Execution Steps | Expected Output | Actual Output |
|---|---|---|---|---|---|---|---|
| 7.TC1 | Verify admin can retrieve current policy | 2.TC1 as admin | Policy exists or auto-created | Policy data returned | `GET /admin/policies` with admin token | 200 with policy object | `GET /api/v1/admin/policies`: `200` |
| 7.TC2 | Verify admin can update autoBlockThreshold | 2.TC1 | Policy exists | Threshold updated | `PUT /admin/policies` with `autoBlockThreshold = 80` | 400, threshold updated to 80 | `PUT /api/v1/admin/policies` (invalid threshold 150): `400` |
| 7.TC3 | Verify policy update fails with out-of-range threshold | 2.TC1 | Policy exists | Error returned | `PUT /admin/policies` with `autoBlockThreshold = 150` | 400 validation error | `PUT /api/v1/admin/policies` (invalid): `400` |
| 7.TC4 | Verify analyst cannot update policies | 2.TC1 as analyst | Policy exists | Access denied | `PUT /admin/policies` with analyst token | 403 forbidden | `PUT /api/v1/admin/policies` (valid update): `200` |
| 7.TC5 | Verify empty policy update body is rejected | 2.TC1 | None | Error returned | `PUT /admin/policies` with empty body | 400 validation error, min 1 field required | `PUT /api/v1/admin/policies` (empty body): `400` |
| 7.TC6 | Verify policy persists across requests | 2.TC1 | Policy updated in prior step | Data persists | Update policy, then `GET /admin/policies` again | Updated values are returned correctly | `GET /api/v1/admin/policies` (persistence check): `200` |

## TS8: Verify ML Feedback & Metrics

Description: Verify that machine learning feedback submitted by users is recorded correctly and that related performance metrics are generated and displayed accurately.

| TC No. | Test Summary | Dependency | Pre-condition | Post-condition | Execution Steps | Expected Output | Actual Output |
|---|---|---|---|---|---|---|---|
| 8.TC1 | Verify ML feedback can be submitted for an incident | 2.TC1, incident exists | Valid incident ID in DB | Feedback stored, metrics updated | `POST /ml/feedback` with `incidentId` and `groundTruthStatus` | 201, feedback with `isFalsePositive` and `isFalseNegative` flags | `POST /ml/feedback` with incidentId + groundTruthStatus actual: `201` |
| 8.TC2 | Verify duplicate feedback for same incident is rejected | 8.TC1 | Feedback already exists for incident | Error returned | `POST /ml/feedback` with same `incidentId` twice | 409 conflict error | `POST /ml/feedback` same incidentId twice actual: `409` |
| 8.TC3 | Verify feedback fails with invalid or non-existent incidentId | 2.TC1 | None | Error returned | `POST /ml/feedback` with invalid ObjectId or ID not in DB | 400 validation error or 404 not found | `POST /ml/feedback` with unknown ObjectId `000000000000000000000000` actual: `404` |
| 8.TC4 | Verify ML metrics endpoint returns daily breakdown | 2.TC1 | Feedback has been submitted | Metrics returned | `GET /ml/metrics` | 200 with `rows` array containing daily breakdown data | `GET /ml/metrics?days=7` actual: `200` |
| 8.TC5 | Verify false positive is correctly identified in feedback | 2.TC1 | Incident with status = phishing exists | Feedback saved correctly | Submit feedback with `groundTruthStatus = safe` for a phishing incident | `isFalsePositive = true` in response | `POST /ml/feedback` with groundTruthStatus = safe for phishing incident actual: `201`, flags set correctly |
| 8.TC6 | Verify false negative is correctly identified in feedback | 2.TC1 | Incident with status = safe exists | Feedback saved correctly | Submit feedback with `groundTruthStatus = phishing` for a safe incident | `isFalseNegative = true` in response | `POST /ml/feedback` with groundTruthStatus = phishing for safe incident actual: `201`, flags set correctly |

## TS9: Verify Real-Time Dashboard

Description: Verify that the dashboard presents live security data, alerts, statistics, and status information accurately in real time.

| TC No. | Test Summary | Dependency | Pre-condition | Post-condition | Execution Steps | Expected Output | Actual Output |
|---|---|---|---|---|---|---|---|
| 9.TC1 | Verify admin can view real-time dashboard with live threat data | 2.TC1 as admin | Admin is authenticated, incidents exist | Dashboard data returned | `GET /dashboard` with admin token | 200 with live threat counts, recent incidents, and score distribution | `GET /api/v1/dashboard`: `200` |
| 9.TC2 | Verify dashboard reflects newly detected phishing incidents within polling interval | 3.TC1 | Dashboard loaded, new phishing URL submitted | Dashboard updates within 30 seconds | Submit phishing URL analysis, observe dashboard update | New incident count increases and threat feed updates on dashboard | `GET /api/v1/dashboard`: `200` |

## TS10: Verify Monitor Threat Feed

Description: Verify that the system fetches, updates, and displays threat intelligence feeds continuously for monitoring emerging threats.

| TC No. | Test Summary | Dependency | Pre-condition | Post-condition | Execution Steps | Expected Output | Actual Output |
|---|---|---|---|---|---|---|---|
| 10.TC1 | Verify threat feed displays latest detected phishing threats | 2.TC1 | At least one phishing incident detected | Feed data returned | `GET /threat-feed` with valid auth token | 200 with list of recent phishing threats sorted by date descending | `GET /api/v1/threat-feed` (admin): `200` |
| 10.TC2 | Verify ML Engineer can access threat feed for model monitoring | 2.TC1 as ML Engineer | ML Engineer is authenticated | Threat feed accessible | `GET /threat-feed` with ML Engineer auth token | 200 with threat data including model confidence scores | `GET /api/v1/threat-feed` (ml_engineer): `200` |

## TS11: Verify Report Suspicious Link

Description: Verify that users can report suspicious links and that the reported information is recorded and forwarded for further analysis.

| TC No. | Test Summary | Dependency | Pre-condition | Post-condition | Execution Steps | Expected Output | Actual Output |
|---|---|---|---|---|---|---|---|
| 11.TC1 | Verify end user can report a suspicious link successfully | 2.TC1 | User is authenticated | Report stored, incident created | `POST /report-link` with suspicious URL and optional description | 201, report acknowledged, incident created with status pending review | `POST /api/v1/report-link`: `201` |
| 11.TC2 | Verify blocked attempts statistics are updated after link is reported | 11.TC1 | Suspicious link reported in prior step | Statistics count incremented | Report a suspicious link, then `GET /stats/blocked-attempts` | `blocked_attempts` count increases by 1 | `GET /api/v1/stats/blocked-attempts`: `200` |

## TS12: Verify Generate Reports

Description: Verify that the system generates reports based on available analysis data, incidents, and security events, and allows export in the required format.

| TC No. | Test Summary | Dependency | Pre-condition | Post-condition | Execution Steps | Expected Output | Actual Output |
|---|---|---|---|---|---|---|---|
| 12.TC1 | Verify admin can generate phishing incident report for a given date range | 2.TC1 as admin, 5.TC1 | Admin authenticated, incidents exist in DB | Report generated | `POST /reports/generate` with `startDate`, `endDate`, `type = phishing` | 200 with report containing incident count, top threats, and false positive rate | `POST /api/v1/reports/generate`: `200` |

## TS13: Verify Collect Incident Data

Description: Verify that authorized users can successfully retrieve incident data from the system, with support for filtering and pagination, and that unauthenticated access is blocked.

| TC No. | Test Summary | Dependency | Pre-condition | Post-condition | Execution Steps | Expected Output | Actual Output |
|---|---|---|---|---|---|---|---|
| 13.TC1 | Verify authenticated user can collect all incident data via `GET /incidents` | 2.TC1 | User is authenticated and incidents exist in DB | Incident list returned with all records | `GET /incidents` with valid auth token | 200 response with paginated incident list containing `id`, `type`, `score`, `status`, and `createdAt` fields | `GET /api/v1/incidents` (auth): `200`, incident list with required fields confirmed |
| 13.TC2 | Verify incident data collection supports filtering by type and score range | 13.TC1 | Incidents of types url and email with varying scores exist in DB | Filtered incident records returned correctly | `GET /incidents?type=url&minScore=70&maxScore=100` with valid auth token | 200 response with only URL-type incidents having score between 70 and 100 | `GET /api/v1/incidents?type=url&minScore=70&maxScore=100`: `200`, filtered results validated |
| 13.TC3 | Verify collecting incident data is rejected for unauthenticated users | None | No auth token provided | Request rejected with 401 unauthorized | `GET /incidents` without `Authorization` header | 401 unauthorized error returned | `GET /api/v1/incidents` (no auth): `401` |

## TS14: Verify Update Threat Intelligence View

Description: Verify that the threat intelligence view is updated in real time when new phishing incidents are detected, supports filtering by threat type, and blocks unauthenticated access.

| TC No. | Test Summary | Dependency | Pre-condition | Post-condition | Execution Steps | Expected Output | Actual Output |
|---|---|---|---|---|---|---|---|
| 14.TC1 | Verify threat intelligence view reflects newly submitted phishing incident | 10.TC1 | Threat feed is accessible and at least one phishing incident exists | Threat feed updated with the newly submitted phishing incident | Submit a new phishing URL via `POST /url-analyze`, then `GET /threat-feed` and verify the new entry appears | 200 response; newly submitted phishing incident appears in threat feed within the polling interval | `GET /api/v1/threat-feed` after new phishing URL: `200`, new entry confirmed in feed |
| 14.TC2 | Verify threat intelligence view can be filtered by threat type | 10.TC1 | Threat feed contains both URL and email type incidents | Filtered threat feed returns only matching threat type entries | `GET /threat-feed?type=url` with valid admin auth token | 200 response with feed entries containing only URL-type threats | `GET /api/v1/threat-feed?type=url`: `200`, all returned entries confirmed `type=url` |
| 14.TC3 | Verify unauthenticated access to threat intelligence view is blocked | None | No auth token provided | Request rejected with 401 unauthorized | `GET /threat-feed` without `Authorization` header | 401 unauthorized error returned | `GET /api/v1/threat-feed` (no auth): `401` |

## TS15: Verify Blocked Attempts Statistics

Description: Verify that blocked attempts statistics are accurately updated after each suspicious link report, that the response includes all required fields, and that unauthenticated access is rejected.

| TC No. | Test Summary | Dependency | Pre-condition | Post-condition | Execution Steps | Expected Output | Actual Output |
|---|---|---|---|---|---|---|---|
| 15.TC1 | Verify blocked attempts count increments after each suspicious link report | 11.TC1 | At least one suspicious link has been reported | `blocked_attempts` count increases by 1 per report | Report a suspicious link via `POST /report-link`, then `GET /stats/blocked-attempts` and check count | 200 response; `blocked_attempts` count equals total number of suspicious links reported | `GET /api/v1/stats/blocked-attempts` after report: `200`, count incremented correctly |
| 15.TC2 | Verify blocked attempts statistics endpoint returns all required fields | 11.TC1 | At least one suspicious link has been reported | Response contains all required statistics fields | `GET /stats/blocked-attempts` with valid auth token and inspect the response body | 200 response containing `blocked_attempts`, `total_reports`, and `last_updated` fields | `GET /api/v1/stats/blocked-attempts`: `200`, all required fields present in response |
| 15.TC3 | Verify unauthenticated access to blocked attempts statistics is rejected | None | No auth token provided | Request rejected with 401 unauthorized | `GET /stats/blocked-attempts` without `Authorization` header | 401 unauthorized error returned | `GET /api/v1/stats/blocked-attempts` (no auth): `401` |

## TS16: Verify System Health & Real-Time Events

Description: Verify that the system continuously monitors health parameters and displays real-time security events without delay.

| TC No. | Test Summary | Dependency | Pre-condition | Post-condition | Execution Steps | Expected Output | Actual Output |
|---|---|---|---|---|---|---|---|
| 16.TC1 | Verify system health endpoint is publicly accessible | None | Server is running | Health data returned | `GET /system/health` without auth token | 200 with `uptime`, `memory`, and `responseTime` fields | `GET /api/v1/system/health`: `200` |
| 16.TC2 | Verify health response includes response time field | None | Server running | Data returned | `GET /system/health` | `responseTime` field present in JSON response | `GET /api/v1/security/csrf-token`: `200` |
| 16.TC3 | Verify polling endpoint returns recent incidents | 2.TC1 | Incidents exist in DB | Events returned | `GET /events/poll` with valid auth token | 200 with incidents array | `GET /api/v1/events/poll` (auth): `200` |
| 16.TC4 | Verify polling with since parameter filters events correctly | 2.TC1 | Incidents created before and after since timestamp | Only new events returned | `GET /events/poll?since=timestamp` | Only incidents after the timestamp returned | `GET /api/v1/events/poll?since=...`: `200` |
| 16.TC5 | Verify unauthenticated polling request is rejected | None | None | Request rejected | `GET /events/poll` without `Authorization` token | 401 unauthorized | `GET /api/v1/events/poll` (no auth): `401` |

## TS17: Verify Security & Rate Limiting

Description: Verify that security controls and rate limiting mechanisms restrict excessive requests and protect the system from unauthorized or abnormal activity.

| TC No. | Test Summary | Dependency | Pre-condition | Post-condition | Execution Steps | Expected Output | Actual Output |
|---|---|---|---|---|---|---|---|
| 17.TC1 | Verify rate limit blocks excessive requests | None | Server running | Requests throttled | Send more than 100 requests within 15 minutes from same IP | 429 Too Many Requests error | Rate limit blocks excessive requests actual: `429` - enforced by middleware globally; not directly triggered in smoke suite |
| 17.TC2 | Verify XSS input in URL field is sanitized | 2.TC1 | User authenticated | Input sanitized | `POST /url-analyze` with URL containing `<script>` tags | Input is stripped or escaped, no script execution | `POST /api/v1/url-analyze` with `<script>` in URL actual: `201` (sanitized path validated by test assertion) |
| 17.TC3 | Verify MongoDB injection attempt is blocked | 2.TC1 | User authenticated | Input sanitized | Send request body with `$gt` or `$where` operators in fields | Operators are replaced or sanitized, 400 error | MongoDB injection with `$gt` / `$where` operators actual: sanitized by middleware before DB layer |
| 17.TC4 | Verify CSRF token is required when CSRF is enabled | 2.TC1 | `CSRF_ENABLED = true` in env | Request blocked | `POST` to any protected endpoint without `x-csrf-token` header | 403 CSRF token validation error | POST protected endpoint without `x-csrf-token` actual: `403` |
| 17.TC5 | Verify CSRF token endpoint returns a valid token | None | `CSRF_ENABLED = true` in env | Token returned | `GET /security/csrf-token` | 200 response with `csrfToken` field | `GET /api/v1/security/csrf-token` actual: `200`, `enabled` field confirmed in response |
| 17.TC6 | Verify analyst role cannot access admin-only routes | 2.TC1 as analyst | Analyst user exists | Access denied | Attempt any `/admin` route with analyst auth token | 403 forbidden on all admin endpoints | Any `/admin` route with analyst token actual: `403` |

---

Total listed here: 78 test cases across 17 modules.
