# Postman Test Content (TC 8 to TC 14)

Use:

- `{{baseUrl}} = http://localhost:5000/api/v1`
- `{{accessToken}}` (analyst/end-user)
- `{{adminAccessToken}}`
- `{{mlAccessToken}}`
- `{{incidentId}}`

Headers for protected routes:

- `Authorization: Bearer {{token}}`
- `Content-Type: application/json`

---

## 8) ML Feedback & Metrics

### 8.TC1 - Submit ML feedback
`POST {{baseUrl}}/ml/feedback`  
Auth: `{{accessToken}}`

```json
{
  "incidentId": "{{incidentId}}",
  "groundTruthStatus": "safe"
}
```

### 8.TC2 - Duplicate feedback rejected
Repeat same request from 8.TC1 (expect 409).

### 8.TC3 - Invalid / non-existent incidentId
`POST {{baseUrl}}/ml/feedback`

```json
{
  "incidentId": "000000000000000000000000",
  "groundTruthStatus": "safe"
}
```

### 8.TC4 - Get ML metrics
`GET {{baseUrl}}/ml/metrics`  
Auth: `{{accessToken}}`

### 8.TC5 - False positive
(Use incident with predicted status phishing/suspicious)

```json
{
  "incidentId": "{{incidentId}}",
  "groundTruthStatus": "safe"
}
```

Expect `isFalsePositive = true`.

### 8.TC6 - False negative
(Use incident with predicted status safe)

```json
{
  "incidentId": "{{incidentId}}",
  "groundTruthStatus": "phishing"
}
```

Expect `isFalseNegative = true`.

---

## 9) System Health & Real-Time Events

### 9.TC1 - Public health endpoint
`GET {{baseUrl}}/system/health`  
(No auth)

### 9.TC2 - responseTime field check
Same:
`GET {{baseUrl}}/system/health`

### 9.TC3 - Poll recent incidents
`GET {{baseUrl}}/events/poll`  
Auth: `{{accessToken}}`

### 9.TC4 - Poll with since filter
`GET {{baseUrl}}/events/poll?since=2026-05-06T00:00:00.000Z`  
Auth: `{{accessToken}}`

### 9.TC5 - Poll without auth rejected
`GET {{baseUrl}}/events/poll`  
(No auth)

---

## 10) Security & Rate Limiting

### 10.TC1 - Rate limit
Send `GET {{baseUrl}}/system/health` (or any route) >100 times quickly from same IP.

### 10.TC2 - XSS input in URL field
`POST {{baseUrl}}/url-analyze`  
Auth: `{{accessToken}}`

```json
{
  "url": "https://example.com/<script>alert(1)</script>"
}
```

### 10.TC3 - Mongo injection attempt
`POST {{baseUrl}}/url-analyze`

```json
{
  "url": {
    "$gt": ""
  }
}
```

(or payload containing `$where`)

### 10.TC4 - CSRF required when enabled
If `CSRF_ENABLED=true`:

- Send protected POST (e.g. `/url-analyze`) **without** `x-csrf-token` header.

### 10.TC5 - Get CSRF token
`GET {{baseUrl}}/security/csrf-token`

### 10.TC6 - Analyst blocked from admin routes
`GET {{baseUrl}}/admin/users` with `{{accessToken}}` (analyst token)

---

## 11) Real-Time Dashboard

### 11.TC1 - Admin dashboard access
`GET {{baseUrl}}/dashboard`  
Auth: `{{adminAccessToken}}`

### 11.TC2 - Dashboard updates after new phishing detection
1. `POST {{baseUrl}}/url-analyze` with phishing URL (analyst token)  
2. `GET {{baseUrl}}/dashboard` (admin token)  
3. Verify counts/feed changed.

---

## 12) Monitor Threat Feed

### 12.TC1 - Threat feed latest phishing threats
`GET {{baseUrl}}/threat-feed`  
Auth: `{{accessToken}}` (or admin)

### 12.TC2 - ML Engineer access
`GET {{baseUrl}}/threat-feed`  
Auth: `{{mlAccessToken}}`

---

## 13) Report Suspicious Link

### 13.TC1 - Report link
`POST {{baseUrl}}/report-link`  
Auth: `{{accessToken}}`

```json
{
  "url": "https://suspicious-login.example.com",
  "description": "Potential phishing page"
}
```

### 13.TC2 - Blocked attempts stats increment
1. `GET {{baseUrl}}/stats/blocked-attempts` (save count)  
2. POST `/report-link`  
3. `GET {{baseUrl}}/stats/blocked-attempts` again (expect +1)

---

## 14) Generate Reports

### 14.TC1 - Generate phishing report
`POST {{baseUrl}}/reports/generate`  
Auth: `{{adminAccessToken}}`

```json
{
  "startDate": "2026-05-01T00:00:00.000Z",
  "endDate": "2026-05-06T23:59:59.000Z",
  "type": "phishing"
}
```
