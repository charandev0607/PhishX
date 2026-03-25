const OBFUSCATION_PATTERNS = [
  /eval\s*\(/i,
  /atob\s*\(/i,
  /fromCharCode\s*\(/i,
  /unescape\s*\(/i,
  /document\.write\s*\(/i,
];

const IFRAME_PATTERN = /<iframe[^>]*>/i;
const PASSWORD_FIELD_PATTERN = /<input[^>]*type=["']?password["']?[^>]*>/i;
const FORM_PATTERN = /<form[^>]*>/i;
const EXTERNAL_POST_PATTERN = /<form[^>]*action=["']https?:\/\/(?![^"']*(paypal\.com|google\.com|microsoft\.com|amazon\.com|apple\.com))/i;

export const detectCredentialHarvestingSignals = ({ pageHtml = "", scriptContent = "" } = {}) => {
  const reasons = [];
  let scoreDelta = 0;

  if (!pageHtml && !scriptContent) {
    return { scoreDelta, reasons };
  }

  if (PASSWORD_FIELD_PATTERN.test(pageHtml) && FORM_PATTERN.test(pageHtml)) {
    scoreDelta += 20;
    reasons.push("Detected login form with password field");
  }

  if (IFRAME_PATTERN.test(pageHtml)) {
    scoreDelta += 10;
    reasons.push("Detected iframe usage often seen in credential harvesting flows");
  }

  if (EXTERNAL_POST_PATTERN.test(pageHtml)) {
    scoreDelta += 20;
    reasons.push("Form posts credentials to an untrusted external destination");
  }

  const mergedScript = `${pageHtml}\n${scriptContent}`;
  for (const pattern of OBFUSCATION_PATTERNS) {
    if (pattern.test(mergedScript)) {
      scoreDelta += 7;
      reasons.push("Detected obfuscated JavaScript pattern");
      break;
    }
  }

  return {
    scoreDelta: Math.min(scoreDelta, 45),
    reasons,
  };
};
