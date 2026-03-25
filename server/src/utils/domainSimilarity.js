const levenshteinDistance = (a, b) => {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[a.length][b.length];
};

export const findClosestTrustedDomain = (hostname) => {
  const trustedDomains = ["paypal.com", "google.com", "microsoft.com", "amazon.com", "apple.com", "bankofamerica.com"];
  let closest = null;
  let bestSimilarity = 0;

  for (const trusted of trustedDomains) {
    const maxLen = Math.max(hostname.length, trusted.length);
    const distance = levenshteinDistance(hostname, trusted);
    const similarity = Number((((maxLen - distance) / maxLen) * 100).toFixed(2));

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      closest = trusted;
    }
  }

  return { closestDomain: closest, similarity: bestSimilarity };
};
