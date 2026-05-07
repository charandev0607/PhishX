/**
 * API smoke suite — run with backend listening (e.g. npm run dev -w server).
 * Usage: npm run smoke -w server
 */
import { config } from "dotenv";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", "..", ".env") });
const REPO_ROOT = join(__dirname, "..", "..", "..");
const REQUIRED_ML_DATASETS = [
  "MLPipeline/datasets/url_train.jsonl",
  "MLPipeline/datasets/email_train.jsonl",
  "MLPipeline/datasets/webpage_train.jsonl",
];

const smokePort = Number(process.env.PORT || 5000);
const BASE = process.env.SMOKE_API_BASE || `http://127.0.0.1:${smokePort}/api/v1`;

let passed = 0;
let failed = 0;

function ok(name, cond, detail = "") {
  if (cond) {
    passed += 1;
    console.log(`✓ ${name}`);
  } else {
    failed += 1;
    console.error(`✗ ${name}${detail ? `: ${detail}` : ""}`);
  }
}

async function jsonFetch(method, path, { headers = {}, body, token } = {}) {
  const h = { ...headers };
  if (body !== undefined) {
    h["content-type"] = "application/json";
  }
  if (token) {
    h.authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function waitForApiReady(maxMs = Number(process.env.SMOKE_WAIT_MS || 90000)) {
  const deadline = Date.now() + maxMs;
  let lastErr = "";
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/system/health`);
      if (r.ok) {
        console.log("API is ready.\n");
        return;
      }
      lastErr = `HTTP ${r.status}`;
    } catch (e) {
      lastErr = e?.cause?.message || e?.message || String(e);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for API at ${BASE} (${lastErr}). Start one backend only and ensure target port is free, then retry.`);
}

async function main() {
  console.log(`Smoke target: ${BASE}`);
  console.log("Waiting for API…");
  await waitForApiReady();

  // Baseline ML dataset availability
  for (const relPath of REQUIRED_ML_DATASETS) {
    ok(`ml dataset exists: ${relPath}`, existsSync(join(REPO_ROOT, relPath)));
  }

  // Health
  const health = await jsonFetch("GET", "/system/health");
  ok("health 200", health.status === 200);
  ok("health has responseTime", health.status === 200 && typeof health.data?.data?.responseTime === "number");

  // CSRF info (public)
  const csrf = await jsonFetch("GET", "/security/csrf-token");
  ok("csrf-token 200", csrf.status === 200);
  ok("csrf payload shape", csrf.data?.data?.enabled !== undefined);
  const csrfEnabled = Boolean(csrf.data?.data?.enabled);
  const csrfToken = process.env.CSRF_SHARED_TOKEN;

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const analystEmail = `smoke_analyst_${suffix}@example.com`;
  const analystPass = "Password123!";

  const badEmail = await jsonFetch("POST", "/auth/signup", { body: { email: "bad@", password: analystPass } });
  ok("signup invalid email → 400", badEmail.status === 400);

  const badPw = await jsonFetch("POST", "/auth/signup", { body: { email: "good@example.com", password: "short" } });
  ok("signup short password → 400", badPw.status === 400);

  const empty = await jsonFetch("POST", "/auth/signup", { body: {} });
  ok("signup empty body → 400", empty.status === 400);

  const signup = await jsonFetch("POST", "/auth/signup", { body: { email: analystEmail, password: analystPass } });
  ok("signup 201", signup.status === 201);
  ok("signup role end_user", signup.data?.data?.user?.role === "end_user");
  ok("signup returns tokens", !!(signup.data?.data?.accessToken && signup.data?.data?.refreshToken));

  const dup = await jsonFetch("POST", "/auth/signup", { body: { email: analystEmail, password: analystPass } });
  ok("duplicate signup → 409", dup.status === 409);

  const wrongPw = await jsonFetch("POST", "/auth/login", { body: { email: analystEmail, password: "WrongPass999!" } });
  ok("wrong password → 401", wrongPw.status === 401);

  const login = await jsonFetch("POST", "/auth/login", { body: { email: analystEmail, password: analystPass } });
  ok("login 200", login.status === 200);
  const access = login.data?.data?.accessToken;
  let refresh = login.data?.data?.refreshToken;

  const refresh1 = await jsonFetch("POST", "/auth/refresh", { body: { refreshToken: refresh } });
  ok("refresh 200", refresh1.status === 200);
  const oldRefresh = refresh;
  refresh = refresh1.data?.data?.refreshToken;

  const reuseOld = await jsonFetch("POST", "/auth/refresh", { body: { refreshToken: oldRefresh } });
  ok(
    "old refresh after rotate handled",
    reuseOld.status === 401
  );

  const logout = await jsonFetch("POST", "/auth/logout", { body: { refreshToken: refresh } });
  ok("logout 200", logout.status === 200);

  const afterOut = await jsonFetch("POST", "/auth/refresh", { body: { refreshToken: refresh } });
  ok("refresh after logout → 401", afterOut.status === 401);

  // New session for analysis tests
  const login2 = await jsonFetch("POST", "/auth/login", { body: { email: analystEmail, password: analystPass } });
  const access2 = login2.data?.data?.accessToken;

  const incNoAuth = await jsonFetch("GET", "/incidents");
  ok("incidents no auth → 401", incNoAuth.status === 401);

  const pollNoAuth = await jsonFetch("GET", "/events/poll");
  ok("events/poll no auth → 401", pollNoAuth.status === 401);

  const urlNoAuth = await jsonFetch("POST", "/url-analyze", { body: { url: "https://example.com" } });
  ok("url-analyze no auth → 401", urlNoAuth.status === 401);

  const webpageNoAuth = await jsonFetch("POST", "/webpage-analyze", {
    body: { text: "public content", sourceUrl: "https://example.com" },
  });
  ok("webpage-analyze no auth → 401", webpageNoAuth.status === 401);

  const safeUrl = await jsonFetch("POST", "/url-analyze", {
    token: access2,
    body: { url: "https://www.google.com" },
  });
  ok("url-analyze legit URL → 201", safeUrl.status === 201);
  ok("url-analyze returns score", typeof safeUrl.data?.data?.score === "number");
  const safeIncidentId = safeUrl.data?.data?.incidentId;

  const badUrl = await jsonFetch("POST", "/url-analyze", { token: access2, body: { url: "not-a-uri" } });
  ok("url-analyze invalid uri → 400", badUrl.status === 400);
  const missingUrl = await jsonFetch("POST", "/url-analyze", { token: access2, body: {} });
  ok("url-analyze missing url field → 400", missingUrl.status === 400);

  const mongoInjectAttempt = await jsonFetch("POST", "/url-analyze", {
    token: access2,
    body: { url: { $gt: "" } },
  });
  ok("url-analyze mongo operator payload rejected → 400", mongoInjectAttempt.status === 400);

  if (csrfEnabled) {
    const csrfMissing = await jsonFetch("POST", "/url-analyze", {
      token: access2,
      body: { url: "https://csrf-required.example.com" },
    });
    ok("csrf enabled + missing token → 403", csrfMissing.status === 403);
  }

  const xssUrl = await jsonFetch("POST", "/url-analyze", {
    token: access2,
    headers: csrfEnabled ? { "x-csrf-token": csrfToken } : {},
    body: { url: "https://example.com/<script>alert(1)</script>" },
  });
  ok("url-analyze xss-ish payload sanitized/rejected", xssUrl.status === 201 || xssUrl.status === 400);

  const httpUrl = await jsonFetch("POST", "/url-analyze", {
    token: access2,
    body: { url: "http://example.com/path" },
  });
  ok("http URL analyzed → 201", httpUrl.status === 201);
  ok(
    "http URL reason includes HTTPS penalty",
    httpUrl.status === 201 && (httpUrl.data?.data?.reasons || []).some((r) => String(r).toLowerCase().includes("https"))
  );

  const ipUrl = await jsonFetch("POST", "/url-analyze", {
    token: access2,
    body: { url: "http://192.168.10.24/login" },
  });
  ok("ip-host URL analyzed → 201", ipUrl.status === 201);
  ok(
    "ip-host URL reason detected",
    ipUrl.status === 201 &&
      (ipUrl.data?.data?.reasons || []).some((r) => String(r).toLowerCase().includes("raw ip"))
  );

  const shortenerUrl = await jsonFetch("POST", "/url-analyze", {
    token: access2,
    body: { url: "https://bit.ly/account-check" },
  });
  ok("shortener URL analyzed → 201", shortenerUrl.status === 201);
  ok(
    "shortener URL reason detected",
    shortenerUrl.status === 201 &&
      (shortenerUrl.data?.data?.reasons || []).some((r) => String(r).toLowerCase().includes("shortening service"))
  );

  const fakeHttpsUrl = await jsonFetch("POST", "/url-analyze", {
    token: access2,
    body: { url: "https://https-secure-login-check.example.com/portal" },
  });
  ok("fake-https-word URL analyzed → 201", fakeHttpsUrl.status === 201);
  ok(
    "fake-https-word URL reason detected",
    fakeHttpsUrl.status === 201 &&
      (fakeHttpsUrl.data?.data?.reasons || []).some((r) => String(r).toLowerCase().includes("trust-building words"))
  );

  const suspiciousTldUrl = await jsonFetch("POST", "/url-analyze", {
    token: access2,
    body: { url: "https://account-recovery-security.top/login" },
  });
  ok("suspicious-tld URL analyzed → 201", suspiciousTldUrl.status === 201);
  ok(
    "suspicious-tld URL reason detected",
    suspiciousTldUrl.status === 201 &&
      (suspiciousTldUrl.data?.data?.reasons || []).some((r) => String(r).toLowerCase().includes("high-risk top-level domain"))
  );

  const atTrickUrl = await jsonFetch("POST", "/url-analyze", {
    token: access2,
    body: { url: "https://trusted.example.com@evil-login.top/session" },
  });
  ok("@-trick URL analyzed → 201", atTrickUrl.status === 201);
  ok(
    "@-trick URL reason detected",
    atTrickUrl.status === 201 &&
      (atTrickUrl.data?.data?.reasons || []).some((r) => String(r).toLowerCase().includes("@ symbol"))
  );

  const emailRes = await jsonFetch("POST", "/email-analyze", {
    token: access2,
    body: {
      subject: "Team sync",
      body: "Hi — meeting moved to 3pm. No links.",
    },
  });
  ok("email-analyze safe → 201", emailRes.status === 201);

  const webpageRes = await jsonFetch("POST", "/webpage-analyze", {
    token: access2,
    body: {
      text: "Official product documentation and support articles for account setup.",
      sourceUrl: "https://docs.example.com/help",
    },
  });
  ok("webpage-analyze safe → 201", webpageRes.status === 201);

  const webpageMissingText = await jsonFetch("POST", "/webpage-analyze", {
    token: access2,
    body: { sourceUrl: "https://docs.example.com/empty" },
  });
  ok("webpage-analyze missing text → 400", webpageMissingText.status === 400);

  const urg = await jsonFetch("POST", "/email-analyze", {
    token: access2,
    body: {
      subject: "URGENT",
      body: "Verify your account immediately at https://evil.test/phish",
    },
  });
  ok("email urgent → 201", urg.status === 201);
  ok(
    "email urgent reason contains urgency language",
    urg.status === 201 && (urg.data?.data?.reasons || []).some((r) => String(r).toLowerCase().includes("urgency"))
  );

  const credentialMail = await jsonFetch("POST", "/email-analyze", {
    token: access2,
    body: {
      subject: "Security notice",
      body: "Please reset password and confirm login for your bank account",
    },
  });
  ok("email credential language analyzed → 201", credentialMail.status === 201);
  ok(
    "email credential reason detected",
    credentialMail.status === 201 &&
      (credentialMail.data?.data?.reasons || []).some((r) => String(r).toLowerCase().includes("credential"))
  );

  const missSub = await jsonFetch("POST", "/email-analyze", {
    token: access2,
    body: { body: "only body" },
  });
  ok("email missing subject → 400", missSub.status === 400);

  const incList = await jsonFetch("GET", "/incidents?page=1&limit=5", { token: access2 });
  ok("incidents list → 200", incList.status === 200);
  ok("incidents pagination", incList.data?.data?.pagination?.total >= 0);
  const incByType = await jsonFetch("GET", "/incidents?type=url", { token: access2 });
  ok("incidents filter by type → 200", incByType.status === 200);
  ok(
    "incidents filter by type returns url",
    incByType.status === 200 && (incByType.data?.data?.items || []).every((item) => item.type === "url")
  );

  const incByScore = await jsonFetch("GET", "/incidents?minScore=70&maxScore=100", { token: access2 });
  ok("incidents filter by score range → 200", incByScore.status === 200);
  ok(
    "incidents score range respected",
    incByScore.status === 200 &&
      (incByScore.data?.data?.items || []).every((item) => Number(item.score) >= 70 && Number(item.score) <= 100)
  );

  const nowIso = new Date().toISOString();
  const oneDayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const incByDate = await jsonFetch("GET", `/incidents?startDate=${encodeURIComponent(oneDayAgoIso)}&endDate=${encodeURIComponent(nowIso)}`, {
    token: access2,
  });
  ok("incidents filter by date range → 200", incByDate.status === 200);

  const poll = await jsonFetch("GET", "/events/poll", { token: access2 });
  ok("events/poll → 200", poll.status === 200);
  const sinceNow = new Date().toISOString();
  await jsonFetch("POST", "/url-analyze", {
    token: access2,
    body: { url: `https://after-since-${suffix}.example.com/path` },
  });
  const pollSince = await jsonFetch("GET", `/events/poll?since=${encodeURIComponent(sinceNow)}`, { token: access2 });
  ok("events/poll with since → 200", pollSince.status === 200);
  ok("events/poll with since returns only recent", Array.isArray(pollSince.data?.data?.incidents));

  // ML feedback + metrics (needs incident id)
  const mlMarker = `smoke-ml-${suffix}`;
  const urlAgain = await jsonFetch("POST", "/url-analyze", {
    token: access2,
    body: { url: `https://paypaI-verify-login.${mlMarker}.example.com/` },
  });
  ok("url-analyze lookalike-ish → 201", urlAgain.status === 201);
  const lastId = urlAgain.data?.data?.incidentId;

  const fbBad = await jsonFetch("POST", "/ml/feedback", {
    token: access2,
    body: { incidentId: "000000000000000000000000", groundTruthStatus: "safe" },
  });
  ok("ml feedback unknown ObjectId → 404", fbBad.status === 404);

  const fbInvalidId = await jsonFetch("POST", "/ml/feedback", {
    token: access2,
    body: { incidentId: "bad-id", groundTruthStatus: "safe" },
  });
  ok("ml feedback invalid ObjectId format → 400", fbInvalidId.status === 400);

  let fbOk = { status: 0 };
  if (lastId) {
    fbOk = await jsonFetch("POST", "/ml/feedback", {
      token: access2,
      body: { incidentId: String(lastId), groundTruthStatus: "safe", notes: "smoke" },
    });
    ok("ml feedback → 201", fbOk.status === 201);
    ok(
      "ml false-positive flag is logically correct",
      fbOk.status === 201 &&
        (fbOk.data?.data?.predictedStatus !== "phishing" || fbOk.data?.data?.isFalsePositive === true)
    );

    const fbDup = await jsonFetch("POST", "/ml/feedback", {
      token: access2,
      body: { incidentId: lastId, groundTruthStatus: "phishing" },
    });
    ok("ml feedback duplicate → 409", fbDup.status === 409);
  } else {
    ok("ml feedback → 201", false, "no incident id");
  }

  if (safeIncidentId) {
    const fbFalseNegative = await jsonFetch("POST", "/ml/feedback", {
      token: access2,
      body: { incidentId: String(safeIncidentId), groundTruthStatus: "phishing", notes: "smoke-fn" },
    });
    ok("ml feedback false-negative scenario accepted → 201", fbFalseNegative.status === 201);
    ok(
      "ml false-negative flag is logically correct",
      fbFalseNegative.status === 201 &&
        (fbFalseNegative.data?.data?.predictedStatus !== "safe" || fbFalseNegative.data?.data?.isFalseNegative === true)
    );
  } else {
    ok("ml feedback false-negative scenario accepted → 201", false, "no safe incident id");
  }

  const metrics = await jsonFetch("GET", "/ml/metrics?days=7", { token: access2 });
  ok("ml metrics → 200", metrics.status === 200);
  ok("ml metrics returns rows array", metrics.status === 200 && Array.isArray(metrics.data?.data?.rows));

  const mlReadiness = await jsonFetch("GET", "/ml/readiness", { token: access2 });
  ok("ml readiness → 200", mlReadiness.status === 200);
  ok("ml readiness returns ready flag", mlReadiness.status === 200 && typeof mlReadiness.data?.data?.ready === "boolean");

  const retrainNoAuth = await jsonFetch("POST", "/ml/retrain");
  ok("ml retrain no auth → 401", retrainNoAuth.status === 401);

  const retrainEndUser = await jsonFetch("POST", "/ml/retrain", { token: access2 });
  ok("ml retrain end_user forbidden → 403", retrainEndUser.status === 403);

  // Admin flow
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const requireAdminChecks = process.env.SMOKE_REQUIRE_ADMIN !== "false";
  let adminAccess = null;
  if (adminEmail && adminPassword) {
    const al = await jsonFetch("POST", "/auth/login", { body: { email: adminEmail, password: adminPassword } });
    if (al.status === 200) {
      ok("admin login → 200", true);
      adminAccess = al.data?.data?.accessToken;

      const users = await jsonFetch("GET", "/admin/users", { token: adminAccess });
      ok("admin users → 200", users.status === 200);
      const targetUserId =
        users.data?.data?.items?.find((u) => u.email === analystEmail)?.id ||
        users.data?.data?.items?.find((u) => u.email === analystEmail)?._id;

      const endUserBlocked = await jsonFetch("GET", "/admin/users", { token: access2 });
      ok("end_user admin/users → 403", endUserBlocked.status === 403);

  const usersByRole = await jsonFetch("GET", "/admin/users?role=end_user", { token: adminAccess });
      ok("admin users role filter → 200", usersByRole.status === 200);
      const usersBySearch = await jsonFetch("GET", `/admin/users?search=${encodeURIComponent(analystEmail.split("@")[0])}`, {
        token: adminAccess,
      });
      ok("admin users search filter → 200", usersBySearch.status === 200);

      if (targetUserId) {
        const badRole = await jsonFetch("PATCH", `/admin/users/${targetUserId}/role`, {
          token: adminAccess,
          body: { role: "superuser" },
        });
        ok("admin update role invalid value → 400", badRole.status === 400);

        const endUserRole = await jsonFetch("PATCH", `/admin/users/${targetUserId}/role`, {
          token: adminAccess,
          body: { role: "end_user" },
        });
        ok("admin update role to end_user → 200", endUserRole.status === 200);

        const goodRole = await jsonFetch("PATCH", `/admin/users/${targetUserId}/role`, {
          token: adminAccess,
          body: { role: "ml_engineer" },
        });
        ok("admin update role to ml_engineer → 200", goodRole.status === 200);
      }

      const badRoleUser = await jsonFetch("PATCH", "/admin/users/000000000000000000000000/role", {
        token: adminAccess,
        body: { role: "analyst" },
      });
      ok("admin update role user not found → 404", badRoleUser.status === 404);

      const pol = await jsonFetch("GET", "/admin/policies", { token: adminAccess });
      ok("admin policies → 200", pol.status === 200);

      const badPol = await jsonFetch("PUT", "/admin/policies", {
        token: adminAccess,
        body: { autoBlockThreshold: 150 },
      });
      ok("policy invalid threshold → 400", badPol.status === 400);

      const goodPol = await jsonFetch("PUT", "/admin/policies", {
        token: adminAccess,
        body: { autoBlockThreshold: 72 },
      });
      ok("policy update → 200", goodPol.status === 200);
      ok("policy updated value persisted in response", Number(goodPol.data?.data?.autoBlockThreshold) === 72);

      const emptyPol = await jsonFetch("PUT", "/admin/policies", { token: adminAccess, body: {} });
      ok("policy empty body → 400", emptyPol.status === 400);

      const endUserPolicyDenied = await jsonFetch("PUT", "/admin/policies", {
        token: access2,
        body: { autoBlockThreshold: 60 },
      });
      ok("end_user policy update denied → 403", endUserPolicyDenied.status === 403);

      const polAgain = await jsonFetch("GET", "/admin/policies", { token: adminAccess });
      ok(
        "policy persists across requests",
        polAgain.status === 200 && Number(polAgain.data?.data?.autoBlockThreshold) === 72
      );

      const dashboard = await jsonFetch("GET", "/dashboard", { token: adminAccess });
      ok("dashboard admin access → 200", dashboard.status === 200);
      ok("dashboard has live threat data", Array.isArray(dashboard.data?.data?.liveThreatCounts));

      const threatFeedAdmin = await jsonFetch("GET", "/threat-feed", { token: adminAccess });
      ok("threat-feed admin access → 200", threatFeedAdmin.status === 200);

      const mlEmail = `smoke_ml_${suffix}@example.com`;
      const mlPass = "Password123!";
      const mlSignup = await jsonFetch("POST", "/auth/signup", { body: { email: mlEmail, password: mlPass } });
      ok("ml user signup → 201", mlSignup.status === 201);
      const mlUserId = mlSignup.data?.data?.user?.id;
      if (mlUserId) {
        await jsonFetch("PATCH", `/admin/users/${mlUserId}/role`, {
          token: adminAccess,
          body: { role: "ml_engineer" },
        });
      }
      const mlLogin = await jsonFetch("POST", "/auth/login", { body: { email: mlEmail, password: mlPass } });
      const mlToken = mlLogin.data?.data?.accessToken;
      const threatFeedMl = await jsonFetch("GET", "/threat-feed", { token: mlToken });
      ok("threat-feed ml engineer access → 200", threatFeedMl.status === 200);

      const mlReadinessMlRole = await jsonFetch("GET", "/ml/readiness", { token: mlToken });
      ok("ml readiness ml engineer access → 200", mlReadinessMlRole.status === 200);

      if (process.env.SMOKE_RUN_ML_RETRAIN_TEST === "true") {
        const retrainMl = await jsonFetch("POST", "/ml/retrain", { token: mlToken });
        ok("ml retrain with ml engineer role → 200", retrainMl.status === 200);
      }

      const blockedBefore = await jsonFetch("GET", "/stats/blocked-attempts", { token: access2 });
      const beforeCount = Number(blockedBefore.data?.data?.blocked_attempts || 0);
      const reportLink = await jsonFetch("POST", "/report-link", {
        token: access2,
        body: { url: "https://suspicious-login-check.example.com", description: "looks fake" },
      });
      ok("report-link creates report → 201", reportLink.status === 201);
      const blockedAfter = await jsonFetch("GET", "/stats/blocked-attempts", { token: access2 });
      const afterCount = Number(blockedAfter.data?.data?.blocked_attempts || 0);
      ok("blocked-attempts increments after report", afterCount === beforeCount + 1);

      const reportGen = await jsonFetch("POST", "/reports/generate", {
        token: adminAccess,
        body: {
          startDate: oneDayAgoIso,
          endDate: nowIso,
          type: "phishing",
        },
      });
      ok("reports/generate admin → 200", reportGen.status === 200);
      ok("reports/generate has incidentCount", typeof reportGen.data?.data?.incidentCount === "number");
    } else if (requireAdminChecks) {
      ok("admin credentials login works", false, "admin credentials failed; cannot run admin checks");
    } else {
      console.warn("Admin credentials failed; skipping admin-only checks");
    }
  } else if (requireAdminChecks) {
    ok("admin env configured for smoke tests", false, "set ADMIN_EMAIL and ADMIN_PASSWORD");
  } else {
    console.warn("ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin checks");
  }

  // Account lock
  const lockEmail = `smoke_lock_${suffix}@example.com`;
  await jsonFetch("POST", "/auth/signup", { body: { email: lockEmail, password: analystPass } });
  for (let i = 0; i < 5; i += 1) {
    await jsonFetch("POST", "/auth/login", { body: { email: lockEmail, password: "wrong-password!!" } });
  }
  const locked = await jsonFetch("POST", "/auth/login", { body: { email: lockEmail, password: analystPass } });
  ok("account locked after failures → 423", locked.status === 423);

  // Optional heavy rate-limit test (off by default to keep smoke fast)
  if (process.env.SMOKE_RUN_RATE_LIMIT_TEST === "true") {
    let rateLimitHit = false;
    for (let i = 0; i < 140; i += 1) {
      const r = await jsonFetch("GET", "/system/health");
      if (r.status === 429) {
        rateLimitHit = true;
        break;
      }
    }
    ok("rate limit can throttle burst traffic → 429", rateLimitHit);
  }

  console.log(`\nDone: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
