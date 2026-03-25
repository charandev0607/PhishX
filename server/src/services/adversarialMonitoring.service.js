import crypto from "crypto";
import { logger } from "../utils/logger.js";

const WINDOW_MS = 60_000;
const MAX_REQS_PER_WINDOW = 120;
const MAX_SAME_INPUT_PER_WINDOW = 25;

const state = {
  byIp: new Map(), // ip -> { resetAt, count, byHash: Map(hash->count) }
};

const stableHash = (s) => crypto.createHash("sha256").update(String(s || ""), "utf8").digest("hex").slice(0, 16);

const getBucket = (ip) => {
  const now = Date.now();
  const existing = state.byIp.get(ip);
  if (existing && existing.resetAt > now) return existing;
  const bucket = { resetAt: now + WINDOW_MS, count: 0, byHash: new Map() };
  state.byIp.set(ip, bucket);
  return bucket;
};

export const observeInput = ({ ip = "unknown", type = "url", rawInput = "" } = {}) => {
  const bucket = getBucket(ip);
  bucket.count += 1;

  const h = stableHash(`${type}:${rawInput}`);
  bucket.byHash.set(h, (bucket.byHash.get(h) || 0) + 1);

  if (bucket.count > MAX_REQS_PER_WINDOW) {
    logger.warn("Potential adversarial probing: high request rate", { ip, type, count: bucket.count });
  }
  if ((bucket.byHash.get(h) || 0) > MAX_SAME_INPUT_PER_WINDOW) {
    logger.warn("Potential adversarial probing: repeated identical input", { ip, type, repeats: bucket.byHash.get(h) });
  }
};

