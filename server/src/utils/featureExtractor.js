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

export const extractUrlFeatures = (rawUrl) => {
  const parsed = new URL(rawUrl);
  const hostnameParts = parsed.hostname.split(".");
  const subdomainCount = Math.max(0, hostnameParts.length - 2);
  const specialChars = (rawUrl.match(/[^a-zA-Z0-9/:.?=&_-]/g) || []).length;

  return {
    length: rawUrl.length,
    specialChars,
    subdomainCount,
    entropy: calculateEntropy(parsed.hostname + parsed.pathname + parsed.search),
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    path: parsed.pathname,
  };
};
