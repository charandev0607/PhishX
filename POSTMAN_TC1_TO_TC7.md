# Postman Test Content (TC 1 to TC 7)

Use:

- `{{baseUrl}} = http://localhost:5000/api/v1`
- `{{accessToken}}` (analyst/end-user)
- `{{adminAccessToken}}`
- `{{userId}}`
- `{{refreshToken}}`

Headers for protected routes:

- `Authorization: Bearer {{token}}`
- `Content-Type: application/json`

---

## 1) User Registration

### 1.TC1 - Successful registration
`POST {{baseUrl}}/auth/signup`

```json
{
  "email": "user1@example.com",
  "password": "Password123!"
}
```

Expected: `201`, `accessToken`, `refreshToken`, and created user.

### 1.TC2 - Invalid email format
`POST {{baseUrl}}/auth/signup`

```json
{
  "email": "abc@",
  "password": "Password123!"
}
```

Expected: `400`.

### 1.TC3 - Weak password (<8 chars)
`POST {{baseUrl}}/auth/signup`

```json
{
  "email": "user2@example.com",
  "password": "abc123"
}
```

Expected: `400`.

### 1.TC4 - Duplicate email registration
Repeat 1.TC1 with same email.

Expected: `409`.

### 1.TC5 - Blank form
`POST {{baseUrl}}/auth/signup`

```json
{}
```

Expected: `400`.

### 1.TC6 - Default role is analyst
Use 1.TC1 response and verify:

- `data.user.role = "analyst"`

### 1.TC7 - Tokens returned on signup
Use 1.TC1 response and verify:

- `data.accessToken` present
- `data.refreshToken` present

---

## 2) User Login

### 2.TC1 - Valid login
`POST {{baseUrl}}/auth/login`

```json
{
  "email": "user1@example.com",
  "password": "Password123!"
}
```

Expected: `200` and tokens.

### 2.TC2 - Wrong password
`POST {{baseUrl}}/auth/login`

```json
{
  "email": "user1@example.com",
  "password": "WrongPass999!"
}
```

Expected: `401`.

### 2.TC3 - Blank email/password
`POST {{baseUrl}}/auth/login`

```json
{}
```

Expected: `400`.

### 2.TC4 - Lock after 5 failed attempts
1. Create a user (signup).
2. Call login with wrong password 5 times for same user.

Expected: account lock behavior, next attempt returns `423`.

### 2.TC5 - Locked account blocked even with correct password
After 2.TC4, try correct credentials during lock window.

Expected: `423`.

### 2.TC6 - Refresh token flow
`POST {{baseUrl}}/auth/refresh`

```json
{
  "refreshToken": "{{refreshToken}}"
}
```

Expected: `200` with new access and refresh tokens.

### 2.TC7 - Logout invalidates session
`POST {{baseUrl}}/auth/logout`

```json
{
  "refreshToken": "{{refreshToken}}"
}
```

Expected: `200`, token/session revoked.

---

## 3) URL Analysis

Use header:

- `Authorization: Bearer {{accessToken}}`

### 3.TC1 - Known phishing URL high score
`POST {{baseUrl}}/url-analyze`

```json
{
  "url": "http://paypaI-login-check.example.com"
}
```

Expected: high score (`>=70`) and phishing classification.

### 3.TC2 - Legitimate URL low score
`POST {{baseUrl}}/url-analyze`

```json
{
  "url": "https://google.com"
}
```

Expected: low score (`<40`) and safe classification.

### 3.TC3 - HTTP URL penalty
`POST {{baseUrl}}/url-analyze`

```json
{
  "url": "http://example.com/login"
}
```

Expected reason includes no HTTPS penalty.

### 3.TC4 - Excessive subdomains flagged
`POST {{baseUrl}}/url-analyze`

```json
{
  "url": "https://a.b.c.example.com/login"
}
```

Expected reason includes nested subdomain signal.

### 3.TC5 - Missing URL field
`POST {{baseUrl}}/url-analyze`

```json
{}
```

Expected: `400`.

### 3.TC6 - Unauthenticated blocked
Call same endpoint without Authorization.

Expected: `401`.

### 3.TC7 - Lookalike paypal domain flagged
`POST {{baseUrl}}/url-analyze`

```json
{
  "url": "https://paypaI-security-check.example.com"
}
```

Expected reason includes trusted-domain visual similarity signal.

### 3.TC8 - High entropy/random URL flagged
`POST {{baseUrl}}/url-analyze`

```json
{
  "url": "https://x9f2k8zq1v7m3n4p5t6r-example.com/aaabbbccc111222"
}
```

Expected reason includes entropy/randomness signal.

---

## 4) Email Analysis

Use header:

- `Authorization: Bearer {{accessToken}}`

### 4.TC1 - Urgency phishing language scored high
`POST {{baseUrl}}/email-analyze`

```json
{
  "subject": "URGENT: Verify your account",
  "body": "Immediate action required. Click now."
}
```

Expected: suspicious/phishing signal and elevated score.

### 4.TC2 - Safe email low score
`POST {{baseUrl}}/email-analyze`

```json
{
  "subject": "Team meeting agenda",
  "body": "Please review meeting points for tomorrow."
}
```

Expected: low score and safe status.

### 4.TC3 - Credential language flagged
`POST {{baseUrl}}/email-analyze`

```json
{
  "subject": "Security Notice",
  "body": "Please reset your password using this password reset link."
}
```

Expected reason includes credential-language signal.

### 4.TC4 - Lookalike link flagged
`POST {{baseUrl}}/email-analyze`

```json
{
  "subject": "Payment Issue",
  "body": "Resolve now at https://paypaI-security-check.example.com"
}
```

Expected reason includes lookalike-link signal.

### 4.TC5 - Missing subject/body rejected
`POST {{baseUrl}}/email-analyze`

```json
{
  "body": "Missing subject"
}
```

Expected: `400`.

### 4.TC6 - Incident created and retrievable
1. Run valid `/email-analyze`.
2. `GET {{baseUrl}}/incidents` with auth.

Expected: new email incident appears in list.

---

## 5) Incident Management

### 5.TC1 - Admin fetch all incidents
`GET {{baseUrl}}/incidents` with `{{adminAccessToken}}`.

Expected: `200` with paginated incidents.

### 5.TC2 - Filter by type
`GET {{baseUrl}}/incidents?type=url`

Expected: only URL incidents.

### 5.TC3 - Filter by score range
`GET {{baseUrl}}/incidents?minScore=70&maxScore=100`

Expected: only incidents in score range.

### 5.TC4 - Filter by date range
`GET {{baseUrl}}/incidents?startDate=2026-05-01T00:00:00.000Z&endDate=2026-05-06T23:59:59.000Z`

Expected: only incidents in date window.

### 5.TC5 - Pagination
`GET {{baseUrl}}/incidents?page=1&limit=5`

Expected: 5 records and pagination metadata.

### 5.TC6 - Unauthenticated blocked
`GET {{baseUrl}}/incidents` without auth.

Expected: `401`.

---

## 6) Admin User Management

Use admin token for admin calls.

### 6.TC1 - Admin fetch users
`GET {{baseUrl}}/admin/users`

Expected: `200` list of users.

### 6.TC2 - Analyst forbidden
`GET {{baseUrl}}/admin/users` with analyst token (`{{accessToken}}`).

Expected: `403`.

### 6.TC3 - Update role success
`PATCH {{baseUrl}}/admin/users/{{userId}}/role`

```json
{
  "role": "admin"
}
```

(or `analyst`)

Expected: `200`.

### 6.TC4 - Non-existent user role update
`PATCH {{baseUrl}}/admin/users/000000000000000000000000/role`

```json
{
  "role": "analyst"
}
```

Expected: `404`.

### 6.TC5 - Invalid role value
`PATCH {{baseUrl}}/admin/users/{{userId}}/role`

```json
{
  "role": "superuser"
}
```

Expected: `400`.

### 6.TC6 - Role filter and search
`GET {{baseUrl}}/admin/users?role=analyst`  
`GET {{baseUrl}}/admin/users?search=analyst1`

Expected: filtered users.

---

## 7) Admin Policy Management

### 7.TC1 - Get current policy
`GET {{baseUrl}}/admin/policies` with admin token.

Expected: `200` policy object.

### 7.TC2 - Update autoBlockThreshold
`PUT {{baseUrl}}/admin/policies`

```json
{
  "autoBlockThreshold": 80
}
```

Expected: `200`, threshold updated.

### 7.TC3 - Out-of-range threshold rejected
`PUT {{baseUrl}}/admin/policies`

```json
{
  "autoBlockThreshold": 150
}
```

Expected: `400`.

### 7.TC4 - Analyst cannot update policy
Use analyst token on same PUT.

Expected: `403`.

### 7.TC5 - Empty update body rejected
`PUT {{baseUrl}}/admin/policies`

```json
{}
```

Expected: `400` (min 1 field required).

### 7.TC6 - Policy persistence check
1. Update policy (e.g. threshold 80).
2. `GET {{baseUrl}}/admin/policies`.

Expected: updated values persist.
