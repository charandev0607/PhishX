# Real-Time AI/ML-Based Phishing Detection and Prevention System
## Master Test Cases Document — 72 Test Cases (14 Modules)

Actors: End User | Admin | ML Engineer | External Email/Web Source

Use:

- `{{baseUrl}} = http://localhost:5000/api/v1`
- `{{accessToken}}` (end_user/end-user)
- `{{adminAccessToken}}`
- `{{userId}}`
- `{{refreshToken}}`

Headers for protected routes:

- `Authorization: Bearer {{token}}`
- `Content-Type: application/json`

---

## Modules & Test Cases

| TC No. | Module | Test Summary | Dependency | Pre-condition | Post-condition | Execution Steps | Expected Output |
|--------|--------|-------------|------------|---------------|----------------|-----------------|-----------------|
| 1.TC1 | User Registration | Verify successful registration with valid email and password | None | Email not already registered | User account created | Enter valid email and password (min 8 chars), submit signup form | Account created, tokens issued, 201 response |
| 1.TC2 | User Registration | Verify registration fails with invalid email format | None | None | User not registered | Enter invalid email like abc@, submit form | 400 error with validation message |
| 1.TC3 | User Registration | Verify registration fails with weak password less than 8 chars | None | None | User not registered | Enter valid email, password 'abc123', submit | 400 error: password too short |
| 1.TC4 | User Registration | Verify registration fails if email already exists | 1.TC1 | Email already in DB | User not registered | Enter same email as existing user, submit | 409 error: email already exists |
| 1.TC5 | User Registration | Verify registration fails with blank form | None | None | User not registered | Submit empty form | 400 error on all required fields |
| 1.TC6 | User Registration | Verify new user gets end_user role by default | 1.TC1 | None | Role set to end_user | Complete registration, check returned user object | Role field equals 'end_user' |
| 1.TC7 | User Registration | Verify access token and refresh token are returned on signup | 1.TC1 | None | Tokens issued | Complete valid registration | Response contains accessToken and refreshToken |
| 2.TC1 | User Login | Verify login succeeds with valid credentials | 1.TC1 | User account exists | User logged in, tokens returned | Enter registered email and password, click Login | 200 response with accessToken and refreshToken |
| 2.TC2 | User Login | Verify login fails with incorrect password | 1.TC1 | User account exists | User not logged in | Enter valid email, wrong password | 401 error: Invalid credentials |
| 2.TC3 | User Login | Verify login fails with blank email and password | None | None | User not logged in | Submit empty login form | 400 validation error |
| 2.TC4 | User Login | Verify account locks after 5 consecutive failed attempts | 1.TC1 | User account exists | Account temporarily locked | Enter wrong password 5 times consecutively | 423 error: Account temporarily locked |
| 2.TC5 | User Login | Verify locked account cannot login even with correct password | 2.TC4 | Account is locked | Login blocked | Attempt login with correct credentials during lock period | 423 error: Account locked |
| 2.TC6 | User Login | Verify refresh token can be used to get new access token | 1.TC1 | Valid refresh token exists | New tokens issued | POST to /auth/refresh with valid refreshToken | 200 with new accessToken and refreshToken |
| 2.TC7 | User Login | Verify logout invalidates the session | 1.TC1 | User is logged in | Session revoked | POST to /auth/logout with refreshToken | 200 success, session revoked in DB |
| 3.TC1 | URL Analysis | Verify a known phishing URL returns high threat score | 2.TC1 | User is authenticated | Incident created in DB | POST /url-analyze with known phishing URL | Score >= 70, status = phishing |
| 3.TC2 | URL Analysis | Verify a legitimate URL returns low threat score | 2.TC1 | User is authenticated | Incident created in DB | POST /url-analyze with https://google.com | Score < 40, status = safe |
| 3.TC3 | URL Analysis | Verify URL with no HTTPS gets penalty | 2.TC1 | User is authenticated | Score increased for no HTTPS | POST /url-analyze with http:// URL | Reason includes 'does not use HTTPS' |
| 3.TC4 | URL Analysis | Verify URL with excessive subdomains is flagged | 2.TC1 | User is authenticated | Score increased | POST /url-analyze with URL having 3+ subdomains | Reason includes 'multiple nested subdomains' |
| 3.TC5 | URL Analysis | Verify analysis fails if URL field is missing | 2.TC1 | User is authenticated | Request rejected | POST /url-analyze with empty body | 400 validation error |
| 3.TC6 | URL Analysis | Verify unauthenticated request is rejected | None | No auth token | Request blocked | POST /url-analyze without Authorization header | 401 unauthorized error |
| 3.TC7 | URL Analysis | Verify lookalike domain to paypal.com is flagged | 2.TC1 | User is authenticated | High score returned | POST /url-analyze with paypaI.com variant | Reason includes 'visually similar to trusted domain' |
| 3.TC8 | URL Analysis | Verify URL with high entropy gets flagged by ML model | 2.TC1 | User is authenticated | Score increased | POST /url-analyze with random character-heavy URL | Reason includes 'entropy indicates randomness' |
| 4.TC1 | Email Analysis | Verify phishing email with urgency language gets high score | 2.TC1 | User is authenticated | Incident created | POST /email-analyze with 'URGENT: Verify your account' | Score elevated, status = phishing or suspicious |
| 4.TC2 | Email Analysis | Verify safe email gets low score | 2.TC1 | User is authenticated | Incident created | POST /email-analyze with normal meeting invite email | Score < 40, status = safe |
| 4.TC3 | Email Analysis | Verify email with credential-related language is flagged | 2.TC1 | User is authenticated | Score increased | POST /email-analyze with body containing 'password reset link' | Reason includes 'credential language detected' |
| 4.TC4 | Email Analysis | Verify email with lookalike domain link is flagged | 2.TC1 | User is authenticated | Score increased | POST body containing link to paypaI.com | Reason includes 'lookalike link' |
| 4.TC5 | Email Analysis | Verify analysis fails when subject or body is missing | 2.TC1 | User is authenticated | Request rejected | POST /email-analyze without subject or body field | 400 validation error on missing fields |
| 4.TC6 | Email Analysis | Verify incident is saved and retrievable after email analysis | 2.TC1 | User is authenticated | Incident in DB | POST valid email analysis, then GET /incidents | New email incident appears in list |
| 4.TC7 | Webpage Analysis | Verify unauthenticated webpage analysis is rejected | None | No auth token | Request rejected | POST /webpage-analyze without Authorization header | 401 unauthorized |
| 4.TC8 | Webpage Analysis | Verify webpage analysis fails when text is missing | 2.TC1 | User is authenticated | Request rejected | POST /webpage-analyze without text field | 400 validation error |
| 5.TC1 | Incident Management | Verify admin can fetch all incidents | 2.TC1 as admin | Incidents exist in DB | Incident list returned | GET /incidents with admin token | 200 with paginated list of incidents |
| 5.TC2 | Incident Management | Verify incidents can be filtered by type | 2.TC1 | Incidents of types url and email exist | Filtered results returned | GET /incidents?type=url | Only URL type incidents returned |
| 5.TC3 | Incident Management | Verify incidents can be filtered by score range | 2.TC1 | Incidents with varying scores exist | Filtered results | GET /incidents?minScore=70&maxScore=100 | Only high score incidents returned |
| 5.TC4 | Incident Management | Verify incidents can be filtered by date range | 2.TC1 | Incidents from different dates exist | Filtered results | GET /incidents?startDate=X&endDate=Y | Only incidents in date range returned |
| 5.TC5 | Incident Management | Verify incidents are paginated correctly | 2.TC1 | More than 10 incidents exist | Paginated data | GET /incidents?page=1&limit=5 | 5 incidents returned with pagination metadata |
| 5.TC6 | Incident Management | Verify unauthenticated access to incidents is blocked | None | None | Request rejected | GET /incidents without auth token | 401 unauthorized |
| 6.TC1 | Admin User Management | Verify admin can fetch all users | 2.TC1 as admin | Users exist | User list returned | GET /admin/users with admin token | 200 with list of users |
| 6.TC2 | Admin User Management | Verify end_user cannot access user management | 2.TC1 as end_user | None | Access denied | GET /admin/users with end_user token | 403 forbidden |
| 6.TC3 | Admin User Management | Verify admin can update user role to admin or end_user | 2.TC1 | Target user exists | Role updated | PATCH /admin/users/:id/role with role = admin or end_user | 200, user role updated in DB |
| 6.TC4 | Admin User Management | Verify role update fails for non-existent user | 2.TC1 | None | Error returned | PATCH /admin/users/nonexistent-id/role | 404 user not found |
| 6.TC5 | Admin User Management | Verify role update fails with invalid role value | 2.TC1 | Target user exists | Error returned | PATCH /admin/users/:id/role with role = superuser | 400 validation error |
| 6.TC6 | Admin User Management | Verify user list supports role filter and email search | 2.TC1 | Users with different roles exist | Filtered list returned | GET /admin/users?role=end_user or ?search=end_user1 | Only matching users returned |
| 7.TC1 | Admin Policy Management | Verify admin can retrieve current policy | 2.TC1 as admin | Policy exists or auto-created | Policy data returned | GET /admin/policies with admin token | 200 with policy object |
| 7.TC2 | Admin Policy Management | Verify admin can update autoBlockThreshold | 2.TC1 | Policy exists | Threshold updated | PUT /admin/policies with autoBlockThreshold = 80 | 200, threshold updated to 80 |
| 7.TC3 | Admin Policy Management | Verify policy update fails with out-of-range threshold | 2.TC1 | Policy exists | Error returned | PUT /admin/policies with autoBlockThreshold = 150 | 400 validation error |
| 7.TC4 | Admin Policy Management | Verify end_user cannot update policies | 2.TC1 as end_user | Policy exists | Access denied | PUT /admin/policies with end_user token | 403 forbidden |
| 7.TC5 | Admin Policy Management | Verify empty policy update body is rejected | 2.TC1 | None | Error returned | PUT /admin/policies with empty body | 400 validation error, min 1 field required |
| 7.TC6 | Admin Policy Management | Verify policy persists across requests | 2.TC1 | Policy updated in prior step | Data persists | Update policy, then GET /admin/policies again | Updated values are returned correctly |
| 8.TC1 | ML Feedback & Metrics | Verify ML feedback can be submitted for an incident | 2.TC1, incident exists | Valid incident ID in DB | Feedback stored, metrics updated | POST /ml/feedback with incidentId and groundTruthStatus | 201, feedback with isFalsePositive and isFalseNegative flags |
| 8.TC2 | ML Feedback & Metrics | Verify duplicate feedback for same incident is rejected | 8.TC1 | Feedback already exists for incident | Error returned | POST /ml/feedback with same incidentId twice | 409 conflict error |
| 8.TC3 | ML Feedback & Metrics | Verify feedback fails with invalid or non-existent incidentId | 2.TC1 | None | Error returned | POST /ml/feedback with invalid ObjectId or ID not in DB | 400 validation error or 404 not found |
| 8.TC4 | ML Feedback & Metrics | Verify ML metrics endpoint returns daily breakdown | 2.TC1 | Feedback has been submitted | Metrics returned | GET /ml/metrics | 200 with rows array containing daily breakdown data |
| 8.TC5 | ML Feedback & Metrics | Verify false positive is correctly identified in feedback | 2.TC1 | Incident with status = phishing exists | Feedback saved correctly | Submit feedback with groundTruthStatus = safe for a phishing incident | isFalsePositive = true in response |
| 8.TC6 | ML Feedback & Metrics | Verify false negative is correctly identified in feedback | 2.TC1 | Incident with status = safe exists | Feedback saved correctly | Submit feedback with groundTruthStatus = phishing for a safe incident | isFalseNegative = true in response |
| 9.TC1 | System Health & Real-Time Events | Verify system health endpoint is publicly accessible | None | Server is running | Health data returned | GET /system/health without auth token | 200 with uptime, memory, and responseTime fields |
| 9.TC2 | System Health & Real-Time Events | Verify health response includes response time field | None | Server running | Data returned | GET /system/health | responseTime field present in JSON response |
| 9.TC3 | System Health & Real-Time Events | Verify polling endpoint returns recent incidents | 2.TC1 | Incidents exist in DB | Events returned | GET /events/poll with valid auth token | 200 with incidents array |
| 9.TC4 | System Health & Real-Time Events | Verify polling with since parameter filters events correctly | 2.TC1 | Incidents created before and after since timestamp | Only new events returned | GET /events/poll?since=timestamp | Only incidents after the timestamp returned |
| 9.TC5 | System Health & Real-Time Events | Verify unauthenticated polling request is rejected | None | None | Request rejected | GET /events/poll without Authorization token | 401 unauthorized |
| 10.TC1 | Security & Rate Limiting | Verify rate limit blocks excessive requests | None | Server running | Requests throttled | Send more than 100 requests within 15 minutes from same IP | 429 Too Many Requests error |
| 10.TC2 | Security & Rate Limiting | Verify XSS input in URL field is sanitized | 2.TC1 | User authenticated | Input sanitized | POST /url-analyze with URL containing `<script>` tags | Input is stripped or escaped, no script execution |
| 10.TC3 | Security & Rate Limiting | Verify MongoDB injection attempt is blocked | 2.TC1 | User authenticated | Input sanitized | Send request body with $gt or $where operators in fields | Operators are replaced or sanitized, 400 error |
| 10.TC4 | Security & Rate Limiting | Verify CSRF token is required when CSRF is enabled | 2.TC1 | CSRF_ENABLED = true in env | Request blocked | POST to any protected endpoint without x-csrf-token header | 403 CSRF token validation error |
| 10.TC5 | Security & Rate Limiting | Verify CSRF token endpoint returns a valid token | None | CSRF_ENABLED = true in env | Token returned | GET /security/csrf-token | 200 response with csrfToken field |
| 10.TC6 | Security & Rate Limiting | Verify end_user role cannot access admin-only routes | 2.TC1 as end_user | end_user user exists | Access denied | Attempt any /admin route with end_user auth token | 403 forbidden on all admin endpoints |
| 11.TC1 | Real-Time Dashboard | Verify admin can view real-time dashboard with live threat data | 2.TC1 as admin | Admin is authenticated, incidents exist | Dashboard data returned | GET /dashboard with admin token | 200 with live threat counts, recent incidents, and score distribution |
| 11.TC2 | Real-Time Dashboard | Verify dashboard reflects newly detected phishing incidents within polling interval | 3.TC1 | Dashboard loaded, new phishing URL submitted | Dashboard updates within 30 seconds | Submit phishing URL analysis, observe dashboard update | New incident count increases and threat feed updates on dashboard |
| 12.TC1 | Monitor Threat Feed | Verify threat feed displays latest detected phishing threats | 2.TC1 | At least one phishing incident detected | Feed data returned | GET /threat-feed with valid auth token | 200 with list of recent phishing threats sorted by date descending |
| 12.TC2 | Monitor Threat Feed | Verify ML Engineer can access threat feed for model monitoring | 2.TC1 as ML Engineer | ML Engineer is authenticated | Threat feed accessible | GET /threat-feed with ML Engineer auth token | 200 with threat data including model confidence scores |
| 13.TC1 | Report Suspicious Link | Verify end user can report a suspicious link successfully | 2.TC1 | User is authenticated | Report stored, incident created | POST /report-link with suspicious URL and optional description | 201, report acknowledged, incident created with status pending review |
| 13.TC2 | Report Suspicious Link | Verify blocked attempts statistics are updated after link is reported | 13.TC1 | Suspicious link reported in prior step | Statistics count incremented | Report a suspicious link, then GET /stats/blocked-attempts | blocked_attempts count increases by 1 |
| 14.TC1 | Generate Reports | Verify admin can generate phishing incident report for a given date range | 2.TC1 as admin, 5.TC1 | Admin authenticated, incidents exist in DB | Report generated | POST /reports/generate with startDate, endDate, type = phishing | 200 with report containing incident count, top threats, and false positive rate |

---

Total: 72 Test Cases across 14 Modules — all use case diagram actors and flows covered.
