import https from "https";

const DEV_SKIP_TLDS = [".example", ".test", ".invalid", ".localhost"];
const DEFAULT_SSL_TIMEOUT_MS = Number(process.env.SSL_CHECK_TIMEOUT_MS || 5000);
const MAX_REDIRECTS = Number(process.env.SSL_MAX_REDIRECTS || 5);
const isPrivateIpv4 = (host) =>
  /^10\./.test(host) ||
  /^127\./.test(host) ||
  /^192\.168\./.test(host) ||
  /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
const isInternalHost = (host) =>
  host === "localhost" || host === "127.0.0.1" || host === "::1" || isPrivateIpv4(host);

const requestTlsMetadata = (urlObj) =>
  new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: "https:",
        hostname: urlObj.hostname,
        port: urlObj.port ? Number(urlObj.port) : 443,
        path: `${urlObj.pathname}${urlObj.search}`,
        method: "GET",
        servername: urlObj.hostname,
        rejectUnauthorized: false,
        timeout: DEFAULT_SSL_TIMEOUT_MS,
      },
      (res) => {
        const certificate = res.socket?.getPeerCertificate?.() || null;
        const authorized = Boolean(res.socket?.authorized);
        const authorizationError = res.socket?.authorizationError || null;
        const statusCode = Number(res.statusCode || 0);
        const location = res.headers?.location || null;
        res.resume();
        resolve({ certificate, authorized, authorizationError, statusCode, location });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("SSL validation timed out"));
    });
    req.on("error", reject);
    req.end();
  });

const resolveTlsWithRedirects = async (startUrl) => {
  const redirects = [];
  let current = new URL(startUrl);

  for (let i = 0; i <= MAX_REDIRECTS; i += 1) {
    if (current.protocol !== "https:") {
      return { current, redirects, certificate: null, authorized: false, authorizationError: "redirected to non-https" };
    }
    const probe = await requestTlsMetadata(current);
    if (probe.statusCode >= 300 && probe.statusCode < 400 && probe.location) {
      const next = new URL(probe.location, current);
      redirects.push({ from: current.toString(), to: next.toString(), statusCode: probe.statusCode });
      current = next;
      continue;
    }
    return {
      current,
      redirects,
      certificate: probe.certificate,
      authorized: probe.authorized,
      authorizationError: probe.authorizationError,
    };
  }

  throw new Error("Too many redirects during SSL validation");
};

export const validateSSLCertificate = async (rawUrl) => {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") {
      return {
        valid: false,
        reasons: ["URL is not using HTTPS"],
        metadata: {
          protocol: parsed.protocol,
        },
      };
    }

    const shouldSkipDevCheck = process.env.NODE_ENV !== "production" && process.env.SSL_SKIP_DEV_CHECK === "true";
    const isLikelyTestDomain = DEV_SKIP_TLDS.some((tld) => parsed.hostname.endsWith(tld));
    if (shouldSkipDevCheck && isLikelyTestDomain) {
      return {
        valid: true,
        reasons: ["SSL validation skipped for development test domain"],
        metadata: {
          skipped: true,
          hostname: parsed.hostname,
        },
      };
    }

    const tlsResult = await resolveTlsWithRedirects(parsed.toString());
    const finalHost = tlsResult.current.hostname;

    if (isInternalHost(finalHost)) {
      return {
        valid: true,
        reasons: ["SSL validation skipped for internal/private host"],
        metadata: {
          skipped: true,
          hostname: finalHost,
          redirects: tlsResult.redirects,
        },
      };
    }

    const certificate = tlsResult.certificate;

    if (!certificate || Object.keys(certificate).length === 0) {
      return {
        valid: false,
        reasons: ["SSL certificate is missing or unavailable"],
        metadata: {},
      };
    }

    const validTo = certificate.valid_to ? new Date(certificate.valid_to) : null;
    const validFrom = certificate.valid_from ? new Date(certificate.valid_from) : null;
    const now = new Date();
    const reasons = [];

    if (tlsResult.current.protocol !== "https:") {
      reasons.push("URL redirects to a non-HTTPS endpoint");
    }
    if (!tlsResult.authorized) {
      reasons.push(`SSL trust validation failed${tlsResult.authorizationError ? ` (${tlsResult.authorizationError})` : ""}`);
    }
    if (!validFrom || Number.isNaN(validFrom.getTime())) {
      reasons.push("SSL certificate start date is not readable");
    } else if (validFrom > now) {
      reasons.push("SSL certificate is not valid yet");
    }
    if (!validTo || Number.isNaN(validTo.getTime())) {
      reasons.push("SSL certificate validity period is not readable");
    } else if (validTo < now) {
      reasons.push("SSL certificate is expired");
    }

    return {
      valid: reasons.length === 0,
      reasons,
      metadata: {
        issuer: certificate.issuer?.O || "unknown",
        validFrom: validFrom ? validFrom.toISOString() : null,
        validTo: validTo ? validTo.toISOString() : null,
        subject: certificate.subject?.CN || tlsResult.current.hostname,
        authorized: tlsResult.authorized,
        authorizationError: tlsResult.authorizationError || null,
        redirects: tlsResult.redirects,
        finalUrl: tlsResult.current.toString(),
      },
    };
  } catch (error) {
    return {
      valid: false,
      reasons: ["SSL validation failed"],
      metadata: {
        error: error.message,
      },
    };
  }
};
