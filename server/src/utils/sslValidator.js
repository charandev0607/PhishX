import tls from "tls";

const DEV_SKIP_TLDS = [".example", ".test", ".invalid", ".localhost"];

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

    const certificate = await new Promise((resolve, reject) => {
      const socket = tls.connect(
        {
          host: parsed.hostname,
          port: parsed.port ? Number(parsed.port) : 443,
          servername: parsed.hostname,
          minVersion: "TLSv1.2",
          timeout: Number(process.env.SSL_CHECK_TIMEOUT_MS || 2000),
        },
        () => {
          const cert = socket.getPeerCertificate();
          socket.end();
          resolve(cert);
        }
      );

      socket.on("error", (error) => {
        socket.destroy();
        reject(error);
      });

      socket.on("timeout", () => {
        socket.destroy();
        reject(new Error("SSL validation timed out"));
      });
    });

    if (!certificate || Object.keys(certificate).length === 0) {
      return {
        valid: false,
        reasons: ["SSL certificate is missing or unavailable"],
        metadata: {},
      };
    }

    const validTo = certificate.valid_to ? new Date(certificate.valid_to) : null;
    const now = new Date();
    const reasons = [];

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
        validTo: validTo ? validTo.toISOString() : null,
        subject: certificate.subject?.CN || parsed.hostname,
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
