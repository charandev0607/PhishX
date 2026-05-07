const calculateEntropy = (text) => {
  if (!text || !text.length) return 0;

  const charFrequency = {};
  for (const char of text) {
    charFrequency[char] = (charFrequency[char] || 0) + 1;
  }

  let entropy = 0;
  for (const frequency of Object.values(charFrequency)) {
    const probability = frequency / text.length;
    entropy -= probability * Math.log2(probability);
  }

  return Number(entropy.toFixed(4));
};

const SHORTENER_HOSTS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "rb.gy",
  "cutt.ly",
  "rebrand.ly",
  "shorturl.at",
  "lnkd.in",
]);

const SUSPICIOUS_TLDS = new Set([
  "xyz",
  "top",
  "ru",
  "click",
  "gq",
  "tk",
  "ml",
  "work",
  "support",
  "zip",
  "country",
  "kim",
  "rest",
  "fit",
  "cn",
  "pw",
]);

const IPV4_HOST_PATTERN =
  /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

const countKeywordHits = (text, keywords) =>
  keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);

export const extractUrlFeatures = (rawUrl) => {
  const parsed = new URL(rawUrl);
  const hostnameParts = parsed.hostname.split(".");
  const subdomainCount = Math.max(0, hostnameParts.length - 2);
  const specialChars = (rawUrl.match(/[^a-zA-Z0-9/:.?=&_-]/g) || []).length;
  const lowerHost = parsed.hostname.toLowerCase();
  const lowerPath = `${parsed.pathname}${parsed.search}`.toLowerCase();
  const hostWithoutDots = lowerHost.replace(/\./g, "");
  const tld = hostnameParts.at(-1)?.toLowerCase() || "";
  const atSymbolCount = (rawUrl.match(/@/g) || []).length;
  const fakeHttpsWordHits =
    countKeywordHits(hostWithoutDots, ["https", "secure", "ssl", "login", "verify"]) +
    countKeywordHits(lowerPath, ["https-", "https_", "secure-", "secure_", "ssl-", "ssl_"]);

  return {
    length: rawUrl.length,
    specialChars,
    subdomainCount,
    entropy: calculateEntropy(parsed.hostname + parsed.pathname + parsed.search),
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    path: parsed.pathname,
    tld,
    atSymbolCount,
    isIpHost: IPV4_HOST_PATTERN.test(parsed.hostname),
    isShortener: SHORTENER_HOSTS.has(lowerHost),
    hasFakeHttpsWords: fakeHttpsWordHits > 0,
    fakeHttpsWordHits,
    hasSuspiciousTld: SUSPICIOUS_TLDS.has(tld),
  };
};
